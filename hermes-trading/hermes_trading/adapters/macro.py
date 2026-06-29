import httpx

SCHEMA_VERSION = 1
_FEAR_GREED_URL = "https://api.alternative.me/fng/?limit=2"


class SchemaError(Exception):
    pass


async def fetch() -> dict:
    """Fetch Crypto Fear & Greed Index from alternative.me (free, no key)."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(_FEAR_GREED_URL)
        resp.raise_for_status()
        data = resp.json()

    entries = data.get("data", [])
    if not entries:
        raise SchemaError("Fear & Greed API returned empty data")

    current = entries[0]
    previous = entries[1] if len(entries) > 1 else entries[0]

    value = int(current.get("value", 50))
    prev_value = int(previous.get("value", 50))
    label = current.get("value_classification", "Neutral")

    # Regime signal
    if value >= 75:
        regime_signal = "extreme_greed"
    elif value >= 55:
        regime_signal = "greed"
    elif value <= 25:
        regime_signal = "extreme_fear"
    elif value <= 45:
        regime_signal = "fear"
    else:
        regime_signal = "neutral"

    return {
        "schema_version": SCHEMA_VERSION,
        "fear_greed_index": value,
        "fear_greed_label": label,
        "fear_greed_prev": prev_value,
        "fear_greed_delta": value - prev_value,
        "regime_signal": regime_signal,
        "contrarian_long": value <= 25,    # extreme fear = contrarian buy
        "contrarian_short": value >= 75,   # extreme greed = contrarian sell
    }
