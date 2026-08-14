"""Identity, sessions, devices and event ingestion -- backed by PostgreSQL.

What changed and why
--------------------
Every function here used to begin with ``state = _read_state()`` and end with
``_write_state(state)``: the whole of ``backend/data/user_state.json`` was read
into memory, mutated, and written back. That had four consequences that no
amount of care in the calling code could fix.

*No transactions.* "Verify the code, create the account, grant the free plan,
issue the session, write the audit entry" is one fact about the world. With a
single write at the end of the function, a crash before it lost all five and a
crash during it published a truncated file -- the write was a truncate-then-
write on the live path, not an atomic replace.

*No constraints.* Two accounts could hold the same login, a session could point
at a user that had been deleted, and a consent could name a role that does not
exist. Each of those was found in the production file.

*Lost updates.* Two concurrent requests both read the file, both mutated their
own copy, and the second write silently discarded the first. Under a class of
thirty pupils logging in at the same minute this is not theoretical.

*Unbounded scans.* Finding a session by refresh token meant iterating a
thousand-entry dictionary; finding a reset code meant iterating every code ever
issued. Both are now indexed lookups.

The public API is unchanged on purpose. Endpoints, the admin service and the
existing test-suite call these functions by name and depend on the exact shape
of the dictionaries they return, so the conversion is invisible above this line.

``_read_state`` and ``_write_state`` remain exported for the modules that have
not been converted yet -- see ``app/services/legacy_state_bridge.py``, which
serves them the database-owned collections out of the database and keeps only
the rest in the file.
"""

from __future__ import annotations

import hashlib
import re
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterator, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.passwords import verify_password
from app.db.session import SessionLocal
from app.models.identity import (
    RefreshToken,
    Role,
    User,
    UserCredential,
    UserIdentifier,
    UserSession,
)
from app.models.school import AccessGrant
from app.repositories.auth import (
    DEFAULT_AI_QUOTA,
    DEFAULT_MODULES,
    DEFAULT_PLANS,
    AppStateRepository,
    AttemptRepository,
    CredentialRepository,
    DeviceRepository,
    EntitlementWriteRepository,
    OtpRepository,
    PasswordResetRepository,
    attach_identifier,
    ensure_user,
)
from app.repositories.events import (
    LearningEventRepository,
    LiveSessionRepository,
    TelemetryRepository,
)
from app.repositories.identity import (
    AuditRepository,
    ConsentRepository,
    EntitlementRepository,
    RoleRepository,
    SessionRepository,
    UserRepository,
)
from app.services.auth_tokens import build_access_token, decode_token
from app.services.legacy_state_bridge import read_state as _bridge_read_state
from app.services.legacy_state_bridge import write_state as _bridge_write_state
from app.services.sms_provider import send_otp_sms

try:
    from app.services.pg_school_store import sync_school_domain_from_state
except Exception:  # pragma: no cover - optional module

    def sync_school_domain_from_state(state: Dict[str, Any]) -> None:
        return None


# Kept as module-level names because the test-suite and the ops scripts import
# them. The file itself is no longer written by anything in this module.
from app.services.legacy_state_bridge import STATE_PATH  # noqa: E402,F401

_users = UserRepository()
_roles = RoleRepository()
_sessions = SessionRepository()
_consents = ConsentRepository()
_entitlements = EntitlementRepository()
_entitlement_writes = EntitlementWriteRepository()
_audit = AuditRepository()
_otp = OtpRepository()
_attempts = AttemptRepository()
_credentials = CredentialRepository()
_resets = PasswordResetRepository()
_devices = DeviceRepository()
_app_state = AppStateRepository()
_telemetry = TelemetryRepository()
_learning = LearningEventRepository()
_live = LiveSessionRepository()


# --------------------------------------------------------------------------- #
# Small helpers, unchanged in behaviour
# --------------------------------------------------------------------------- #


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.isoformat()


def _norm_phone(phone: str) -> str:
    plus = str(phone or "").strip().startswith("+")
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if not digits:
        return ""
    return f"+{digits}" if plus else digits


def _sha256(value: str) -> str:
    return hashlib.sha256(str(value or "").encode("utf-8")).hexdigest()


def _norm_login(login: str) -> str:
    return str(login or "").strip().lower()


def _validate_login(login: str) -> str:
    normalized = _norm_login(login)
    if not re.fullmatch(r"[a-z0-9_-]{4,32}", normalized):
        raise ValueError("Логин должен содержать 4-32 символа: латинские буквы, цифры, _ или -")
    return normalized


def _validate_password(password: str) -> str:
    raw = str(password or "")
    if len(raw) < 8 or not re.search(r"[A-Za-zА-Яа-я]", raw) or not re.search(r"\d", raw):
        raise ValueError("Пароль должен быть не короче 8 символов и содержать буквы и цифры")
    return raw


def _gen_token(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(32)}"


def _default_entitlements() -> Dict[str, Any]:
    return {
        "plans": list(DEFAULT_PLANS),
        "modules": list(DEFAULT_MODULES),
        "ai_quota_left": DEFAULT_AI_QUOTA,
    }


