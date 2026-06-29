import argparse
import asyncio
import os
import sys
from pathlib import Path

import yaml


def _resolve_state_dir() -> Path:
    if Path("/app/state").exists():
        return Path("/app/state")
    return Path.home() / "hermes-trading" / "state"


def main() -> None:
    parser = argparse.ArgumentParser(description="Hermes Trading Worker")
    parser.add_argument("--asset", type=str, help="Override asset from goal.yaml")
    parser.add_argument("--dry-run", action="store_true", help="Run one cycle and exit")
    args = parser.parse_args()

    state_dir = _resolve_state_dir()
    goal_path = state_dir / "goal.yaml"

    if not goal_path.exists():
        print(f"ERROR: goal.yaml not found at {goal_path}")
        sys.exit(1)

    with open(goal_path) as f:
        goal = yaml.safe_load(f) or {}

    asset = args.asset or goal.get("asset", "BTC/USDT")

    mode = os.getenv("HERMES_TRADING_MODE", "paper")
    if mode == "live" and os.getenv("HERMES_TRADING_I_ACCEPT_RISK", "false").lower() != "true":
        print("ERROR: Live mode requires HERMES_TRADING_I_ACCEPT_RISK=true in .env")
        sys.exit(1)

    from hermes_trading.loop import TradingLoop

    loop = TradingLoop(goal=goal, asset=asset, dry_run=args.dry_run)
    asyncio.run(loop.run())


if __name__ == "__main__":
    main()
