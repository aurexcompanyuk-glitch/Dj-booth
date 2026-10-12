# Sentinel — Autonomous Bug-Bounty Research Agent

> Working name. Rename freely.

## The one-sentence pitch

Sentinel is an AI agent that continuously hunts for security
vulnerabilities **inside an explicitly authorized scope**, reproduces what it
finds, and writes submission-ready reports — so security teams get the signal
of a crowd of researchers without the noise.

## Why an enterprise buys this (and why they'd refuse the obvious version)

The naive version of "AI that finds bugs" is an unguided scanner pointed at
the internet. No serious company will run that, and no bug-bounty platform
will let it onto their programs — it will hit out-of-scope assets, trip
rate limits, and generate low-quality duplicate reports that cost triage time.

What a CISO will actually pay for is the **opposite** property: a system that
can *prove* it only ever touches what it was authorized to touch, stays within
the program's rules of engagement, and produces fewer, higher-quality,
reproducible findings. That provability is the product. Everything else is
features.

So the architecture is built boundary-first.

## Layers (built in this order)

```
┌─────────────────────────────────────────────────────────────┐
│ 5. Reporting      reproducible writeup in program's format    │
├─────────────────────────────────────────────────────────────┤
│ 4. Active testing HUMAN-GATED. Sends payloads. Rate-limited.  │
├─────────────────────────────────────────────────────────────┤
│ 3. Hypothesis     LLM proposes candidate vulns + reasoning    │
├─────────────────────────────────────────────────────────────┤
│ 2. Passive recon  low-noise discovery; no intrusive requests  │
├─────────────────────────────────────────────────────────────┤
│ 1. SCOPE ENGINE   fail-closed authorization boundary  ◀━━━━━━ │  ← built FIRST
├─────────────────────────────────────────────────────────────┤
│ 0. Audit log      append-only record of every decision        │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1 — Scope engine (`sentinel/scope.py`) — DONE

The crown jewel. Pure, no I/O, fully unit-tested with adversarial cases
(lookalike domains, substring tricks, out-of-scope-beats-in-scope, fail-closed
on unknowns). Every candidate target passes through `ScopePolicy.authorize()`
before anything else in the system is allowed to look at it. Rules:

- **Deny wins.** Any out-of-scope match is an immediate hard stop.
- **Fail closed.** If a target isn't *provably* in scope, it's denied.
- **Auditable in one file.** A buyer's security team can read it in 10 minutes.

### Layer 2 — Passive recon (next)

DNS, certificate transparency, public asset enumeration, tech fingerprinting,
and leaked-secret surface — the non-intrusive stuff. Every discovered asset is
re-checked against the scope engine before it's kept. Honors `robots.txt` and
per-program rate rules from the program file.

### Layer 3 — Hypothesis engine

The LLM's actual job: read the recon graph and propose *candidate*
vulnerabilities with explicit reasoning and a confidence score (IDOR on this
endpoint, SSRF via this parameter, an exposed `.git`, auth logic that looks
bypassable). Output is hypotheses, not actions.

### Layer 4 — Active testing (human-gated by default)

Anything that sends a crafted payload is a different risk class. Default
posture: the agent assembles a safe, minimal proof-of-concept and **waits for
a human to approve** before firing. Enterprise tiers can pre-authorize
specific low-risk check classes per program. Hard-capped by the program's
`max_requests_per_second` and `max_concurrency`.

### Layer 5 — Reporting

Confirmed finding → clean, deduplicated, reproducible report in the target
program's template (HackerOne/Bugcrowd/Intigriti/internal), with severity
(CVSS), reproduction steps, and impact. This is where the money is: payouts
and triage savings both track report quality, not scan volume.

### Layer 0 — Audit log (cross-cutting)

Append-only, tamper-evident record of every authorization decision, every
request sent, and every human approval. This is what you hand a customer's
security team and a bounty platform to demonstrate the tool stayed in bounds.
It is also your legal safe-harbor evidence.

## What makes it defensible as a business

1. **Report quality / dedup**, not scan coverage — that's what programs reward.
2. **The audit + scope story** is a procurement unlock; competitors that lead
   with "autonomous" scare security teams.
3. **Per-program knowledge compounding** — the agent gets better at a given
   target over time without widening its authority.

## What we deliberately will NOT build

- No scanning of targets the operator hasn't loaded an authorized program for.
- No detection-evasion / stealth features — this is cooperative security
  testing, not intrusion.
- No exploitation beyond the minimal PoC needed to demonstrate a finding.
- No data exfiltration; PoCs stop at proof.

These aren't just ethics — they're the exact properties that make it sellable
into a security org and acceptable on a bounty platform.
