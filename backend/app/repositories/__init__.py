"""Repositories: the only place that knows how identity is stored.

Everything above this package works with users, roles, sessions and consents.
Nothing above it works with ``user_state.json``, with raw SQL, or with the
shape of a table. That boundary is the point: the identity store moved from a
JSON file to PostgreSQL, and it will move again (sharding, archival, a separate
service) without the callers noticing.

Every method takes an explicit ``Session``. Repositories neither open nor commit
transactions -- the caller owns the unit of work, so a login that writes a
session, an audit row and a rate-limit event either lands whole or not at all.
"""

from __future__ import annotations

from app.repositories.identity import (
    AuditRepository,
    ConsentRepository,
    EntitlementRepository,
    FeatureFlagRepository,
    RoleRepository,
    SessionRepository,
    UserRepository,
)

__all__ = [
    "AuditRepository",
    "ConsentRepository",
    "EntitlementRepository",
    "FeatureFlagRepository",
    "RoleRepository",
    "SessionRepository",
    "UserRepository",
]
