"""Role/permission checks, backed by the database.

Until 2026-08-14 the matrix lived in a Python dict here, and per-role exceptions
lived in ``user_state.json`` under ``scope_overrides``. Two sources, one of them
a file rewritten wholesale on every login, neither of them auditable. The matrix
now lives in ``roles`` / ``permissions`` / ``role_permissions``, seeded by
revision ``0002`` from exactly the dict this module used to hold: the storage
changed, the answers did not.

``can(role, scope)`` keeps its old signature, so every call site keeps working.
For anything that involves a *scope* -- a school, a class, a licence, a flag --
use ``app.services.access_control.evaluate`` instead: a role check alone answers
"may this kind of user ever do this", not "may this user do this here".

Failure mode is closed. If the matrix cannot be read, nothing is permitted.
An authorisation layer that fails open is worse than none, because it is
trusted.
"""

from __future__ import annotations

import threading
import time
from typing import Iterator, Mapping, Set

from app.db.session import SessionLocal
from app.repositories.identity import RoleRepository

__all__ = [
    "ALL_KNOWN_ROLES",
    "ROLE_ADMIN",
    "ROLE_CONTENT_EDITOR",
    "ROLE_HOMEROOM_TEACHER",
    "ROLE_LEARNER",
    "ROLE_OWNER",
    "ROLE_PARENT",
    "ROLE_SCHOOL_ADMIN",
    "ROLE_SCOPES",
    "ROLE_STUDENT",
    "ROLE_SUPPORT",
    "ROLE_TEACHER",
    "can",
    "invalidate_policy_cache",
    "normalize_role",
]

ROLE_STUDENT = "student"
ROLE_LEARNER = "learner"
ROLE_TEACHER = "teacher"
ROLE_HOMEROOM_TEACHER = "homeroom_teacher"
ROLE_PARENT = "parent"
ROLE_SCHOOL_ADMIN = "school_admin"
ROLE_CONTENT_EDITOR = "content_editor"
ROLE_SUPPORT = "support"
ROLE_ADMIN = "admin"
ROLE_OWNER = "owner"

# The matrix is read on nearly every request and changes when an administrator
# edits it -- which is rare. A short TTL keeps the read off the hot path without
# letting a revoked permission linger for more than a minute; an explicit
# invalidation makes an intentional edit take effect at once.
_CACHE_TTL_SECONDS = 60.0

_lock = threading.Lock()
_cached_matrix: dict[str, dict[str, str]] | None = None
_cached_roles: set[str] | None = None
_cached_at: float = 0.0

_repository = RoleRepository()


def normalize_role(value: str | None) -> str:
    return str(value or "").strip().lower()


def invalidate_policy_cache() -> None:
    """Drop the cached matrix. Call after changing roles or permissions."""
    global _cached_matrix, _cached_roles, _cached_at
    with _lock:
        _cached_matrix = None
        _cached_roles = None
        _cached_at = 0.0


def _load() -> tuple[dict[str, dict[str, str]], set[str]]:
    global _cached_matrix, _cached_roles, _cached_at

    now = time.monotonic()
    with _lock:
        fresh = (
            _cached_matrix is not None
            and _cached_roles is not None
            and (now - _cached_at) < _CACHE_TTL_SECONDS
        )
        if fresh:
            return _cached_matrix, _cached_roles  # type: ignore[return-value]

    session = SessionLocal()
    try:
        matrix = _repository.permission_matrix(session)
        roles = _repository.known_roles(session)
    finally:
        session.close()

    with _lock:
        _cached_matrix = matrix
        _cached_roles = roles
        _cached_at = time.monotonic()
    return matrix, roles


def can(role: str | None, scope: str) -> bool:
    """May a user holding ``role`` exercise ``scope`` at all?

    Scope-free by construction: this answers the ``role -> permission`` links of
    the chain and nothing beyond them. An explicit ``deny`` in the matrix beats
    an ``allow``.
    """
    normalized = normalize_role(role)
    if not normalized or not scope:
        return False

    matrix, roles = _load()
    if normalized not in roles:
        return False

    effect = matrix.get(scope, {}).get(normalized)
    return effect == "allow"


class _LazyRoleSet(Set[str]):
    """``ALL_KNOWN_ROLES`` as it was, but sourced from the ``roles`` table."""

    def __contains__(self, item: object) -> bool:
        return item in _load()[1]

    def __iter__(self) -> Iterator[str]:
        return iter(sorted(_load()[1]))

    def __len__(self) -> int:
        return len(_load()[1])

    def __repr__(self) -> str:
        return f"ALL_KNOWN_ROLES({sorted(_load()[1])!r})"


class _LazyScopeMatrix(Mapping[str, Set[str]]):
    """``ROLE_SCOPES`` as it was: permission -> set of roles allowed to use it."""

    def _allowed(self, scope: str) -> set[str]:
        effects = _load()[0].get(scope, {})
        return {role for role, effect in effects.items() if effect == "allow"}

    def __getitem__(self, scope: str) -> Set[str]:
        allowed = self._allowed(scope)
        if not allowed and scope not in _load()[0]:
            raise KeyError(scope)
        return allowed

    def __iter__(self) -> Iterator[str]:
        return iter(sorted(_load()[0]))

    def __len__(self) -> int:
        return len(_load()[0])

    def __repr__(self) -> str:
        return f"ROLE_SCOPES({sorted(_load()[0])!r})"


ALL_KNOWN_ROLES: Set[str] = _LazyRoleSet()
ROLE_SCOPES: Mapping[str, Set[str]] = _LazyScopeMatrix()
