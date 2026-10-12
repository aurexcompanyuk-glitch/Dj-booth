"""Sentinel CLI — demonstrates the scope boundary end to end.

    python -m sentinel.cli check  programs/example-acme.yaml  shop.acme.com
    python -m sentinel.cli filter programs/example-acme.yaml  < candidates.txt

The `check`/`filter` verbs are the only things wired up today: they prove the
authorization boundary works before any recon/testing layer exists. Recon and
reporting verbs will hang off this same entry point.
"""

from __future__ import annotations

import sys

from .policy_loader import load_program


def _cmd_check(program_path: str, targets: list[str]) -> int:
    prog = load_program(program_path)
    print(f"program: {prog.policy.program}")
    if prog.engagement_url:
        print(f"engagement: {prog.engagement_url}")
    print(
        f"rate: {prog.rate.max_requests_per_second} req/s, "
        f"concurrency {prog.rate.max_concurrency}, "
        f"robots={'on' if prog.rate.respect_robots else 'off'}"
    )
    print("-" * 60)
    exit_code = 0
    for t in targets:
        r = prog.policy.authorize(t)
        mark = "ALLOW" if r.allowed else "DENY "
        print(f"[{mark}] {t}\n        {r.reason}")
        if not r.allowed:
            exit_code = 1
    return exit_code


def _cmd_filter(program_path: str) -> int:
    prog = load_program(program_path)
    candidates = [ln.strip() for ln in sys.stdin if ln.strip()]
    allowed, denied = prog.policy.filter_authorized(candidates)
    for t in allowed:
        print(t.raw)
    print(
        f"# {len(allowed)} authorized, {len(denied)} denied "
        f"(program: {prog.policy.program})",
        file=sys.stderr,
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if not argv:
        print(__doc__)
        return 2
    cmd, rest = argv[0], argv[1:]
    if cmd == "check" and len(rest) >= 2:
        return _cmd_check(rest[0], rest[1:])
    if cmd == "filter" and len(rest) == 1:
        return _cmd_filter(rest[0])
    print(__doc__)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
