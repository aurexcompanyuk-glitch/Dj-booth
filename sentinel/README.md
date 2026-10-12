# Sentinel

An AI agent that hunts for security vulnerabilities **inside an explicitly
authorized bug-bounty scope**, reproduces findings, and writes
submission-ready reports.

> Working name — rename freely. Built boundary-first: the authorization
> engine exists and is tested before any code that touches a network.

## Why this shape

The version of "AI finds bugs" that enterprises and bounty platforms will
actually allow onto their assets is the one that can *prove* it never strays
outside authorized scope, respects the rules of engagement, and produces few
high-quality reports instead of a flood of noise. That provability is the
product. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full layer model
and the go-to-market reasoning.

## What exists today

- **Layer 1 — scope engine** (`sentinel/scope.py`): a pure, fail-closed
  authorization boundary. Deny always beats allow; unknown targets are denied.
- **Program loader** (`sentinel/policy_loader.py`): imports a HackerOne/
  Bugcrowd-style scope file (YAML or JSON) into a policy. Zero hard deps —
  a built-in minimal YAML reader covers the common case; install PyYAML for more.
- **CLI** (`sentinel/cli.py`): `check` and `filter` verbs that demonstrate the
  boundary end to end.
- **Adversarial test suite** (`tests/test_scope.py`): 18 tests, every one
  asking "can the boundary be tricked?" — lookalike domains, substring tricks,
  out-of-scope carve-outs, fail-closed on unknowns.

## Quick start

```bash
cd sentinel
python3 -m pytest tests/ -q          # 18 passing

# Check specific targets against a program's authorized scope
python3 -m sentinel.cli check programs/example-acme.yaml \
    shop.acme.com acme.com.evil.com 198.51.100.42

# Filter a candidate list down to only authorized targets
printf 'shop.acme.com\nevil.com\n198.51.100.9\n' \
    | python3 -m sentinel.cli filter programs/example-acme.yaml
```

A **program file** (`programs/example-acme.yaml`) is a signed-off statement of
authorization. A human authors and approves it; the agent never infers its own
scope from the internet.

## Roadmap (next layers)

1. Passive recon (DNS/CT/fingerprinting) — every discovered asset re-checked
   against the scope engine, honoring per-program rate rules.
2. Hypothesis engine — LLM proposes candidate vulns with reasoning + confidence.
3. Human-gated active testing — minimal PoCs, approval-gated, rate-capped.
4. Reporting — reproducible writeups in the program's template.
5. Append-only audit log — evidence that the tool stayed in bounds.

## Non-goals (on purpose)

No scanning without a loaded authorized program; no detection-evasion/stealth;
no exploitation beyond a minimal proof-of-concept; no data exfiltration. These
are exactly the properties that make the tool acceptable to a security org and
a bounty platform.
