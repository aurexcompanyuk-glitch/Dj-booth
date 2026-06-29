from __future__ import annotations

import asyncio
import json
import os
import subprocess
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml
from rich.console import Console
from rich.table import Table

from hermes_trading.adapters import price as price_adapter
from hermes_trading.adapters import onchain as onchain_adapter
from hermes_trading.adapters import news as news_adapter
from hermes_trading.adapters import macro as macro_adapter
from hermes_trading.score import mastery_check

console = Console()

STATE_DIR = Path(os.getenv("STATE_DIR", "/app/state"))
if not STATE_DIR.exists():
    STATE_DIR = Path.home() / "hermes-trading" / "state"

TRADES_FILE = STATE_DIR / "trades.jsonl"
HYPOTHESES_FILE = STATE_DIR / "hypotheses.jsonl"
HEARTBEAT_FILE = STATE_DIR / "heartbeat.json"
STRATEGY_FILE = STATE_DIR / "strategy.yaml"
GOAL_FILE = STATE_DIR / "goal.yaml"


def _load_yaml(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f) or {}


def _load_trades(n: int = 25) -> list[dict]:
    if not TRADES_FILE.exists():
        return []
    lines = TRADES_FILE.read_text().strip().splitlines()
    return [json.loads(l) for l in lines[-n:] if l.strip()]


def _append_trade(trade: dict) -> None:
    with open(TRADES_FILE, "a") as f:
        f.write(json.dumps(trade) + "\n")


def _write_heartbeat(data: dict) -> None:
    HEARTBEAT_FILE.write_text(json.dumps(data, indent=2))


def _count_since_last_reflection() -> int:
    trades = _load_trades(200)
    count = 0
    for t in reversed(trades):
        if t.get("reflected"):
            break
        count += 1
    return count


def _mark_reflected(n: int) -> None:
    """Mark last n trades as reflected."""
    if not TRADES_FILE.exists():
        return
    lines = TRADES_FILE.read_text().strip().splitlines()
    if not lines:
        return
    updated = []
    mark_idx = len(lines) - n
    for i, line in enumerate(lines):
        if i >= mark_idx:
            t = json.loads(line)
            t["reflected"] = True
            updated.append(json.dumps(t))
        else:
            updated.append(line)
    TRADES_FILE.write_text("\n".join(updated) + "\n")


def _load_cycle_scores() -> list[float]:
    if not HYPOTHESES_FILE.exists():
        return []
    lines = HYPOTHESES_FILE.read_text().strip().splitlines()
    scores = []
    for line in lines:
        try:
            h = json.loads(line)
            if "score_after" in h:
                scores.append(float(h["score_after"]))
        except Exception:
            pass
    return scores


class PaperPosition:
    def __init__(
        self,
        direction: str,
        entry_price: float,
        stop_loss_pct: float,
        take_profit_pct: float,
        leverage: int,
        position_size_r: float,
        capital: float,
    ):
        self.id = str(uuid.uuid4())[:8]
        self.direction = direction
        self.entry_price = entry_price
        self.stop_loss_pct = stop_loss_pct
        self.take_profit_pct = take_profit_pct
        self.leverage = leverage
        self.position_size_r = position_size_r
        self.notional = capital * position_size_r * leverage
        self.opened_at = datetime.now(timezone.utc).isoformat()
        self.trailing_stop_price: float | None = None

    def check_exit(
        self, current_price: float, trailing: bool = False, trailing_dist: float = 1.0
    ) -> tuple[bool, str]:
        if self.direction == "long":
            pnl_pct = (current_price - self.entry_price) / self.entry_price * 100
            if trailing and pnl_pct > 0:
                trigger = current_price * (1 - trailing_dist / 100)
                self.trailing_stop_price = max(
                    self.trailing_stop_price or 0, trigger
                )
                if current_price <= self.trailing_stop_price:
                    return True, "trailing_stop"
            if pnl_pct <= -self.stop_loss_pct:
                return True, "stop_loss"
            if pnl_pct >= self.take_profit_pct:
                return True, "take_profit"
        else:  # short
            pnl_pct = (self.entry_price - current_price) / self.entry_price * 100
            if pnl_pct <= -self.stop_loss_pct:
                return True, "stop_loss"
            if pnl_pct >= self.take_profit_pct:
                return True, "take_profit"
        return False, ""

    def pnl_pct(self, current_price: float) -> float:
        if self.direction == "long":
            return (current_price - self.entry_price) / self.entry_price * 100 * self.leverage
        return (self.entry_price - current_price) / self.entry_price * 100 * self.leverage


