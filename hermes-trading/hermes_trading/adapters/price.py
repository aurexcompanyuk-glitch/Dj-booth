import os
import asyncio
import numpy as np
import pandas as pd
import ccxt.async_support as ccxt

SCHEMA_VERSION = 2


class SchemaError(Exception):
    pass


def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(com=period - 1, min_periods=period).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def _macd(series: pd.Series, fast=12, slow=26, signal=9):
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def _bollinger(series: pd.Series, period: int = 20, std: float = 2.0):
    middle = series.rolling(period).mean()
    sigma = series.rolling(period).std()
    return middle + std * sigma, middle, middle - std * sigma


def _atr(df: pd.DataFrame, period: int = 14) -> pd.Series:
    hl = df['high'] - df['low']
    hc = (df['high'] - df['close'].shift()).abs()
    lc = (df['low'] - df['close'].shift()).abs()
    tr = pd.concat([hl, hc, lc], axis=1).max(axis=1)
    return tr.ewm(com=period - 1, min_periods=period).mean()


def _regime(df: pd.DataFrame) -> str:
    """Simple 3-state market regime: bull / bear / chop."""
    if len(df) < 20:
        return "unknown"
    ret_20 = (df['close'].iloc[-1] - df['close'].iloc[-20]) / df['close'].iloc[-20]
    volatility = df['close'].pct_change().std()
    if volatility > 0.015:
        return "volatile"
    if ret_20 > 0.02:
        return "bull"
    if ret_20 < -0.02:
        return "bear"
    return "chop"


def _support_resistance(df: pd.DataFrame, window: int = 20):
    """Identify nearest support and resistance levels."""
    highs = df['high'].rolling(window).max()
    lows = df['low'].rolling(window).min()
    resistance = highs.iloc[-1]
    support = lows.iloc[-1]
    return float(support), float(resistance)


def _confidence(rsi: float, macd_hist: float, volume_spike: float,
                bb_position: float, regime: str, direction: str) -> float:
    """Composite confidence score 0–1 for an entry signal."""
    score = 0.0

    if direction == "long":
        if rsi < 35:
            score += 0.25
        elif rsi < 45:
            score += 0.10
        if macd_hist > 0:
            score += 0.25
        if volume_spike > 1.5:
            score += 0.20
        if bb_position < 0.2:
            score += 0.20
        if regime == "bull":
            score += 0.10
        elif regime == "chop":
            score -= 0.10

    elif direction == "short":
        if rsi > 65:
            score += 0.25
        elif rsi > 55:
            score += 0.10
        if macd_hist < 0:
            score += 0.25
        if volume_spike > 1.5:
            score += 0.20
        if bb_position > 0.8:
            score += 0.20
        if regime == "bear":
            score += 0.10
        elif regime == "chop":
            score -= 0.10

    return max(0.0, min(1.0, score))


async def fetch(asset: str = "BTC/USDT", timeframe: str = "5m") -> dict:
    api_key = os.getenv("EXCHANGE_API_KEY", "")
    api_secret = os.getenv("EXCHANGE_API_SECRET", "")

    exchange_config = {"enableRateLimit": True}
    if api_key and api_secret:
        exchange_config["apiKey"] = api_key
        exchange_config["secret"] = api_secret

    exchange = ccxt.binance(exchange_config)
    try:
        ohlcv = await exchange.fetch_ohlcv(asset, timeframe, limit=200)
        if not ohlcv or len(ohlcv) < 50:
            raise SchemaError(f"Insufficient OHLCV data: got {len(ohlcv)} candles")

        df = pd.DataFrame(ohlcv, columns=["timestamp", "open", "high", "low", "close", "volume"])
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")

        rsi = _rsi(df["close"])
        macd_line, signal_line, histogram = _macd(df["close"])
        bb_upper, bb_middle, bb_lower = _bollinger(df["close"])
        atr = _atr(df)
        volume_ma = df["volume"].rolling(20).mean()
        volume_spike = float(df["volume"].iloc[-1] / volume_ma.iloc[-1]) if volume_ma.iloc[-1] > 0 else 1.0
        regime = _regime(df)
        support, resistance = _support_resistance(df)

        price = float(df["close"].iloc[-1])
        bb_range = float(bb_upper.iloc[-1] - bb_lower.iloc[-1])
        bb_position = float((price - bb_lower.iloc[-1]) / bb_range) if bb_range > 0 else 0.5

        rsi_val = float(rsi.iloc[-1]) if not np.isnan(rsi.iloc[-1]) else 50.0
        macd_hist_val = float(histogram.iloc[-1]) if not np.isnan(histogram.iloc[-1]) else 0.0
        macd_cross = (
            histogram.iloc[-1] > 0 and histogram.iloc[-2] <= 0
        ) if len(histogram) >= 2 else False
        macd_cross_bear = (
            histogram.iloc[-1] < 0 and histogram.iloc[-2] >= 0
        ) if len(histogram) >= 2 else False

        conf_long = _confidence(rsi_val, macd_hist_val, volume_spike, bb_position, regime, "long")
        conf_short = _confidence(rsi_val, macd_hist_val, volume_spike, bb_position, regime, "short")

        result = {
            "schema_version": SCHEMA_VERSION,
            "asset": asset,
            "timeframe": timeframe,
            "price": price,
            "open": float(df["open"].iloc[-1]),
            "high": float(df["high"].iloc[-1]),
            "low": float(df["low"].iloc[-1]),
            "volume": float(df["volume"].iloc[-1]),
            "volume_ma20": float(volume_ma.iloc[-1]),
            "volume_spike": volume_spike,
            "rsi": rsi_val,
            "macd": float(macd_line.iloc[-1]) if not np.isnan(macd_line.iloc[-1]) else 0.0,
            "macd_signal": float(signal_line.iloc[-1]) if not np.isnan(signal_line.iloc[-1]) else 0.0,
            "macd_hist": macd_hist_val,
            "macd_cross_bull": bool(macd_cross),
            "macd_cross_bear": bool(macd_cross_bear),
            "bb_upper": float(bb_upper.iloc[-1]),
            "bb_middle": float(bb_middle.iloc[-1]),
            "bb_lower": float(bb_lower.iloc[-1]),
            "bb_position": bb_position,
            "atr": float(atr.iloc[-1]) if not np.isnan(atr.iloc[-1]) else 0.0,
            "atr_pct": float(atr.iloc[-1] / price * 100) if price > 0 else 0.0,
            "regime": regime,
            "support": support,
            "resistance": resistance,
            "confidence_long": conf_long,
            "confidence_short": conf_short,
            "price_change_1h": float(
                (df["close"].iloc[-1] - df["close"].iloc[-12]) / df["close"].iloc[-12] * 100
            ) if len(df) >= 12 else 0.0,
            "price_change_24h": float(
                (df["close"].iloc[-1] - df["close"].iloc[-288]) / df["close"].iloc[-288] * 100
            ) if len(df) >= 288 else 0.0,
        }

        return result

    finally:
        await exchange.close()