@contextmanager
def _tx() -> Iterator[Session]:
    """One unit of work. Commits on success, rolls back on any exception."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _fail(session: Session, error: ValueError) -> ValueError:
    """Commit what has been recorded about a failure, then hand back the error.

    Rate limiting and the audit trail are the two things that must survive a
    rejected request, and ``_tx`` rolls back on the exception that rejects it.
    Without this, five wrong passwords recorded five rows and rolled back all
    five, and the lockout never fired -- which the security contract test
    caught. Committing here and raising afterwards keeps the bookkeeping while
    still refusing the request.
    """
    session.commit()
    return error


# Compatibility shims for the modules that still speak the legacy dictionary.
def _read_state() -> Dict[str, Any]:
    return _bridge_read_state()


def _write_state(state: Dict[str, Any]) -> None:
    _bridge_write_state(state)


# --------------------------------------------------------------------------- #
# Rate limiting
# --------------------------------------------------------------------------- #

_ATTEMPT_LIMIT = 5
_ATTEMPT_WINDOW_SEC = 900
_ATTEMPT_LOCK_MIN = 15


def _guard_attempts(session: Session, kind: str, value: str) -> str:
    """Raise if the key is locked out. Returns the attempt key for later use."""
    key = _attempts.key(kind, value)
    if _attempts.locked_until(session, key) is not None:
        raise ValueError("Слишком много попыток. Попробуйте позже.")
    return key


def _register_failure(session: Session, key: str, kind: str, *, user_id: str | None = None) -> None:
    _attempts.record(session, attempt_key=key, kind=kind, result="failed", user_id=user_id)
    failures = _attempts.failures_in_window(session, key, _ATTEMPT_WINDOW_SEC)
    if failures >= _ATTEMPT_LIMIT:
        _attempts.lock(
            session,
            key,
            until=_now() + timedelta(minutes=_ATTEMPT_LOCK_MIN),
            reason=f"{failures} failed attempts",
        )


def _register_success(session: Session, key: str, kind: str, user_id: str | None = None) -> None:
    _attempts.record(session, attempt_key=key, kind=kind, result="ok", user_id=user_id)
    _attempts.clear_lock(session, key)


# --------------------------------------------------------------------------- #
# Roles and sessions
# --------------------------------------------------------------------------- #


def _effective_role(session: Session, user_id: str, fallback: str | None = None) -> str:
    return _roles.effective_role(session, user_id) or (fallback or "student")


def _known_role(session: Session, role_key: str | None) -> Optional[str]:
    """``user_sessions.role_key`` is a foreign key; an unknown role must be NULL.

    The legacy store wrote whatever string it was handed, which is how sessions
    ended up carrying roles that had never existed.
    """
    if not role_key:
        return None
    return session.get(Role, role_key).role_key if session.get(Role, role_key) else None


# The legacy store resolved a user's role as "role_overrides, then the role on
# the consent, then student" -- two layers, where an administrator's decision
# outranked whatever the client last consented to. One global role assignment
# collapses both layers into one row, so the layer is recorded in ``granted_by``
# instead: an assignment made by the consent flow may be replaced by the consent
# flow, and one made by an administrator may not.
_CONSENT_GRANTORS = frozenset({"consent"})


def _set_global_role(
    session: Session,
    user_id: str,
    role_key: str | None,
    *,
    granted_by: str,
    yield_to_override: bool = False,
) -> Optional[str]:
    """Make ``role_key`` the account's single global role.

    Returns the role in force afterwards, or ``None`` when the requested role is
    not registered -- an unregistered role is refused rather than written,
    because ``role_assignments.role_key`` is a foreign key and the JSON store's
    habit of accepting any string is how roles that never existed ended up on
    live accounts.

    With ``yield_to_override`` the call is a no-op whenever the account already
    holds a role granted by someone other than the consent flow. That is what
    keeps ``POST /admin/bootstrap-owner`` from being undone by the next consent.
    """
    from app.models.identity import RoleAssignment

    normalized = str(role_key or "").strip().lower()
    if not normalized or session.get(Role, normalized) is None:
        return _roles.effective_role(session, user_id)

    statement = select(RoleAssignment).where(
        RoleAssignment.user_id == user_id,
        RoleAssignment.scope_type == "global",
        RoleAssignment.revoked_at.is_(None),
    )
    existing = session.execute(statement).scalars().all()

    if yield_to_override and any(
        (row.granted_by or "") not in _CONSENT_GRANTORS for row in existing
    ):
        return _roles.effective_role(session, user_id)

    if _roles.effective_role(session, user_id) == normalized:
        return normalized

    for row in existing:
        row.revoked_at = _now()
        row.revoked_reason = f"replaced by {granted_by}"
    session.add(
        RoleAssignment(
            user_id=user_id,
            role_key=normalized,
            scope_type="global",
            granted_by=granted_by,
        )
    )
    return normalized


def _create_session(state: Any, user_id: str, role: str | None = None) -> Dict[str, str]:
    """Issue an access/refresh pair.

    ``state`` is ignored and kept only because ``admin_panel_service`` calls
    this with the legacy dictionary as the first argument.
    """
    with _tx() as session:
        return _create_session_tx(session, user_id=user_id, role=role)


def _create_session_tx(
    session: Session, *, user_id: str, role: str | None = None, device_id: str | None = None
) -> Dict[str, str]:
    normalized_role = role or "student"
    refresh_expires_at = _now() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    session_id = secrets.token_hex(16)
    access_token, access_expires_at, access_jti = build_access_token(
        user_id=user_id,
        role=normalized_role,
        session_id=session_id,
    )
    refresh_token = _gen_token("ref")

    _sessions.create(
        session,
        session_id=session_id,
        user_id=user_id,
        role_key=_known_role(session, normalized_role),
        access_jti=access_jti,
        access_expires_at=datetime.fromisoformat(access_expires_at),
        expires_at=refresh_expires_at,
        refresh_token=refresh_token,
        device_id=device_id,
    )

    return {
        "accessToken": access_token,
        "accessTokenExpiresAt": access_expires_at,
        "refreshToken": refresh_token,
        "refreshTokenExpiresAt": refresh_expires_at.isoformat(),
    }


# --------------------------------------------------------------------------- #
# Phone login
# --------------------------------------------------------------------------- #


def request_phone_code(phone: str) -> Dict[str, Any]:
    normalized = _norm_phone(phone)
    if not normalized:
        raise ValueError("Phone is required")

    with _tx() as session:
        requested = _otp.requests_in_window(session, normalized, settings.OTP_REQUEST_WINDOW_SEC)
        if requested >= settings.OTP_REQUEST_LIMIT:
            raise ValueError("Too many OTP requests. Try later.")

        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = _now() + timedelta(minutes=settings.OTP_TTL_MIN)
        _otp.issue(session, normalized, code=code, expires_at=expires_at)
        _attempts.record(
            session,
            attempt_key=f"otp_request:{_sha256(normalized)}",
            kind="otp_request",
            result="ok",
        )
        sms_result = send_otp_sms(normalized, code)

    out: Dict[str, Any] = {"phone": normalized, "expiresAt": expires_at.isoformat()}
    if settings.ENV.lower() == "dev":
        out["debugCode"] = code
    out["smsStatus"] = sms_result.get("status", "unknown")
    return out


def verify_phone_code(
    phone: str,
    code: str,
    local_user_id: Optional[str] = None,
    local_purchases: Optional[List[str]] = None,
    local_content_versions: Optional[Dict[str, str]] = None,
    local_preferences: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    normalized = _norm_phone(phone)

    with _tx() as session:
        challenge = _otp.get(session, normalized)
        if challenge is None:
            raise ValueError("OTP not requested")

        if challenge.locked_until and _now() < challenge.locked_until:
            raise ValueError("OTP temporarily locked due to too many attempts")

        if _now() > challenge.expires_at:
            _otp.clear(session, normalized)
            raise _fail(session, ValueError("OTP expired"))

        if _sha256(str(code)) != challenge.code_hash:
            _otp.register_failure(
                session,
                normalized,
                max_attempts=settings.OTP_MAX_VERIFY_ATTEMPTS,
                lock_minutes=settings.OTP_LOCK_MIN,
            )
            _attempts.record(
                session,
                attempt_key=f"otp_verify:{_sha256(normalized)}",
                kind="otp_verify",
                result="failed",
            )
            raise _fail(session, ValueError("Invalid OTP"))

        # --- the account itself ------------------------------------------- #
        existing = _users.find_by_identifier(session, "phone", normalized)
        if existing is not None:
            user_id = existing.user_id
        else:
            user_id = f"u_{secrets.token_hex(6)}"
            ensure_user(session, user_id)
            attach_identifier(
                session,
                user_id=user_id,
                kind="phone",
                value=normalized,
                value_normalized=normalized,
                is_primary=True,
                verified=True,
            )

        _entitlement_writes.ensure_defaults(session, user_id)
        _merge_local_account(
            session,
            canonical_user=user_id,
            local_user=local_user_id,
            purchases=local_purchases or [],
            content_versions=local_content_versions or {},
            preferences=local_preferences or {},
        )

        requested_role = None
        if isinstance(local_preferences, dict):
            requested_role = local_preferences.get("role")
        role = _effective_role(session, user_id, fallback=requested_role)

        tokens = _create_session_tx(session, user_id=user_id, role=role)
        _users.touch_last_login(session, user_id)
        _otp.clear(session, normalized)
        _register_success(session, f"otp_verify:{_sha256(normalized)}", "otp_verify", user_id)
        _audit.record(session, action="login_phone", actor_user_id=user_id, actor_role=role)

        return {"userId": user_id, "phone": normalized, **tokens}


def _merge_local_account(
    session: Session,
    *,
    canonical_user: str,
    local_user: Optional[str],
    purchases: List[str],
    content_versions: Dict[str, str],
    preferences: Dict[str, Any],
) -> None:
    """Fold a device-local anonymous account into the account that just signed in."""
    _entitlement_writes.grant_modules(session, canonical_user, purchases, source="legacy")
    _app_state.merge(
        session,
        user_id=canonical_user,
        content_versions=content_versions or {},
        preferences=preferences or {},
    )

    if not local_user or local_user == canonical_user:
        return
    if session.get(User, local_user) is None:
        return

    _entitlement_writes.move_items(session, from_user_id=local_user, to_user_id=canonical_user)
    local_state = _app_state.get(session, local_user)
    if local_state is not None:
        _app_state.merge(
            session,
            user_id=canonical_user,
            content_versions=dict(local_state.content_versions or {}),
            preferences=dict(local_state.preferences or {}),
        )
        session.delete(local_state)


# --------------------------------------------------------------------------- #
# Login and password
# --------------------------------------------------------------------------- #


def attach_login_password(
    state: Any,
    user_id: str,
    login: str,
    password: str,
    display_name: str | None = None,
) -> Dict[str, Any]:
    """Set (or replace) the login and password of an existing account.

    ``state`` is ignored; the signature is preserved because
    ``admin_panel_service`` still calls this with the legacy dictionary.
    """
    normalized_login = _validate_login(login)
    raw_password = _validate_password(password)

    with _tx() as session:
        user = session.get(User, user_id)
        if user is None:
            raise ValueError("Пользователь не найден")

        attach_identifier(
            session,
            user_id=user_id,
            kind="login",
            value=normalized_login,
            value_normalized=normalized_login,
            is_primary=True,
            verified=True,
        )
        _credentials.set_password(session, user_id, raw_password)
        if display_name:
            user.display_name = str(display_name).strip()
        user.updated_at = _now()
        _audit.record(
            session,
            action="set_login_password",
            actor_user_id=user_id,
            object_type="user",
            object_id=user_id,
            details={"loginHash": _sha256(normalized_login)},
        )
        return {"userId": user_id, "login": normalized_login}


def login_with_password(login: str, password: str) -> Dict[str, Any]:
    normalized_login = _norm_login(login)
    generic_error = "Неверный логин или пароль"

    with _tx() as session:
        key = _guard_attempts(session, "password_login", normalized_login)
        user = _users.find_by_identifier(session, "login", normalized_login)

        if user is None or user.status != "active" or not _credentials.verify(
            session, user.user_id, str(password or "")
        ):
            _register_failure(
                session, key, "password_login", user_id=user.user_id if user else None
            )
            _audit.record(
                session,
                action="login_password",
                actor_user_id=user.user_id if user else None,
                result="failed",
                details={"loginHash": _sha256(normalized_login)},
            )
            raise _fail(session, ValueError(generic_error))

        role = _effective_role(session, user.user_id)
        tokens = _create_session_tx(session, user_id=user.user_id, role=role)
        _users.touch_last_login(session, user.user_id)
        _register_success(session, key, "password_login", user.user_id)
        _audit.record(
            session,
            action="login_password",
            actor_user_id=user.user_id,
            actor_role=role,
            details={"loginHash": _sha256(normalized_login)},
        )
        return {"userId": user.user_id, "login": normalized_login, "role": role, **tokens}


def create_password_reset_code(user_id: str, changed_by: str, ttl_hours: int = 72) -> Dict[str, Any]:
    with _tx() as session:
        if session.get(User, user_id) is None:
            raise ValueError("Пользователь не найден")
        code = f"PWR-{secrets.randbelow(1000000):06d}"
        record = _resets.issue(
            session, user_id=user_id, code=code, ttl_hours=ttl_hours, created_by=changed_by
        )
        _audit.record(
            session,
            action="create_password_reset_code",
            actor_user_id=changed_by,
            object_type="user",
            object_id=user_id,
            details={"resetId": record.reset_id},
        )
        return {"userId": user_id, "resetCode": code, "expiresAt": _iso(record.expires_at)}


def reset_password_by_code(code: str, login: str, password: str) -> Dict[str, Any]:
    normalized_login = _validate_login(login)
    raw_password = _validate_password(password)
    invalid = "Код восстановления недействителен"

    with _tx() as session:
        user = _users.find_by_identifier(session, "login", normalized_login)
        if user is None:
            _audit.record(
                session,
                action="reset_password_by_code",
                result="failed",
                details={"loginHash": _sha256(normalized_login)},
            )
            raise _fail(session, ValueError(invalid))

        record = _resets.find_pending(session, code)
        if record is None or record.user_id != user.user_id:
            _audit.record(
                session,
                action="reset_password_by_code",
                actor_user_id=user.user_id,
                result="failed",
            )
            raise _fail(session, ValueError(invalid))

        expires_at = record.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if _now() > expires_at:
            _resets.mark_expired(session, record)
            _audit.record(
                session,
                action="reset_password_by_code",
                actor_user_id=user.user_id,
                result="failed",
                details={"reason": "expired"},
            )
            raise _fail(session, ValueError("Срок действия кода восстановления истёк"))

        _credentials.set_password(session, user.user_id, raw_password)
        _resets.mark_used(session, record)
        # Everything issued before the password changed is no longer trusted.
        _sessions.revoke_all_for_user(session, user.user_id, reason="password reset")

        role = _effective_role(session, user.user_id)
        tokens = _create_session_tx(session, user_id=user.user_id, role=role)
        _audit.record(
            session, action="reset_password_by_code", actor_user_id=user.user_id, actor_role=role
        )
        return {"userId": user.user_id, "login": normalized_login, "role": role, **tokens}


def change_password(user_id: str, current_password: str, new_password: str) -> Dict[str, Any]:
    with _tx() as session:
        user = session.get(User, user_id)
        if user is None or not _credentials.verify(session, user_id, str(current_password or "")):
            _audit.record(
                session, action="change_password", actor_user_id=user_id, result="failed"
            )
            raise _fail(session, ValueError("Неверный текущий пароль"))
        _credentials.set_password(session, user_id, _validate_password(new_password))
        _audit.record(session, action="change_password", actor_user_id=user_id)
        return {"ok": True, "userId": user_id}


# --------------------------------------------------------------------------- #
# Sessions
# --------------------------------------------------------------------------- #


def refresh_session(refresh_token: str) -> Dict[str, str]:
    with _tx() as session:
        token = _sessions.find_by_refresh_token(session, refresh_token)
        if token is None:
            raise ValueError("Session not found")

        record = session.get(UserSession, token.session_id)
        if record is None:
            raise ValueError("Session not found")
        if record.revoked or token.revoked_at is not None:
            raise ValueError("Session revoked")

        expires_at = token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if _now() > expires_at:
            _sessions.revoke(session, record.session_id, reason="refresh token expired")
            raise ValueError("Refresh token expired")

        # Presenting a token that already has a successor means the chain
        # forked: the whole session dies rather than the request merely failing.
        if token.used_at is not None or token.replaced_by_token_id is not None:
            _sessions.revoke(session, record.session_id, reason="refresh token replay")
            _audit.record(
                session,
                action="refresh_replay_detected",
                actor_user_id=record.user_id,
                result="denied",
                denied_link="session",
            )
            raise ValueError("Session revoked")

        role = _effective_role(session, record.user_id, fallback=record.role_key)
        _sessions.revoke(session, record.session_id, reason="rotated")
        return _create_session_tx(
            session, user_id=record.user_id, role=role, device_id=record.device_id
        )


def revoke_session(refresh_token: str) -> None:
    with _tx() as session:
        token = _sessions.find_by_refresh_token(session, refresh_token)
        if token is None:
            return
        _sessions.revoke(session, token.session_id, reason="logout")


def revoke_all_sessions(
    *, changed_by: str = "system", reason: str = "maintenance", user_id: str | None = None
) -> Dict[str, Any]:
    normalized_user_id = str(user_id or "").strip()
    with _tx() as session:
        if normalized_user_id:
            revoked = _sessions.revoke_all_for_user(session, normalized_user_id, reason=reason)
        else:
            statement = select(UserSession).where(UserSession.revoked.is_(False))
            revoked = 0
            for record in session.execute(statement).scalars().all():
                _sessions.revoke(session, record.session_id, reason=reason)
                revoked += 1

        at = _now_iso()
        _audit.record(
            session,
            action="user_session_revoke_all" if normalized_user_id else "global_session_revoke_all",
            actor_user_id=changed_by,
            object_type="user" if normalized_user_id else None,
            object_id=normalized_user_id or None,
            details={"reason": reason, "revokedCount": revoked},
        )
        return {
            "ok": True,
            "at": at,
            "changedBy": str(changed_by or "system"),
            "reason": str(reason or "maintenance"),
            "userId": normalized_user_id or None,
            "revokedCount": revoked,
        }


def resolve_access_token(access_token: str) -> Dict[str, Any]:
    """Validate a bearer token against the session it claims to belong to.

    This is the hot path -- every authenticated request goes through it -- and
    it is now two indexed lookups instead of a full read of the state file.
    """
    try:
        payload = decode_token(access_token)
    except Exception as error:
        raise ValueError("Invalid access token") from error

    if str(payload.get("type") or "") != "access":
        raise ValueError("Invalid token type")

    user_id = str(payload.get("sub") or "")
    session_id = str(payload.get("sid") or "")
    access_jti = str(payload.get("jti") or "")
    if not user_id or not session_id or not access_jti:
        raise ValueError("Invalid access token claims")

    session = SessionLocal()
    try:
        record = session.get(UserSession, session_id)
        if record is None:
            raise ValueError("Session not found")
        if record.revoked:
            raise ValueError("Session revoked")
        if record.user_id != user_id:
            raise ValueError("Session user mismatch")
        if (record.access_jti or "") != access_jti:
            raise ValueError("Session token mismatch")

        access_expires_at = record.access_expires_at
        if access_expires_at is None:
            raise ValueError("Access token expired")
        if access_expires_at.tzinfo is None:
            access_expires_at = access_expires_at.replace(tzinfo=timezone.utc)
        if _now() > access_expires_at:
            raise ValueError("Access token expired")

        effective_role = _effective_role(
            session, user_id, fallback=payload.get("role") or record.role_key
        )
        return {
            "jti": access_jti,
            "sid": session_id,
            "userId": user_id,
            "role": effective_role,
            "accessExpiresAt": _iso(access_expires_at),
        }
    finally:
        session.close()


# --------------------------------------------------------------------------- #
# Devices
# --------------------------------------------------------------------------- #


def _device_limit_for_role(role: str | None) -> int:
    normalized = str(role or "student").strip().lower() or "student"
    limits = {
        "student": 3,
        "learner": 3,
        "parent": 3,
        "teacher": 5,
        "homeroom_teacher": 5,
        "school_admin": 5,
        "content_editor": 5,
        "support": 5,
        "admin": 5,
        "owner": 10,
    }
    return int(limits.get(normalized, 3))


def _device_item(row) -> Dict[str, Any]:
    return {
        "deviceId": row.device_id,
        "label": row.label,
        "platform": row.platform,
        "active": bool(row.active),
        "trustedAt": _iso(row.trusted_at),
        "lastSeenAt": _iso(row.last_seen_at),
        "revokedAt": _iso(row.revoked_at),
    }


def list_user_devices(user_id: str) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        role = _effective_role(session, user_id)
        items = [_device_item(row) for row in _devices.list_for_user(session, user_id)]
        return {"userId": user_id, "limit": _device_limit_for_role(role), "items": items}
    finally:
        session.close()


def register_user_device(
    user_id: str,
    role: str | None,
    device_id: str,
    label: str | None,
    platform: str | None,
    session_id: str | None = None,
) -> Dict[str, Any]:
    normalized_device_id = str(device_id or "").strip()
    if not normalized_device_id:
        raise ValueError("deviceId обязателен")

    with _tx() as session:
        if session.get(User, user_id) is None:
            raise ValueError("Пользователь не найден")

        existing = _devices.get(session, user_id, normalized_device_id)
        if existing is None and _devices.active_count(session, user_id) >= _device_limit_for_role(
            role
        ):
            raise ValueError("Достигнут лимит устройств")

        row = _devices.upsert(
            session,
            user_id=user_id,
            device_id=normalized_device_id,
            label=str(label or "").strip() or "Устройство",
            platform=str(platform or "").strip() or None,
        )

        if session_id:
            user_session = session.get(UserSession, session_id)
            if (
                user_session is not None
                and user_session.user_id == user_id
                and not user_session.revoked
            ):
                user_session.device_id = normalized_device_id

        _audit.record(
            session,
            action="device_register",
            actor_user_id=user_id,
            object_type="device",
            object_id=_sha256(normalized_device_id),
            details={"platform": platform},
        )
        item = _device_item(row)

    return {**item, "limit": _device_limit_for_role(role)}


def revoke_user_device(user_id: str, device_id: str) -> Dict[str, Any]:
    with _tx() as session:
        if not _devices.revoke(session, user_id, device_id):
            raise ValueError("Устройство не найдено")
        statement = select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.device_id == device_id,
            UserSession.revoked.is_(False),
        )
        for record in session.execute(statement).scalars().all():
            _sessions.revoke(session, record.session_id, reason="device revoked")
        _audit.record(
            session,
            action="device_revoke",
            actor_user_id=user_id,
            object_type="device",
            object_id=_sha256(str(device_id or "")),
        )
        return {"ok": True, "userId": user_id, "deviceId": device_id}


def reset_user_devices(
    user_id: str, changed_by: str, school_id: str | None = None, class_id: str | None = None
) -> Dict[str, Any]:
    with _tx() as session:
        if session.get(User, user_id) is None:
            raise ValueError("Пользователь не найден")

        reset_count = _devices.revoke_all(session, user_id)
        _sessions.revoke_all_for_user(session, user_id, reason="device reset")

        # Six random digits from the CSPRNG. The previous implementation used
        # ``abs(hash((...))) % 1000000``, which is neither uniform nor
        # unpredictable -- and under PYTHONHASHSEED it is not even stable.
        code = f"RST-{secrets.randbelow(1000000):06d}"
        record = _devices.issue_recovery_code(
            session,
            code=code,
            user_id=user_id,
            school_id=school_id,
            class_id=class_id,
            created_by=changed_by,
        )
        _audit.record(
            session,
            action="device_reset",
            actor_user_id=changed_by,
            object_type="user",
            object_id=user_id,
            school_id=school_id,
            class_id=class_id,
            details={"resetDevices": reset_count},
        )
        return {
            "ok": True,
            "userId": user_id,
            "resetDevices": reset_count,
            "recoveryCode": code,
            "expiresAt": _iso(record.expires_at),
        }


def activate_device_recovery_code(
    code: str, phone: str, display_name: str | None = None
) -> Dict[str, Any]:
    normalized_code = str(code or "").strip().upper()
    if not normalized_code:
        raise ValueError("Код восстановления обязателен")
    normalized_phone = _norm_phone(phone)
    if not normalized_phone:
        raise ValueError("Телефон обязателен")

    with _tx() as session:
        key = _guard_attempts(session, "device_recovery", normalized_phone)
        record = _devices.find_recovery_code(session, normalized_code)
        if record is None:
            _register_failure(session, key, "device_recovery")
            raise _fail(session, ValueError("Код восстановления не найден"))
        if str(record.status or "pending") != "pending":
            raise ValueError("Код восстановления уже использован")

        expires_at = record.expires_at
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at is not None and _now() > expires_at:
            record.status = "expired"
            raise _fail(session, ValueError("Срок действия кода восстановления истёк"))

        user_id = str(record.user_id or "").strip()
        if not user_id:
            raise ValueError("Код восстановления поврежден")

        user = session.get(User, user_id)
        if user is None:
            raise ValueError("Код восстановления поврежден")

        attach_identifier(
            session,
            user_id=user_id,
            kind="phone",
            value=normalized_phone,
            value_normalized=normalized_phone,
            is_primary=True,
            verified=True,
        )
        if display_name:
            user.display_name = str(display_name).strip()

        role = _effective_role(session, user_id)
        tokens = _create_session_tx(session, user_id=user_id, role=role)
        record.status = "used"
        record.used_at = _now()
        _register_success(session, key, "device_recovery", user_id)
        _audit.record(session, action="device_recovery_activate", actor_user_id=user_id)
        return {"userId": user_id, "phone": normalized_phone, "role": role, **tokens}


# --------------------------------------------------------------------------- #
# Consents, entitlements, client state
# --------------------------------------------------------------------------- #


def save_consent(
    user_id: str, role: str, version: str, accepted_at: Optional[str], parent_approved: bool
) -> Dict[str, Any]:
    with _tx() as session:
        ensure_user(session, user_id)
        moment = _now()
        if accepted_at:
            try:
                moment = datetime.fromisoformat(str(accepted_at).replace("Z", "+00:00"))
            except ValueError:
                moment = _now()
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)

        if not _consents.has_accepted(session, user_id, "terms", version):
            _consents.record(
                session,
                user_id=user_id,
                consent_type="terms",
                document_version=version,
                accepted_at=moment,
                subject_role=role,
            )
        if parent_approved and not _consents.has_accepted(
            session, user_id, "parent_approval", version
        ):
            _consents.record(
                session,
                user_id=user_id,
                consent_type="parent_approval",
                document_version=version,
                accepted_at=moment,
                subject_role=role,
            )

        # The legacy store treated the role recorded on the consent as the
        # user's role, and re-consenting with a different role changed it. That
        # behaviour is preserved verbatim -- it is what the cabinet flow and the
        # existing contract tests depend on -- but it is now an explicit
        # assignment, so "why does this account have this role" has a row for an
        # answer instead of a guess.
        #
        # SECURITY NOTE, raised for the owner rather than changed unilaterally:
        # POST /users/consents/accept takes userId and role in the body and is
        # not authenticated, so this path lets a caller pick their own role.
        # Fixing it changes authentication behaviour, which §14 of the delivery
        # contract reserves for an explicit decision.
        _set_global_role(
            session, user_id, role, granted_by="consent", yield_to_override=True
        )

        _entitlement_writes.ensure_defaults(session, user_id)
        return {
            "userId": user_id,
            "role": role,
            "version": version,
            "acceptedAt": moment.isoformat(),
            "parentApproved": bool(parent_approved),
        }


def get_consent(user_id: str) -> Optional[Dict[str, Any]]:
    session = SessionLocal()
    try:
        terms = _consents.latest(session, user_id, "terms")
        if terms is None:
            return None
        parent = _consents.latest(session, user_id, "parent_approval")
        return {
            "userId": user_id,
            "role": terms.subject_role,
            "version": terms.document_version,
            "acceptedAt": _iso(terms.accepted_at),
            "parentApproved": parent is not None,
        }
    finally:
        session.close()


def get_entitlements(user_id: str) -> Dict[str, Any]:
    with _tx() as session:
        if session.get(User, user_id) is not None:
            _entitlement_writes.ensure_defaults(session, user_id)
            plans = sorted(_entitlements.plans(session, user_id))
            modules = sorted(_entitlements.modules(session, user_id))
            quota = _entitlement_writes.quota(session, user_id)
        else:
            # An unknown account gets the defaults as an answer but no row: a
            # read must not create an account.
            defaults = _default_entitlements()
            plans, modules, quota = (
                defaults["plans"],
                defaults["modules"],
                defaults["ai_quota_left"],
            )
        return {
            "userId": user_id,
            "plans": plans,
            "modules": modules,
            "aiQuotaLeft": quota,
        }


def save_device_sync(
    user_id: str,
    content_versions: Dict[str, str],
    purchases: List[str],
    preferences: Dict[str, Any],
) -> Dict[str, Any]:
    with _tx() as session:
        ensure_user(session, user_id)
        _entitlement_writes.ensure_defaults(session, user_id)
        _entitlement_writes.grant_modules(session, user_id, purchases or [], source="legacy")
        _app_state.upsert(
            session,
            user_id=user_id,
            content_versions=dict(content_versions or {}),
            preferences=dict(preferences or {}),
        )
        return {
            "userId": user_id,
            "contentVersions": dict(content_versions or {}),
            "purchases": list(purchases or []),
            "preferences": dict(preferences or {}),
        }


def get_device_sync(user_id: str) -> Dict[str, Any]:
    session = SessionLocal()
    try:
        record = _app_state.get(session, user_id)
        if record is not None:
            return {
                "userId": user_id,
                "contentVersions": dict(record.content_versions or {}),
                "purchases": sorted(_entitlements.modules(session, user_id)),
                "preferences": dict(record.preferences or {}),
            }
    finally:
        session.close()
    return {
        "userId": user_id,
        "contentVersions": {"chemistry_core": "v1"},
        "purchases": get_entitlements(user_id).get("modules", []),
        "preferences": {"theme": "midnight", "appMode": "standard"},
    }


# --------------------------------------------------------------------------- #
# Subject rights: export and erasure
# --------------------------------------------------------------------------- #


def export_user_data(user_id: str) -> Dict[str, Any]:
    """Everything the platform holds about one person, in one document.

    This is the technical mechanism behind the "право на доступ и переносимость"
    clause of the privacy policy. A policy that promises an export without an
    endpoint that produces one is a promise the product cannot keep.
    """
    with _tx() as session:
        user = session.get(User, user_id)
        if user is None:
            raise ValueError("Пользователь не найден")

        identifiers = _users.identifiers(session, user_id)
        credential = session.get(UserCredential, user_id)
        app_state = _app_state.get(session, user_id)
        consent = get_consent(user_id)

        payload = {
            "userId": user_id,
            "generatedAt": _now_iso(),
            "profile": {
                "userId": user_id,
                "displayName": user.display_name,
                "status": user.status,
                "createdAt": _iso(user.created_at),
                "lastLoginAt": _iso(user.last_login_at),
                "identifiers": [
                    {
                        "kind": row.kind,
                        "value": row.value,
                        "primary": bool(row.is_primary),
                        "verifiedAt": _iso(row.verified_at),
                    }
                    for row in identifiers
                ],
                # The hash is never exported. It is not the subject's personal
                # data in any useful sense and publishing it only helps an
                # attacker who already has the file.
                "hasPassword": credential is not None,
                "passwordUpdatedAt": _iso(credential.updated_at) if credential else None,
            },
            "consent": consent,
            "entitlements": get_entitlements(user_id),
            "deviceSync": {
                "contentVersions": dict(app_state.content_versions or {}) if app_state else {},
                "preferences": dict(app_state.preferences or {}) if app_state else {},
            },
            "devices": [_device_item(row) for row in _devices.list_for_user(session, user_id)],
            "accessGrants": [
                {
                    "grantId": row.grant_id,
                    "status": row.status,
                    "createdAt": _iso(row.created_at),
                    "expiresAt": _iso(row.expires_at),
                }
                for row in session.execute(
                    select(AccessGrant).where(AccessGrant.user_id == user_id)
                ).scalars().all()
            ],
            "sessions": [
                {
                    "sid": row.session_id,
                    "role": row.role_key,
                    "createdAt": _iso(row.created_at),
                    "expiresAt": _iso(row.expires_at),
                    "revoked": bool(row.revoked),
                    "deviceId": row.device_id,
                }
                for row in session.execute(
                    select(UserSession)
                    .where(UserSession.user_id == user_id)
                    .order_by(UserSession.created_at.desc())
                ).scalars().all()
            ],
            "learningEvents": [
                {
                    "lessonId": row.lesson_id,
                    "taskId": row.task_id,
                    "outcome": row.outcome,
                    "occurredAt": _iso(row.occurred_at or row.received_at),
                }
                for row in _learning.for_user(session, user_id)
            ],
        }
        _audit.record(session, action="user_data_export", actor_user_id=user_id)
        return payload


def delete_user_data(user_id: str) -> Dict[str, Any]:
    """Erase a person while keeping the account row as a tombstone.

    The row survives because ten other tables carry the id as a foreign key and
    because the school must still be able to see that a seat was occupied. What
    is erased is everything that identifies the person: identifiers, password,
    devices, preferences and display name. What remains is an id and the fact
    that it was deleted, which identifies nobody.
    """
    with _tx() as session:
        user = session.get(User, user_id)
        if user is None or user.status == "deleted":
            raise ValueError("Пользователь не найден")

        deleted_at = _now()
        identifier_hashes = []
        for identifier in list(_users.identifiers(session, user_id)):
            identifier_hashes.append(
                {"kind": identifier.kind, "hash": _sha256(identifier.value_normalized)}
            )
            session.delete(identifier)

        credential = session.get(UserCredential, user_id)
        if credential is not None:
            session.delete(credential)

        app_state = _app_state.get(session, user_id)
        if app_state is not None:
            session.delete(app_state)

        _devices.revoke_all(session, user_id)
        _sessions.revoke_all_for_user(session, user_id, reason="account deleted")

        user.status = "deleted"
        user.deleted_at = deleted_at
        user.display_name = None
        user.updated_at = deleted_at

        _audit.record(
            session,
            action="user_data_delete",
            actor_user_id=user_id,
            object_type="user",
            object_id=user_id,
            details={"identifiers": identifier_hashes},
        )
        return {"ok": True, "userId": user_id, "deletedAt": deleted_at.isoformat()}


# --------------------------------------------------------------------------- #
# Event ingestion
# --------------------------------------------------------------------------- #


def ingest_telemetry(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    with _tx() as session:
        accepted = _telemetry.ingest(session, events or [])
    return {"accepted": accepted, "receivedAt": _now_iso()}


def ingest_learning_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Store attempts and project the ones that belong to a running lesson.

    The projection is part of the same transaction as the attempt: a teacher's
    live board and the pupil's stored attempt cannot disagree about whether the
    answer arrived.
    """
    payloads = [event for event in (events or []) if isinstance(event, dict)]
    with _tx() as session:
        accepted, _duplicates = _learning.ingest(session, payloads)
        for event in payloads:
            _project_to_live_session(session, event)
    return {"accepted": accepted, "receivedAt": _now_iso()}


