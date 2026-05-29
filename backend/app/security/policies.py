
from __future__ import annotations

from typing import Dict, Set

from app.services.user_state_store import _read_state


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

ALL_KNOWN_ROLES: Set[str] = {
    ROLE_STUDENT,
    ROLE_LEARNER,
    ROLE_TEACHER,
    ROLE_HOMEROOM_TEACHER,
    ROLE_PARENT,
    ROLE_SCHOOL_ADMIN,
    ROLE_CONTENT_EDITOR,
    ROLE_SUPPORT,
    ROLE_ADMIN,
    ROLE_OWNER,
}

ROLE_SCOPES = {
    "auth:me": ALL_KNOWN_ROLES,
    "user:read_self": ALL_KNOWN_ROLES,
    "user:sync_self": ALL_KNOWN_ROLES,
    "user:profile_self": ALL_KNOWN_ROLES,
    "telemetry:write_self": ALL_KNOWN_ROLES,
    "payments:admin": {ROLE_TEACHER, ROLE_HOMEROOM_TEACHER, ROLE_SCHOOL_ADMIN, ROLE_ADMIN, ROLE_OWNER},
    "cabinet:teacher": {ROLE_TEACHER, ROLE_HOMEROOM_TEACHER},
    "cabinet:parent": {ROLE_PARENT},
    "admin:panel": {ROLE_SUPPORT, ROLE_SCHOOL_ADMIN, ROLE_ADMIN, ROLE_OWNER},
    "admin:roles": {ROLE_SCHOOL_ADMIN, ROLE_ADMIN, ROLE_OWNER},
    "admin:rights": {ROLE_SCHOOL_ADMIN, ROLE_ADMIN, ROLE_OWNER},
    "admin:subscriptions": {ROLE_SCHOOL_ADMIN, ROLE_ADMIN, ROLE_OWNER},
    "content:manage": {ROLE_CONTENT_EDITOR, ROLE_SCHOOL_ADMIN, ROLE_ADMIN, ROLE_OWNER},
}


def normalize_role(value: str | None) -> str:
    return str(value or "").strip().lower()


def _scope_overrides() -> Dict[str, Dict[str, bool]]:
    state = _read_state()
    raw = state.get("scope_overrides", {})
    if isinstance(raw, dict):
        return raw
    return {}


def can(role: str | None, scope: str) -> bool:
    normalized = normalize_role(role)
    allowed = ROLE_SCOPES.get(scope, set())
    base_allowed = normalized in allowed

    overrides = _scope_overrides()
    role_overrides = overrides.get(normalized, {}) if isinstance(overrides.get(normalized), dict) else {}
    if scope in role_overrides:
        return bool(role_overrides[scope])

    return base_allowed
