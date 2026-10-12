"""The scope engine is safety-critical, so its tests are adversarial.

Every test here is really asking one question: "Can the tool be tricked into
touching something the program didn't authorize?" If any of these fail, the
tool is not safe to ship.
"""

import ipaddress

import pytest

from sentinel.scope import (
    AssetKind,
    Decision,
    ScopePolicy,
    ScopeRule,
    Target,
)


def policy() -> ScopePolicy:
    return ScopePolicy(
        program="acme",
        in_scope=[
            ScopeRule(AssetKind.WILDCARD, "*.acme.com"),
            ScopeRule(AssetKind.DOMAIN, "acme.com"),  # apex, no subs by default
            ScopeRule(AssetKind.URL, "https://api.acme.com/v2/"),
            ScopeRule(AssetKind.CIDR, "198.51.100.0/24"),
        ],
        out_of_scope=[
            ScopeRule(AssetKind.DOMAIN, "legacy.acme.com", include_subdomains=True),
            ScopeRule(AssetKind.URL, "https://api.acme.com/v2/internal"),
        ],
    )


# --- in-scope allows ---------------------------------------------------------

def test_subdomain_in_scope():
    assert policy().authorize("https://shop.acme.com").allowed


def test_apex_in_scope():
    assert policy().authorize("acme.com").allowed


def test_ip_in_cidr_in_scope():
    assert policy().authorize("198.51.100.42").allowed


# --- the attacks the boundary must refuse ------------------------------------

def test_lookalike_domain_denied():
    # acme.com.evil.com must NOT match *.acme.com or acme.com.
    r = policy().authorize("https://acme.com.evil.com")
    assert r.decision == Decision.DENY


def test_substring_domain_denied():
    # notacme.com must not sneak past an acme.com rule.
    assert not policy().authorize("https://notacme.com").allowed


def test_suffix_without_dot_denied():
    # evilacme.com ends with "acme.com" as a string but is a different domain.
    assert not policy().authorize("evilacme.com").allowed


def test_out_of_scope_beats_in_scope():
    # legacy.acme.com matches *.acme.com (in) but is explicitly out -> DENY.
    r = policy().authorize("https://legacy.acme.com")
    assert r.decision == Decision.DENY
    assert "out-of-scope" in r.reason


def test_out_of_scope_subdomain_beats_wildcard():
    assert not policy().authorize("https://db.legacy.acme.com").allowed


def test_url_path_scope_is_a_prefix():
    # Isolate URL-prefix semantics: a policy whose ONLY rule is a path-scoped
    # URL must authorize that path but not a sibling path on the same host.
    url_only = ScopePolicy(
        "x", [ScopeRule(AssetKind.URL, "https://api.acme.com/v2/")]
    )
    assert url_only.authorize("https://api.acme.com/v2/users").allowed
    assert not url_only.authorize("https://api.acme.com/v1/users").allowed


def test_out_of_scope_path_inside_in_scope_path():
    assert not policy().authorize("https://api.acme.com/v2/internal/keys").allowed


def test_ip_outside_cidr_denied():
    assert not policy().authorize("198.51.101.1").allowed


def test_unknown_target_fails_closed():
    r = policy().authorize("https://random-unrelated-site.io")
    assert r.decision == Decision.DENY
    assert "fail-closed" in r.reason


def test_empty_in_scope_is_rejected_at_construction():
    with pytest.raises(ValueError):
        ScopePolicy("x", in_scope=[])


def test_wildcard_does_not_match_apex():
    # *.acme.com should not match acme.com itself; that needs its own rule.
    only_wild = ScopePolicy("x", [ScopeRule(AssetKind.WILDCARD, "*.acme.com")])
    assert not only_wild.authorize("acme.com").allowed
    assert only_wild.authorize("x.acme.com").allowed


def test_trailing_dot_fqdn_normalized():
    assert policy().authorize("https://shop.acme.com.").allowed


def test_case_insensitive_host():
    assert policy().authorize("https://SHOP.ACME.COM").allowed


def test_target_parse_ip():
    t = Target.parse("10.0.0.1")
    assert t.ip == ipaddress.ip_address("10.0.0.1")


def test_filter_authorized_partitions():
    allowed, denied = policy().filter_authorized(
        ["shop.acme.com", "evil.com", "legacy.acme.com", "198.51.100.9"]
    )
    assert {t.host or str(t.ip) for t in allowed} == {"shop.acme.com", "198.51.100.9"}
    assert len(denied) == 2