class TradingLoop:
    def __init__(self, goal: dict, asset: str, dry_run: bool = False):
        self.goal = goal
        self.asset = asset
        self.dry_run = dry_run
        self.capital = 1000.0  # virtual USD paper capital
        self.position: PaperPosition | None = None
        self.consecutive_failures = 0
        self.cooldown_bars_remaining = 0
        self.cycle_scores: list[float] = _load_cycle_scores()
        self.current_cadence: int = int(goal.get("reflection_every", 5))

    async def _fetch_all(self) -> dict[str, Any]:
        strategy = _load_yaml(STRATEGY_FILE)
        timeframe = strategy.get("entry", {}).get("timeframe", "5m")

        results = await asyncio.gather(
            price_adapter.fetch(self.asset, timeframe),
            onchain_adapter.fetch(),
            news_adapter.fetch(),
            macro_adapter.fetch(),
            return_exceptions=True,
        )

        combined: dict[str, Any] = {}
        labels = ["price", "onchain", "news", "macro"]
        failures = 0

        for label, result in zip(labels, results):
            if isinstance(result, Exception):
                console.print(f"[yellow]adapter/{label} failed: {result}[/yellow]")
                failures += 1
            else:
                if result.get("schema_version", 0) < 1:
                    raise price_adapter.SchemaError(f"adapter/{label} schema mismatch")
                combined.update({f"{label}.{k}": v for k, v in result.items()})
                combined[label] = result

        self.consecutive_failures = (
            self.consecutive_failures + failures if failures else 0
        )
        if self.consecutive_failures >= 5:
            raise RuntimeError("Circuit breaker: 5 consecutive adapter failures")

        return combined

    def _should_enter(self, data: dict, strategy: dict) -> tuple[bool, str]:
        """Evaluate entry conditions. Returns (should_enter, direction)."""
        if self.position is not None:
            return False, ""
        if self.cooldown_bars_remaining > 0:
            self.cooldown_bars_remaining -= 1
            return False, ""

        price_data = data.get("price", {})
        macro_data = data.get("macro", {})
        entry = strategy.get("entry", {})

        conf_threshold = float(entry.get("confidence_threshold", 0.60))
        direction_cfg = entry.get("direction", "both")
        regime_filter = entry.get("regime_filter", True)

        regime = price_data.get("regime", "chop")
        if regime_filter and regime == "chop":
            return False, ""

        conf_long = float(price_data.get("confidence_long", 0.0))
        conf_short = float(price_data.get("confidence_short", 0.0))

        # Macro overlay
        if macro_data.get("contrarian_long"):
            conf_long += 0.10
        if macro_data.get("contrarian_short"):
            conf_short += 0.10

        if direction_cfg in ("long", "both") and conf_long >= conf_threshold:
            return True, "long"
        if direction_cfg in ("short", "both") and conf_short >= conf_threshold:
            return True, "short"

        return False, ""

    def _open_position(self, direction: str, price: float, strategy: dict) -> None:
        self.position = PaperPosition(
            direction=direction,
            entry_price=price,
            stop_loss_pct=float(strategy.get("stop_loss_pct", 2.0)),
            take_profit_pct=float(strategy.get("take_profit_pct", 5.0)),
            leverage=int(strategy.get("leverage", 10)),
            position_size_r=float(strategy.get("position_size_r", 0.5)),
            capital=self.capital,
        )
        console.print(
            f"[green]PAPER OPEN {direction.upper()} @ ${price:,.2f} "
            f"| SL {self.position.stop_loss_pct}% TP {self.position.take_profit_pct}% "
            f"x{self.position.leverage}[/green]"
        )

    def _close_position(self, price: float, reason: str, data: dict, strategy: dict) -> dict:
        pos = self.position
        pnl = pos.pnl_pct(price)
        pnl_dollar = (pos.notional * pnl / 100)
        self.capital += pnl_dollar
        self.position = None

        if pnl < 0:
            self.cooldown_bars_remaining = int(strategy.get("cooldown_bars", 3))

        trade = {
            "id": pos.id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "asset": self.asset,
            "direction": pos.direction,
            "entry_price": pos.entry_price,
            "exit_price": price,
            "pnl_pct": round(pnl, 4),
            "pnl_dollar": round(pnl_dollar, 2),
            "capital_after": round(self.capital, 2),
            "exit_reason": reason,
            "leverage": pos.leverage,
            "regime": data.get("price", {}).get("regime", "unknown"),
            "rsi_at_entry": data.get("price", {}).get("rsi", 0),
            "strategy_version": strategy.get("version", "01"),
            "reflected": False,
        }

        _append_trade(trade)
        colour = "green" if pnl > 0 else "red"
        console.print(
            f"[{colour}]PAPER CLOSE {pos.direction.upper()} @ ${price:,.2f} "
            f"| PnL: {pnl:+.2f}% (${pnl_dollar:+.2f}) | {reason}[/{colour}]"
        )
        return trade

    def _trigger_reflection(self) -> None:
        console.print("[bold cyan]Triggering reflection cycle...[/bold cyan]")
        mode = "--hermes" if self._hermes_available() else "--fallback"
        try:
            result = subprocess.run(
                ["python", "-m", "hermes_trading.reflect", mode],
                capture_output=True,
                text=True,
                timeout=120,
            )
            if result.returncode == 0:
                console.print(f"[cyan]Reflection done ({mode})[/cyan]")
                _mark_reflected(self.current_cadence)
                self.cycle_scores = _load_cycle_scores()
                is_master, new_cadence = mastery_check(
                    self.cycle_scores, self.goal, self.current_cadence
                )
                if is_master and new_cadence != self.current_cadence:
                    console.print(
                        f"[bold green]MASTERY DETECTED — cadence widening "
                        f"{self.current_cadence} → {new_cadence}[/bold green]"
                    )
                    self.current_cadence = new_cadence
            else:
                console.print(f"[red]Reflection failed: {result.stderr[:200]}[/red]")
        except Exception as e:
            console.print(f"[red]Reflection error: {e}[/red]")

    def _hermes_available(self) -> bool:
        import shutil
        return shutil.which("hermes") is not None

    async def _one_cycle(self) -> None:
        strategy = _load_yaml(STRATEGY_FILE)
        data = await self._fetch_all()
        price = data.get("price.price", 0.0)

        if price <= 0:
            console.print("[yellow]Price fetch returned 0 — skipping cycle[/yellow]")
            return

        # Check exit for open position
        if self.position is not None:
            trailing = strategy.get("trailing_stop", False)
            trailing_dist = float(strategy.get("trailing_stop_distance", 1.0))
            should_exit, reason = self.position.check_exit(price, trailing, trailing_dist)
            if should_exit:
                self._close_position(price, reason, data, strategy)
                # Check reflection trigger
                since = _count_since_last_reflection()
                if since >= self.current_cadence:
                    self._trigger_reflection()

        # Check entry for new position
        if self.position is None:
            should_enter, direction = self._should_enter(data, strategy)
            if should_enter:
                self._open_position(direction, price, strategy)

        # Heartbeat
        _write_heartbeat(
            {
                "ts": datetime.now(timezone.utc).isoformat(),
                "price": price,
                "capital": round(self.capital, 2),
                "position": self.position.direction if self.position else None,
                "strategy_version": strategy.get("version", "01"),
                "cadence": self.current_cadence,
                "rsi": data.get("price.rsi", 0),
                "regime": data.get("price.regime", "unknown"),
            }
        )

    async def run(self) -> None:
        console.print("[bold]Booting hermes-trading worker[/bold]")
        console.print(f"  Asset:    {self.asset}")
        console.print(f"  Mode:     {os.getenv('HERMES_TRADING_MODE', 'paper')}")
        console.print(f"  Capital:  ${self.capital:,.2f} (virtual)")
        console.print(f"  Cadence:  {self.current_cadence} trades per reflection")

        interval = 60  # seconds between cycles

        while True:
            try:
                await self._one_cycle()
            except RuntimeError as e:
                console.print(f"[bold red]FATAL: {e}[/bold red]")
                raise
            except Exception as e:
                console.print(f"[red]Cycle error: {e}[/red]")

            if self.dry_run:
                console.print("[dim]Dry-run complete[/dim]")
                break

            await asyncio.sleep(interval)
