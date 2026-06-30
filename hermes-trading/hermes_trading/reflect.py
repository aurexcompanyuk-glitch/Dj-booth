from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
import os

import yaml

STATE_DIR = Path(os.getenv("STATE_DIR", "/app/state"))
if not STATE_DIR.exists():
    STATE_DIR = Path.home() / "hermes-trading" / "state"

STRATEGY_FILE = STATE_DIR / "strategy.yaml"
GOAL_FILE = STATE_DIR / "goal.yaml"
TRADES_FILE = STATE_DIR / "trades.jsonl"
HYPOTHESES_FILE = STATE_DIR / "hypotheses.jsonl"
HISTORY_DIR = STATE_DIR / "history"


def _load(path: Path) -> dict:
    with open(path) as f:
        return yaml.safe_load(f) or {}


def _load_trades(n: int = 25) -> list[dict]:
    if not TRADES_FILE.exists():
        return []
    lines = TRADES_FILE.read_text().strip().splitlines()
    return [json.loads(l) for l in lines[-n:] if l.strip()]


def _version_int(strategy: dict) -> int:
    try:
        return int(str(strategy.get("version", "01")).lstrip("0") or "1")
    except ValueError:
        return 1


def _save_history(strategy: dict) -> None:
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    v = _version_int(strategy)
    hist_path = HISTORY_DIR / f"v{v:04d}.yaml"
    with open(hist_path, "w") as f:
        yaml.dump(strategy, f, default_flow_style=False)


def _bump_version(strategy: dict) -> dict:
    v = _version_int(strategy)
    strategy["version"] = f"{v + 1:02d}"
    return strategy


def _append_hypothesis(hyp: dict) -> None:
    with open(HYPOTHESES_FILE, "a") as f:
        f.write(json.dumps(hyp) + "\n")


def _analyse_trades(trades: list[dict]) -> dict:
    if not trades:
        return {}
    wins = [t for t in trades if t.get("pnl_pct", 0) > 0]
    losses = [t for t in trades if t.get("pnl_pct", 0) <= 0]
    avg_win = sum(t["pnl_pct"] for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t["pnl_pct"] for t in losses) / len(losses) if losses else 0
    total_return = sum(t.get("pnl_pct", 0) for t in trades)
    win_rate = len(wins) / len(trades) if trades else 0
    exit_reasons = {}
    for t in trades:
        r = t.get("exit_reason", "unknown")
        exit_reasons[r] = exit_reasons.get(r, 0) + 1
    most_common_exit = max(exit_reasons, key=exit_reasons.get) if exit_reasons else "unknown"
    regimes = [t.get("regime", "unknown") for t in trades]
    dominant_regime = max(set(regimes), key=regimes.count) if regimes else "unknown"
    return {
        "trade_count": len(trades),
        "win_rate": round(win_rate, 3),
        "avg_win_pct": round(avg_win, 3),
        "avg_loss_pct": round(avg_loss, 3),
        "total_return_pct": round(total_return, 3),
        "most_common_exit": most_common_exit,
        "dominant_regime": dominant_regime,
        "stop_loss_hits": exit_reasons.get("stop_loss", 0),
        "take_profit_hits": exit_reasons.get("take_profit", 0),
    }


def reflect_fallback() -> None:
    """
    Deterministic fallback reflection — no LLM needed.
    Changes exactly ONE variable based on simple rules.
    """
    strategy = _load(STRATEGY_FILE)
    goal = _load(GOAL_FILE)
    trades = _load_trades(25)
    analysis = _analyse_trades(trades)

    target_daily = goal.get("target_return_daily", 0.50)
    max_dd = goal.get("max_drawdown", 0.15)

    total_return = analysis.get("total_return_pct", 0) / 100.0
    win_rate = analysis.get("win_rate", 0)
    stop_loss_hits = analysis.get("stop_loss_hits", 0)
    trade_count = analysis.get("trade_count", 0)

    variable_changed = None
    old_value = None
    new_value = None
    reasoning = ""

    if trade_count == 0:
        reasoning = "No trades yet — loosening entry threshold to generate data."
        old_value = strategy["entry"]["confidence_threshold"]
        strategy["entry"]["confidence_threshold"] = max(0.40, old_value - 0.05)
        new_value = strategy["entry"]["confidence_threshold"]
        variable_changed = "entry.confidence_threshold"

    elif stop_loss_hits > trade_count * 0.6:
        # Too many stop-outs — tighten stop_loss or loosen SL distance
        reasoning = f"Stop loss hit {stop_loss_hits}/{trade_count} trades — tightening stop_loss_pct."
        old_value = strategy["stop_loss_pct"]
        strategy["stop_loss_pct"] = round(min(5.0, old_value + 0.5), 2)
        new_value = strategy["stop_loss_pct"]
        variable_changed = "stop_loss_pct"

    elif total_return < target_daily * 0.5:
        # Return well below target — loosen entry threshold
        reasoning = f"Return {total_return:.1%} << target {target_daily:.0%} — loosening confidence_threshold."
        old_value = strategy["entry"]["confidence_threshold"]
        strategy["entry"]["confidence_threshold"] = max(0.40, round(old_value - 0.05, 2))
        new_value = strategy["entry"]["confidence_threshold"]
        variable_changed = "entry.confidence_threshold"

    elif win_rate > 0.65 and total_return < target_daily:
        # Winning often but not enough per win — raise take_profit
        reasoning = f"Win rate {win_rate:.0%} is good but return low — raising take_profit_pct."
        old_value = strategy["take_profit_pct"]
        strategy["take_profit_pct"] = round(min(15.0, old_value + 1.0), 2)
        new_value = strategy["take_profit_pct"]
        variable_changed = "take_profit_pct"

    elif win_rate < 0.40:
        # Poor win rate — tighten entry quality
        reasoning = f"Win rate {win_rate:.0%} too low — raising confidence_threshold."
        old_value = strategy["entry"]["confidence_threshold"]
        strategy["entry"]["confidence_threshold"] = round(min(0.85, old_value + 0.05), 2)
        new_value = strategy["entry"]["confidence_threshold"]
        variable_changed = "entry.confidence_threshold"

    else:
        # Default: try raising leverage slightly for more return
        reasoning = "Strategy performing OK — incrementally raising leverage for more return."
        old_value = strategy["leverage"]
        strategy["leverage"] = min(20, old_value + 1)
        new_value = strategy["leverage"]
        variable_changed = "leverage"

    _save_history(strategy)
    _bump_version(strategy)
    strategy["_last_reflected"] = datetime.now(timezone.utc).isoformat()

    with open(STRATEGY_FILE, "w") as f:
        yaml.dump(strategy, f, default_flow_style=False)

    hyp = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mode": "fallback",
        "variable_changed": variable_changed,
        "old_value": old_value,
        "new_value": new_value,
        "reasoning": reasoning,
        "analysis": analysis,
        "strategy_version": strategy["version"],
    }
    _append_hypothesis(hyp)

    print(f"[reflect/fallback] {variable_changed}: {old_value} → {new_value}")
    print(f"[reflect/fallback] Reasoning: {reasoning}")
    print(f"[reflect/fallback] Strategy now v{strategy['version']}")


