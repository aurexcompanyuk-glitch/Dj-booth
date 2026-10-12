"""Scope enforcement — the hard authorization boundary.

This module is the safety-critical core of the whole system. Every candidate
target must pass through `ScopePolicy.authorize()` before ANY network activity
touches it. The design rule is fail-closed: if a target is not provably
in-scope, it is denied. Out-of-scope rules always win over in-scope rules.

Nothing in this file performs network I/O. It only answers the question:
"Am I allowed to touch this?" Keeping that decision pure and isolated is what
makes it auditable — an enterprise buyer can read this one file and convince
themselves the tool cannot wander.
"""

from __future__ import annotations

import fnmatch
import ipaddress
import re
from dataclasses import dataclass, field
from enum import Enum
from urllib.parse import urlparse


class AssetKind(str, Enum):
    DOMAIN = "domain"          # example.com and (optionally) subdomains
    WILDCARD = "wildcard"      # *.example.com
    URL = "url"                # a specific URL / path prefix
    IP = "ip"                  # single IP
    CIDR = "cidr"              # IP range, e.g. 10.0.0.0/24


class Decision(str, Enum):
    ALLOW = "allow"
    DENY = "deny"


@dataclass(frozen=True)
class ScopeRule:
    """A single in-scope or out-of-scope entry from a program's policy."""
    kind: AssetKind
    value: str
    include_subdomains: bool = False  # only meaningful for DOMAIN

    def matches(self, target: "Target") -> bool:
        if self.kind in (AssetKind.DOMAIN, AssetKind.WILDCARD):
            return self._matches_host(target.host)
        if self.kind == AssetKind.URL:
            return self._matches_url(target)
        if self.kind == AssetKind.IP:
            return target.ip is not None and str(target.ip) == self.value
        if self.kind == AssetKind.CIDR:
            return target.ip is not None and target.ip in ipaddress.ip_network(
                self.value, strict=False
            )
        return False

    def _matches_host(self, host: str | None) -> bool:
        if not host:
            return False
        host = host.lower().rstrip(".")
        if self.kind == AssetKind.WILDCARD:
            # "*.example.com" matches sub.example.com but NOT example.com itself.
            base = self.value.lstrip("*.").lower()
            return host.endswith("." + base)
        base = self.value.lower()
        if host == base:
            return True
        if self.include_subdomains:
            return host.endswith("." + base)
        return False

    def _matches_url(self, target: "Target") -> bool:
        if not target.url:
            return False
        # URL rules act as a prefix match on scheme://host/path so a program can
        # authorize one path without authorizing the whole host.
        return target.url.lower().startswith(self.value.lower().rstrip("/"))


@dataclass(frozen=True)
class Target:
    """A normalized thing we might touch. Build these via `Target.parse`."""
    raw: str
    host: str | None = None
    url: str | None = None
    ip: ipaddress._BaseAddress | None = field(default=None)

    @classmethod
    def parse(cls, raw: str) -> "Target":
        raw = raw.strip()
        # Try IP / CIDR first.
        try:
            return cls(raw=raw, ip=ipaddress.ip_address(raw))
        except ValueError:
            pass
        if "://" in raw:
            parsed = urlparse(raw)
            host = parsed.hostname
            ip = None
            if host:
                try:
                    ip = ipaddress.ip_address(host)
                except ValueError:
                    ip = None
            # Normalize URL (drop default ports, trailing slash noise).
            url = raw
            return cls(raw=raw, host=host, url=url, ip=ip)
        # Bare hostname.
        if re.match(r"^[a-z0-9.-]+$", raw, re.IGNORECASE):
            return cls(raw=raw, host=raw)
        return cls(raw=raw)


@dataclass(frozen=True)
class AuthorizationResult:
    decision: Decision
    target: Target
    reason: str
    matched_rule: ScopeRule | None = None

    @property
    def allowed(self) -> bool:
        return self.decision == Decision.ALLOW


class ScopePolicy:
    """Immutable allowlist/denylist for one bug-bounty program.

    Evaluation order (deny wins):
      1. If any out-of-scope rule matches -> DENY.
      2. Else if any in-scope rule matches -> ALLOW.
      3. Else -> DENY (fail closed: silence is not consent).
    """

    def __init__(
        self,
        program: str,
        in_scope: list[ScopeRule],
        out_of_scope: list[ScopeRule] | None = None,
    ) -> None:
        if not in_scope:
            raise ValueError("A policy with no in-scope rules authorizes nothing.")
        self.program = program
        self._in_scope = tuple(in_scope)
        self._out_of_scope = tuple(out_of_scope or ())

    def authorize(self, raw_target: str) -> AuthorizationResult:
        target = Target.parse(raw_target)

        for rule in self._out_of_scope:
            if rule.matches(target):
                return AuthorizationResult(
                    Decision.DENY, target,
                    f"matched explicit out-of-scope rule: {rule.kind.value}={rule.value}",
                    matched_rule=rule,
                )

        for rule in self._in_scope:
            if rule.matches(target):
                return AuthorizationResult(
                    Decision.ALLOW, target,
                    f"matched in-scope rule: {rule.kind.value}={rule.value}",
                    matched_rule=rule,
                )

        return AuthorizationResult(
            Decision.DENY, target,
            "no in-scope rule matched (fail-closed: targets must be explicitly authorized)",
        )

    def filter_authorized(self, targets: list[str]) -> tuple[list[Target], list[AuthorizationResult]]:
        """Partition a candidate list into (allowed, denied-results)."""
        allowed: list[Target] = []
        denied: list[AuthorizationResult] = []
        for t in targets:
            result = self.authorize(t)
            if result.allowed:
                allowed.append(result.target)
            else:
                denied.append(result)
        return allowed, denied
