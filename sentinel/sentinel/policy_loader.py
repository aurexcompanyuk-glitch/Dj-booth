"""Load a ScopePolicy from a declarative YAML/JSON program file.

The format mirrors how HackerOne / Bugcrowd express scope so importing a real
program is mechanical. A human still has to author/approve the file — the tool
never infers its own authorization from the internet.

Example program file (YAML):

    program: acme-public-bbp
    engagement_url: https://hackerone.com/acme
    in_scope:
      - "*.acme.com"            # all subdomains
      - "acme.com+subs"         # apex + subs (the +subs suffix)
      - "https://api.acme.com/v2/"
      - "198.51.100.0/24"
    out_of_scope:
      - "legacy.acme.com"
      - "https://acme.com/blog"
    rules:
      max_requests_per_second: 5
      respect_robots: true
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from .scope import AssetKind, ScopePolicy, ScopeRule


@dataclass(frozen=True)
class RateRules:
    max_requests_per_second: float = 2.0
    respect_robots: bool = True
    max_concurrency: int = 4


@dataclass(frozen=True)
class LoadedProgram:
    policy: ScopePolicy
    rate: RateRules
    engagement_url: str | None = None


def _classify(entry: str) -> ScopeRule:
    entry = entry.strip()
    include_subs = False
    if entry.endswith("+subs"):
        include_subs = True
        entry = entry[: -len("+subs")].strip()

    if "://" in entry:
        return ScopeRule(AssetKind.URL, entry)
    if entry.startswith("*."):
        return ScopeRule(AssetKind.WILDCARD, entry)
    if "/" in entry and _looks_like_cidr(entry):
        return ScopeRule(AssetKind.CIDR, entry)
    if _looks_like_ip(entry):
        return ScopeRule(AssetKind.IP, entry)
    return ScopeRule(AssetKind.DOMAIN, entry, include_subdomains=include_subs)


def _looks_like_ip(s: str) -> bool:
    import ipaddress
    try:
        ipaddress.ip_address(s)
        return True
    except ValueError:
        return False


def _looks_like_cidr(s: str) -> bool:
    import ipaddress
    try:
        ipaddress.ip_network(s, strict=False)
        return "/" in s
    except ValueError:
        return False


def load_program(path: str | Path) -> LoadedProgram:
    path = Path(path)
    text = path.read_text()
    data = _parse(text, path.suffix)

    if "program" not in data or "in_scope" not in data:
        raise ValueError("program file must define 'program' and 'in_scope'")

    in_scope = [_classify(e) for e in data["in_scope"]]
    out_of_scope = [_classify(e) for e in data.get("out_of_scope", [])]
    policy = ScopePolicy(data["program"], in_scope, out_of_scope)

    r = data.get("rules", {}) or {}
    rate = RateRules(
        max_requests_per_second=float(r.get("max_requests_per_second", 2.0)),
        respect_robots=bool(r.get("respect_robots", True)),
        max_concurrency=int(r.get("max_concurrency", 4)),
    )
    return LoadedProgram(policy=policy, rate=rate, engagement_url=data.get("engagement_url"))


def _parse(text: str, suffix: str) -> dict:
    if suffix in (".yaml", ".yml"):
        try:
            import yaml  # type: ignore
            return yaml.safe_load(text)
        except ImportError:
            return _tiny_yaml(text)
    return json.loads(text)


def _tiny_yaml(text: str) -> dict:
    """Minimal YAML subset parser so we have zero hard deps for the common case.

    Supports: top-level key: value, nested one level under 'rules:', and
    list items under in_scope/out_of_scope. Good enough for program files;
    install PyYAML for anything fancier.
    """
    data: dict = {}
    current_list_key: str | None = None
    current_map_key: str | None = None
    for line in text.splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        stripped = line.strip()
        if stripped.startswith("- "):
            item = stripped[2:].strip().strip('"\'')
            if current_list_key:
                data.setdefault(current_list_key, []).append(item)
            continue
        if ":" in stripped:
            key, _, val = stripped.partition(":")
            key = key.strip()
            val = val.strip().strip('"\'')
            if val == "":
                if key in ("in_scope", "out_of_scope"):
                    current_list_key, current_map_key = key, None
                    data.setdefault(key, [])
                elif key == "rules":
                    current_map_key, current_list_key = key, None
                    data.setdefault(key, {})
                continue
            if indent >= 2 and current_map_key == "rules":
                data["rules"][key] = _coerce(val)
            else:
                data[key] = val
                current_list_key = current_map_key = None
    return data


def _coerce(v: str):
    if v.lower() in ("true", "false"):
        return v.lower() == "true"
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return v