def _project_to_live_session(session: Session, event: Dict[str, Any]) -> None:
    session_id = str(event.get("sessionId") or "").strip()
    if not session_id:
        return
    live = _live.get_active(session, session_id)
    if live is None:
        return

    outcome = str(event.get("outcome") or "").strip().lower()
    if outcome not in {"correct", "wrong", "pending"}:
        return

    user_id = str(event.get("userId") or "unknown").strip() or "unknown"
    classroom = str(event.get("classroom") or "general").strip() or "general"

    _live.join(
        session,
        session_id=session_id,
        user_id=user_id,
        classroom=classroom,
        role_key=str(event.get("role") or "student"),
    )
    _live.record_event(
        session,
        session_id=session_id,
        student_user_id=user_id,
        outcome=outcome,
        task_id=str(event.get("taskId") or "unknown").strip() or "unknown",
        lesson_id=str(event.get("lessonId") or "general").strip() or "general",
        classroom=classroom,
        mistake_tag=str(event.get("mistakeTag") or "general_concept").strip()
        or "general_concept",
        source="learning_event",
    )


# --------------------------------------------------------------------------- #
# Account provisioning for the flows that do not start with a login
# --------------------------------------------------------------------------- #


def ensure_service_account(user_id: str, role: str, *, display_name: str | None = None) -> str:
    """Make sure a configuration-provisioned account exists, with its role.

    The admin console signs in against ``ADMIN_UI_LOGIN``/``ADMIN_UI_PASSWORD``
    from the environment and then acts as ``ADMIN_UI_USER_ID``. In the JSON
    store that id was conjured into the ``users`` map at first login and nothing
    ever checked it again. ``user_sessions.user_id`` is a foreign key now, so
    the account has to be real before a session can name it -- which is the
    point: an id that carries the owner role must be a row that can be audited,
    suspended and revoked like any other.

    Idempotent. Returns the role actually in force.
    """
    with _tx() as session:
        ensure_user(session, user_id, display_name=display_name)
        effective = _set_global_role(session, user_id, role, granted_by="service_account")
        if effective is None:
            raise ValueError(f"Роль {role} не зарегистрирована")
        return effective


