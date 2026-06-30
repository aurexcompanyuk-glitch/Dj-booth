from __future__ import annotations
import numpy as np
from typing import Any


def score(trades: list[dict[str, Any]], goal: dict[str, Any]) -> float:
    """
    Score a list of closed trades against goal.yaml targets.
    Returns float in [-1.0, +1.0].
    """
    if not trades:
        return 0.0

    pnl_pcts = [float(t.get("pnl_pct", 0.0)) for t in trades]
    dates = list({t["timestamp"][:10] for t in trades if "timestamp" in t})
    days = max(len(dates), 1)

    # Daily return: sum of PnL / number of trading days in sample
    daily_return = sum(pnl_pcts) / days / 100.0  # as decimal

    # Max drawdown from cumulative curve
    cumulative = np.cumprod([1.0 + p / 100.0 for p in pnl_pcts])
    running_max = np.maximum.accumulate(cumulative)
    drawdowns = (running_max - cumulative) / np.where(running_max == 0, 1, running_max)
    max_dd = float(np.max(drawdowns))

    # Sharpe (simplified daily, not annualised — more meaningful for short samples)
    arr = np.array(pnl_pcts)
    sharpe = float(np.mean(arr) / np.std(arr)) if np.std(arr) > 0 else 0.0

    # Targets from goal
    target_daily: float = goal.get("target_return_daily", 0.50)
    max_drawdown: float = goal.get("max_drawdown", 0.15)
    min_sharpe: float = goal.get("min_sharpe", 1.2)
    failure_floor: float = goal.get("failure_below", -0.04)

    # Component scores [0, 1]
    return_score = min(daily_return / target_daily, 1.0) if target_daily > 0 else 0.0
    dd_score = max(0.0, 1.0 - (max_dd / max_drawdown)) if max_drawdown > 0 else 0.0
    sharpe_score = min(sharpe / min_sharpe, 1.0) if min_sharpe > 0 else 0.0

    # Weighted composite → mapped to [-1, +1]
    composite = (return_score * 0.50) + (dd_score * 0.30) + (sharpe_score * 0.20)
    raw = (composite * 2.0) - 1.0

    return max(failure_floor, float(np.clip(raw, -1.0, 1.0)))


def mastery_check(
    cycle_scores: list[float],
    goal: dict[str, Any],
    current_cadence: int,
) -> tuple[bool, int]:
    """
    Returns (is_master, new_cadence).
    Widens cadence when mastery threshold is hit for N consecutive cycles.
    """
    threshold: float = goal.get("mastery_threshold", 0.90)
    required: int = goal.get("mastery_cycles", 3)

    if len(cycle_scores) < required:
        return False, current_cadence

    recent = cycle_scores[-required:]
    if all(s >= threshold for s in recent):
        # Widen cadence: 5 → 10 → 20 → 50
        schedule = [5, 10, 20, 50]
        idx = schedule.index(current_cadence) if current_cadence in schedule else -1
        new_cadence = schedule[idx + 1] if idx < len(schedule) - 1 else 50
        return True, new_cadence

    return False, current_cadence