def reflect_hermes() -> None:
    """
    Hermes-powered reflection — calls the `hermes` CLI as a subprocess.
    Parses its output to extract a hypothesis and applies it.
    """
    if not shutil.which("hermes"):
        print("[reflect/hermes] hermes not found — falling back to deterministic")
        reflect_fallback()
        return

    strategy = _load(STRATEGY_FILE)
    goal = _load(GOAL_FILE)
    trades = _load_trades(25)
    analysis = _analyse_trades(trades)

    prompt = f"""You are a self-improving trading agent. Analyse the following and propose ONE variable change.

GOAL:
{yaml.dump(goal)}

CURRENT STRATEGY (v{strategy.get('version', '01')}):
{yaml.dump(strategy)}

LAST {len(trades)} TRADES ANALYSIS:
{json.dumps(analysis, indent=2)}

RAW TRADES (last 5):
{json.dumps(trades[-5:], indent=2)}

Rules:
1. Change exactly ONE variable in the strategy.
2. State your hypothesis: IF I change X from A to B, THEN score will improve because...
3. Output ONLY valid YAML with these keys:
   variable: <dot.notation.path>
   old_value: <current value>
   new_value: <proposed value>
   reasoning: <one sentence>
   confidence: <0.0-1.0>

Output:"""

    try:
        result = subprocess.run(
            ["hermes", "--one-shot", "--no-stream"],
            input=prompt,
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = result.stdout.strip()

        # Parse YAML from hermes output
        hypothesis = yaml.safe_load(output)
        if not isinstance(hypothesis, dict) or "variable" not in hypothesis:
            raise ValueError(f"Could not parse hypothesis from hermes output: {output[:200]}")

        variable = hypothesis["variable"]
        old_value = hypothesis["old_value"]
        new_value = hypothesis["new_value"]
        reasoning = hypothesis.get("reasoning", "")

        # Apply the single variable change
        keys = variable.split(".")
        target = strategy
        for k in keys[:-1]:
            if k not in target:
                target[k] = {}
            target = target[k]
        target[keys[-1]] = new_value

        _save_history(strategy)
        _bump_version(strategy)
        strategy["_last_reflected"] = datetime.now(timezone.utc).isoformat()

        with open(STRATEGY_FILE, "w") as f:
            yaml.dump(strategy, f, default_flow_style=False)

        hyp = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mode": "hermes",
            "variable_changed": variable,
            "old_value": old_value,
            "new_value": new_value,
            "reasoning": reasoning,
            "confidence": hypothesis.get("confidence", 0.0),
            "analysis": analysis,
            "strategy_version": strategy["version"],
        }
        _append_hypothesis(hyp)

        print(f"[reflect/hermes] {variable}: {old_value} → {new_value}")
        print(f"[reflect/hermes] {reasoning}")
        print(f"[reflect/hermes] Strategy now v{strategy['version']}")

    except Exception as e:
        print(f"[reflect/hermes] Error: {e} — falling back to deterministic")
        reflect_fallback()


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--fallback", action="store_true")
    group.add_argument("--hermes", action="store_true")
    args = parser.parse_args()

    if args.fallback:
        reflect_fallback()
    else:
        reflect_hermes()


if __name__ == "__main__":
    main()