def ensure_account_with_phone(
    user_id: str,
    phone: str,
    *,
    display_name: str | None = None,
    role: str | None = None,
) -> Dict[str, Any]:
    """Provision the account behind a school invitation code.

    A pupil who activates an invitation has never logged in, so the account is
    created here rather than by the OTP flow. Everything it needs to exist as a
    first-class account -- the row, the phone identifier, the free plan and the
    role the invitation carries -- is created in one transaction, because an
    invitation that half-activates leaves a pupil who cannot log in and a seat
    the school has already paid for.
    """
    normalized_phone = _norm_phone(phone)
    if not normalized_phone:
        raise ValueError("Телефон обязателен")

    with _tx() as session:
        existing = _users.find_by_identifier(session, "phone", normalized_phone)
        resolved_id = existing.user_id if existing is not None else str(user_id or "").strip()
        if not resolved_id:
            raise ValueError("Не удалось определить учётную запись")

        ensure_user(session, resolved_id, display_name=display_name)
        attach_identifier(
            session,
            user_id=resolved_id,
            kind="phone",
            value=normalized_phone,
            value_normalized=normalized_phone,
            is_primary=True,
            verified=True,
        )
        if display_name:
            session.get(User, resolved_id).display_name = str(display_name).strip()
        _entitlement_writes.ensure_defaults(session, resolved_id)
        effective_role = _set_global_role(session, resolved_id, role, granted_by="school_invite")
        return {
            "userId": resolved_id,
            "phone": normalized_phone,
            "role": effective_role or "student",
        }
