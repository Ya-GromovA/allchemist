"""Temporary read/write bridge between the legacy JSON state and the database.

Why this module exists
----------------------
``backend/data/user_state.json`` was one dictionary holding thirty-four
unrelated collections, and six modules read and rewrote the whole of it. Moving
identity into the database in one step would therefore have meant rewriting six
modules in one step -- including a 3810-line admin service -- with no way to
verify any part of it separately.

So the identity collections move first, and this module keeps the modules that
have not moved yet working while they still read the old shape:

* :func:`read_state` returns the legacy dictionary, with the collections owned
  by the database **projected out of the database** and the rest read from the
  file. Nothing that has moved is served from the file, so a stale file cannot
  resurrect a deleted account.
* :func:`write_state` writes back to the file **only** the collections that have
  not moved. For the ones that have, it applies the caller's intent to the
  database through the appliers below, which cover exactly the mutations the
  remaining modules actually perform.

What this is not
----------------
It is not a dual write. The JSON file is no longer the source of truth for
anything in :data:`DB_OWNED_COLLECTIONS`, and it is never written for them. It
stays on disk as the documented rollback source
(``docs/ops/identity-migration-*``) and for nothing else.

Removal criterion
-----------------
This module is deleted when ``admin_panel_service.py``, ``role_cabinet.py``,
``auth_sync.py``, ``payment_adapters.py`` and ``sync_progress.py`` no longer
call ``_read_state``/``_write_state``. Its size is therefore a measure of how
much of the strangler is left, and it can only shrink.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.identity import (
    AuditLogEntry,
    Consent,
    OtpChallenge,
    RoleAssignment,
    User,
    UserAppState,
    UserCredential,
    UserEntitlement,
    UserEntitlementItem,
    UserIdentifier,
    UserSession,
)
from app.models.recovery import PasswordResetCode
from app.models.school import DeviceRecoveryCode, DeviceRegistryEntry
from app.models.telemetry import LearningEvent, TelemetryEvent
from app.repositories.identity import RoleRepository

__all__ = [
    "DB_OWNED_COLLECTIONS",
    "STATE_PATH",
    "project_state",
    "read_state",
    "write_state",
]

STATE_PATH = Path(__file__).resolve().parents[2] / "data" / "user_state.json"

# Collections whose single source of truth is now PostgreSQL. Reading them from
# the file is forbidden; writing them to the file is silently dropped, because
# a module that still tries is telling us it has not been converted yet, not
# that the data should be duplicated.
DB_OWNED_COLLECTIONS = frozenset(
    {
        "auth_audit",
        "consents",
        "device_recovery_codes",
        "device_registry",
        "device_sync",
        "entitlements",
        "learning_events",
        "logins",
        "otp",
        "password_reset_codes",
        "phones",
        "role_overrides",
        "session_revocations",
        "sessions",
        "telemetry",
        "users",
    }
)

# Bounded projections. These collections exist in the legacy shape only so that
# dashboards can count and list recent items; nothing reads all of history from
# them, and materialising all of it on every request would be a denial of
# service against ourselves.
_PROJECTION_LIMITS = {
    "auth_audit": 2000,
    "learning_events": 2000,
    "sessions": 5000,
    "telemetry": 2000,
}


def _iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _read_file() -> Dict[str, Any]:
    if not STATE_PATH.exists():
        return {}
    try:
        raw = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return raw if isinstance(raw, dict) else {}


# --------------------------------------------------------------------------- #
# Projection: database -> legacy shape
# --------------------------------------------------------------------------- #


def _project_users(session: Session) -> tuple[dict, dict, dict]:
    """Return ``(users, phones, logins)`` in the legacy shape."""
    users: Dict[str, Any] = {}
    phones: Dict[str, str] = {}
    logins: Dict[str, str] = {}

    credentials = {
        row.user_id: row for row in session.execute(select(UserCredential)).scalars().all()
    }
    identifiers: Dict[str, list[UserIdentifier]] = {}
    for row in session.execute(select(UserIdentifier)).scalars().all():
        identifiers.setdefault(row.user_id, []).append(row)

    for user in session.execute(select(User)).scalars().all():
        entry: Dict[str, Any] = {
            "userId": user.user_id,
            "createdAt": _iso(user.created_at),
            "lastLoginAt": _iso(user.last_login_at),
        }
        if user.display_name:
            entry["displayName"] = user.display_name
        if user.status == "deleted":
            entry["deleted"] = True
            entry["deletedAt"] = _iso(user.deleted_at)
        for identifier in identifiers.get(user.user_id, []):
            if identifier.kind == "phone":
                entry.setdefault("phone", identifier.value_normalized)
                phones[identifier.value_normalized] = user.user_id
            elif identifier.kind == "login":
                entry.setdefault("login", identifier.value_normalized)
                logins[identifier.value_normalized] = user.user_id
            elif identifier.kind == "email":
                entry.setdefault("email", identifier.value)
        credential = credentials.get(user.user_id)
        if credential is not None:
            # The hash itself is deliberately not projected. Nothing outside the
            # credential repository has any business reading it, and the legacy
            # readers only ever asked "does this account have a password".
            entry["hasPassword"] = True
            entry["passwordAlgorithm"] = credential.algorithm
            entry["passwordUpdatedAt"] = _iso(credential.updated_at)
            entry["passwordNeedsRehash"] = bool(credential.needs_rehash)
        users[user.user_id] = entry

    return users, phones, logins


def _project_sessions(session: Session) -> Dict[str, Any]:
    statement = (
        select(UserSession)
        .order_by(UserSession.created_at.desc())
        .limit(_PROJECTION_LIMITS["sessions"])
    )
    return {
        row.session_id: {
            "userId": row.user_id,
            "role": row.role_key,
            "accessJti": row.access_jti,
            "accessExpiresAt": _iso(row.access_expires_at),
            "expiresAt": _iso(row.expires_at),
            "createdAt": _iso(row.created_at),
            "revoked": bool(row.revoked),
            "revokedAt": _iso(row.revoked_at),
            "revokeReason": row.revoked_reason,
            "deviceId": row.device_id,
        }
        for row in session.execute(statement).scalars().all()
    }


def _project_consents(session: Session) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    statement = select(Consent).where(Consent.revoked_at.is_(None)).order_by(Consent.accepted_at)
    parent_approved: Dict[str, bool] = {}
    for row in session.execute(statement).scalars().all():
        if row.consent_type == "parent_approval":
            parent_approved[row.user_id] = True
            continue
        if row.consent_type != "terms":
            continue
        out[row.user_id] = {
            "userId": row.user_id,
            "role": row.subject_role,
            "version": row.document_version,
            "acceptedAt": _iso(row.accepted_at),
            "parentApproved": False,
        }
    for user_id, value in parent_approved.items():
        if user_id in out:
            out[user_id]["parentApproved"] = value
        else:
            out[user_id] = {
                "userId": user_id,
                "role": None,
                "version": None,
                "acceptedAt": None,
                "parentApproved": value,
            }
    return out


def _project_entitlements(session: Session) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for row in session.execute(select(UserEntitlement)).scalars().all():
        out[row.user_id] = {"plans": [], "modules": [], "ai_quota_left": int(row.ai_quota_left)}
    for row in session.execute(select(UserEntitlementItem)).scalars().all():
        bucket = out.setdefault(
            row.user_id, {"plans": [], "modules": [], "ai_quota_left": 0}
        )
        if row.kind == "plan":
            bucket["plans"].append(row.value)
        elif row.kind == "module":
            bucket["modules"].append(row.value)
    for bucket in out.values():
        bucket["plans"] = sorted(set(bucket["plans"]))
        bucket["modules"] = sorted(set(bucket["modules"]))
    return out


def _project_device_sync(session: Session) -> Dict[str, Any]:
    modules: Dict[str, list[str]] = {}
    for row in session.execute(
        select(UserEntitlementItem).where(UserEntitlementItem.kind == "module")
    ).scalars().all():
        modules.setdefault(row.user_id, []).append(row.value)
    return {
        row.user_id: {
            "userId": row.user_id,
            "contentVersions": dict(row.content_versions or {}),
            "purchases": sorted(set(modules.get(row.user_id, []))),
            "preferences": dict(row.preferences or {}),
        }
        for row in session.execute(select(UserAppState)).scalars().all()
    }


def _project_device_registry(session: Session) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for row in session.execute(select(DeviceRegistryEntry)).scalars().all():
        out.setdefault(row.user_id, {})[row.device_id] = {
            "label": row.label,
            "platform": row.platform,
            "active": bool(row.active),
            "trustedAt": _iso(row.trusted_at),
            "lastSeenAt": _iso(row.last_seen_at),
            "revokedAt": _iso(row.revoked_at),
        }
    return out


def _project_role_overrides(session: Session) -> Dict[str, str]:
    """The single global role per user, in the shape the legacy map had.

    ``role_overrides`` and "the role recorded on the consent" both became global
    role assignments in revision ``0002``; the highest-ranked one reproduces the
    answer the legacy resolution order gave.
    """
    roles = RoleRepository()
    out: Dict[str, str] = {}
    user_ids = session.execute(
        select(RoleAssignment.user_id)
        .where(RoleAssignment.scope_type == "global", RoleAssignment.revoked_at.is_(None))
        .distinct()
    ).scalars().all()
    for user_id in user_ids:
        role_key = roles.effective_role(session, user_id)
        if role_key:
            out[user_id] = role_key
    return out


def project_state(session: Session) -> Dict[str, Any]:
    """Build the database-owned half of the legacy dictionary."""
    users, phones, logins = _project_users(session)

    otp = {
        row.phone_hash: {
            "codeHash": row.code_hash,
            "expiresAt": _iso(row.expires_at),
            "attempts": int(row.attempts or 0),
            "lockedUntil": _iso(row.locked_until),
        }
        for row in session.execute(select(OtpChallenge)).scalars().all()
    }

    audit = [
        {
            "at": _iso(row.occurred_at),
            "action": row.action,
            "userId": row.actor_user_id,
            "result": row.result,
            "details": dict(row.details or {}),
        }
        for row in session.execute(
            select(AuditLogEntry)
            .order_by(AuditLogEntry.occurred_at.desc())
            .limit(_PROJECTION_LIMITS["auth_audit"])
        ).scalars().all()
    ]
    audit.reverse()

    telemetry = [
        {
            "name": row.event_name,
            "userId": row.user_id,
            "deviceId": row.device_id,
            "sessionId": row.session_id,
            "receivedAt": _iso(row.received_at),
            **dict(row.payload or {}),
        }
        for row in session.execute(
            select(TelemetryEvent)
            .order_by(TelemetryEvent.received_at.desc())
            .limit(_PROJECTION_LIMITS["telemetry"])
        ).scalars().all()
    ]
    telemetry.reverse()

    learning = [
        {
            "userId": row.user_id,
            "sessionId": row.live_session_id,
            "lessonId": row.lesson_id,
            "taskId": row.task_id,
            "classroom": row.classroom,
            "outcome": row.outcome,
            "mistakeTag": row.mistake_tag,
            "integrityFlags": list(row.integrity_flags or []),
            "payload": dict(row.payload or {}),
            "receivedAt": _iso(row.received_at),
        }
        for row in session.execute(
            select(LearningEvent)
            .order_by(LearningEvent.received_at.desc())
            .limit(_PROJECTION_LIMITS["learning_events"])
        ).scalars().all()
    ]
    learning.reverse()

    return {
        "users": users,
        "phones": phones,
        "logins": logins,
        "sessions": _project_sessions(session),
        "consents": _project_consents(session),
        "entitlements": _project_entitlements(session),
        "device_sync": _project_device_sync(session),
        "device_registry": _project_device_registry(session),
        "device_recovery_codes": {
            row.code: {
                "code": row.code,
                "userId": row.user_id,
                "schoolId": row.school_id,
                "classId": row.class_id,
                "status": row.status,
                "createdAt": _iso(row.created_at),
                "expiresAt": _iso(row.expires_at),
                "createdBy": row.created_by,
            }
            for row in session.execute(select(DeviceRecoveryCode)).scalars().all()
        },
        "password_reset_codes": {
            row.reset_id: {
                "resetId": row.reset_id,
                "userId": row.user_id,
                "status": row.status,
                "createdAt": _iso(row.created_at),
                "expiresAt": _iso(row.expires_at),
                "usedAt": _iso(row.used_at),
                "createdBy": row.created_by,
            }
            for row in session.execute(select(PasswordResetCode)).scalars().all()
        },
        "role_overrides": _project_role_overrides(session),
        "otp": otp,
        "auth_audit": audit,
        # Derived from the audit trail rather than stored twice. The legacy file
        # kept a parallel list of the same events, which is how it came to hold
        # revocations the audit did not mention and vice versa.
        "session_revocations": [
            {
                "at": entry["at"],
                "changedBy": entry["userId"],
                "reason": (entry["details"] or {}).get("reason"),
                "userId": (entry["details"] or {}).get("userId"),
                "revokedCount": (entry["details"] or {}).get("revokedCount", 0),
            }
            for entry in audit
            if entry["action"] in {"global_session_revoke_all", "user_session_revoke_all"}
        ],
        "telemetry": telemetry,
        "learning_events": learning,
    }


# --------------------------------------------------------------------------- #
# Read / write entry points used by the not-yet-converted modules
# --------------------------------------------------------------------------- #


def read_state(session: Optional[Session] = None) -> Dict[str, Any]:
    """The legacy dictionary: database for what has moved, file for the rest."""
    state = _read_file()
    for name in DB_OWNED_COLLECTIONS:
        state.pop(name, None)

    owns_session = session is None
    session = session or SessionLocal()
    try:
        state.update(project_state(session))
    finally:
        if owns_session:
            session.close()
    return state


# --------------------------------------------------------------------------- #
# Appliers: legacy mutation -> database
# --------------------------------------------------------------------------- #
#
# Not every difference between the caller's dictionary and the database is a
# mutation the caller meant. The appliers below therefore cover exactly the
# changes the unconverted modules are known to make -- six write sites for
# ``role_overrides``, display-name edits in the admin user card, module grants,
# and the consent record -- and nothing else. Anything else is left alone, so a
# module that merely read a collection and handed the dictionary back cannot
# rewrite the database by accident.


def _apply_role_overrides(session: Session, desired: Dict[str, Any]) -> None:
    """Reconcile the "one global role per user" map into ``role_assignments``."""
    if not isinstance(desired, dict):
        return
    current = _project_role_overrides(session)
    now = datetime.now(timezone.utc)

    for user_id, role_key in desired.items():
        role_key = str(role_key or "").strip()
        if not role_key or current.get(user_id) == role_key:
            continue
        if session.get(User, user_id) is None:
            continue
        _revoke_global_roles(session, user_id, now, reason="role changed via admin")
        session.add(
            RoleAssignment(
                user_id=user_id,
                role_key=role_key,
                scope_type="global",
                granted_by="legacy_state_bridge",
                granted_at=now,
            )
        )

    for user_id in set(current) - set(desired):
        _revoke_global_roles(session, user_id, now, reason="role cleared via admin")


def _revoke_global_roles(
    session: Session, user_id: str, now: datetime, *, reason: str
) -> None:
    statement = select(RoleAssignment).where(
        RoleAssignment.user_id == user_id,
        RoleAssignment.scope_type == "global",
        RoleAssignment.revoked_at.is_(None),
    )
    for row in session.execute(statement).scalars().all():
        row.revoked_at = now
        row.revoked_reason = reason


def _apply_users(session: Session, desired: Dict[str, Any]) -> None:
    """Only the profile fields the admin card can edit."""
    if not isinstance(desired, dict):
        return
    for user_id, record in desired.items():
        if not isinstance(record, dict):
            continue
        user = session.get(User, user_id)
        if user is None:
            continue
        display_name = record.get("displayName")
        if display_name is not None and str(display_name).strip() != (user.display_name or ""):
            user.display_name = str(display_name).strip() or None
            user.updated_at = datetime.now(timezone.utc)


def _apply_entitlements(session: Session, desired: Dict[str, Any]) -> None:
    """Grant modules and plans that appeared, and update the AI quota.

    Removal is deliberately not mirrored: entitlement items name the grant they
    came from, and dropping a value out of a legacy list says nothing about
    whether the underlying licence was revoked. Revocation goes through the
    grant, which is a separate and auditable operation.
    """
    if not isinstance(desired, dict):
        return
    current = _project_entitlements(session)
    for user_id, record in desired.items():
        if not isinstance(record, dict) or session.get(User, user_id) is None:
            continue
        existing = current.get(user_id, {"plans": [], "modules": [], "ai_quota_left": None})
        for kind, key in (("plan", "plans"), ("module", "modules")):
            added = sorted(set(record.get(key) or []) - set(existing.get(key) or []))
            for value in added:
                session.add(
                    UserEntitlementItem(
                        user_id=user_id, kind=kind, value=str(value), source="manual"
                    )
                )
        quota = record.get("ai_quota_left")
        if quota is not None and int(quota) != existing.get("ai_quota_left"):
            row = session.get(UserEntitlement, user_id)
            if row is None:
                session.add(
                    UserEntitlement(user_id=user_id, ai_quota_left=max(0, int(quota)))
                )
            else:
                row.ai_quota_left = max(0, int(quota))
                row.updated_at = datetime.now(timezone.utc)


def _apply_consents(session: Session, desired: Dict[str, Any]) -> None:
    if not isinstance(desired, dict):
        return
    current = _project_consents(session)
    for user_id, record in desired.items():
        if not isinstance(record, dict) or session.get(User, user_id) is None:
            continue
        version = str(record.get("version") or "").strip()
        if not version or current.get(user_id, {}).get("version") == version:
            continue
        session.add(
            Consent(
                user_id=user_id,
                consent_type="terms",
                document_version=version,
                accepted_at=datetime.now(timezone.utc),
                subject_role=str(record.get("role") or "").strip() or None,
                evidence={"source": "legacy_state_bridge"},
            )
        )


_APPLIERS = {
    "role_overrides": _apply_role_overrides,
    "users": _apply_users,
    "entitlements": _apply_entitlements,
    "consents": _apply_consents,
}


def write_state(state: Dict[str, Any], session: Optional[Session] = None) -> None:
    """Persist a legacy state dictionary.

    Collections that have not moved go to the file. Collections that have moved
    are applied to the database through :data:`_APPLIERS`; the file never
    receives them, so the two can never disagree about who owns a fact.
    """
    on_disk = _read_file()
    for key, value in state.items():
        if key in DB_OWNED_COLLECTIONS:
            continue
        on_disk[key] = value
    for name in DB_OWNED_COLLECTIONS:
        on_disk.pop(name, None)

    owns_session = session is None
    session = session or SessionLocal()
    try:
        for name, applier in _APPLIERS.items():
            if name in state:
                applier(session, state[name])
        if owns_session:
            session.commit()
    except Exception:
        if owns_session:
            session.rollback()
        raise
    finally:
        if owns_session:
            session.close()

    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = STATE_PATH.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(on_disk, ensure_ascii=False, indent=2), encoding="utf-8")
    # Atomic replace: the previous code truncated the live file and then wrote
    # into it, so a crash mid-write left every account unreadable.
    tmp_path.replace(STATE_PATH)
