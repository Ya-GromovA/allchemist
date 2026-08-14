"""Write-side repositories for authentication, devices and per-user state.

``repositories/identity.py`` covers the read side of the access chain -- roles,
permissions, scopes, sessions, consents. This module covers what the login and
cabinet flows *write*: one-time codes, lockouts, password material, trusted
devices, entitlements and client-synced state.

Every method takes an open :class:`~sqlalchemy.orm.Session` and never commits.
Transaction boundaries belong to the caller, because the operations that matter
here are compound -- "verify the code, create the account, issue the session,
write the audit entry" is one fact about the world and must succeed or fail as
one. That is precisely what the JSON file could not offer: it had a single
``_write_state()`` at the end of each function, and a crash before it lost the
whole operation while a crash after it had already published a half-built one.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.core.passwords import hash_password, verify_password
from app.models.identity import (
    AuthAttemptEvent,
    AuthLockout,
    OtpChallenge,
    User,
    UserAppState,
    UserCredential,
    UserEntitlement,
    UserEntitlementItem,
    UserIdentifier,
)
from app.models.recovery import PasswordResetCode
from app.models.school import DeviceRecoveryCode, DeviceRegistryEntry

__all__ = [
    "AppStateRepository",
    "AttemptRepository",
    "CredentialRepository",
    "DeviceRepository",
    "EntitlementWriteRepository",
    "OtpRepository",
    "PasswordResetRepository",
    "DEFAULT_MODULES",
    "DEFAULT_PLANS",
    "DEFAULT_AI_QUOTA",
]

# The defaults the JSON store handed to every new account. Kept identical so
# that moving the write path does not silently change what a pupil gets.
DEFAULT_PLANS = ("free",)
DEFAULT_MODULES = ("chemistry_core",)
DEFAULT_AI_QUOTA = 20


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _sha256(value: str) -> str:
    return hashlib.sha256(str(value or "").encode("utf-8")).hexdigest()


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    """Postgres returns aware datetimes; be defensive about naive ones anyway."""
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


# --------------------------------------------------------------------------- #
# One-time phone codes
# --------------------------------------------------------------------------- #


@dataclass(frozen=True)
class OtpState:
    code_hash: str
    expires_at: datetime
    attempts: int
    locked_until: Optional[datetime]


class OtpRepository:
    """Outstanding phone codes, keyed by the hash of the phone number.

    The phone number itself is never a key here. A table of pending codes that
    is also a directory of phone numbers is a liability, and hashing costs
    nothing because every lookup already knows the number.
    """

    def get(self, session: Session, phone: str) -> Optional[OtpState]:
        row = session.get(OtpChallenge, _sha256(phone))
        if row is None:
            return None
        return OtpState(
            code_hash=row.code_hash,
            expires_at=_aware(row.expires_at),
            attempts=int(row.attempts or 0),
            locked_until=_aware(row.locked_until),
        )

    def issue(
        self, session: Session, phone: str, *, code: str, expires_at: datetime
    ) -> None:
        statement = (
            pg_insert(OtpChallenge)
            .values(
                phone_hash=_sha256(phone),
                code_hash=_sha256(code),
                expires_at=expires_at,
                attempts=0,
                locked_until=None,
                created_at=_utc_now(),
            )
            .on_conflict_do_update(
                index_elements=[OtpChallenge.phone_hash],
                set_={
                    "code_hash": _sha256(code),
                    "expires_at": expires_at,
                    "attempts": 0,
                    "locked_until": None,
                    "created_at": _utc_now(),
                },
            )
        )
        session.execute(statement)

    def register_failure(
        self, session: Session, phone: str, *, max_attempts: int, lock_minutes: int
    ) -> int:
        row = session.get(OtpChallenge, _sha256(phone))
        if row is None:
            return 0
        row.attempts = int(row.attempts or 0) + 1
        if row.attempts >= max_attempts:
            row.locked_until = _utc_now() + timedelta(minutes=lock_minutes)
        return row.attempts

    def clear(self, session: Session, phone: str) -> None:
        session.execute(
            delete(OtpChallenge).where(OtpChallenge.phone_hash == _sha256(phone))
        )

    def requests_in_window(self, session: Session, phone: str, window_sec: int) -> int:
        """How many codes were requested for this number inside the window.

        Counted from ``auth_attempt_events`` rather than from a per-number list
        of timestamps: the append-only event table is already the record of what
        happened, and a second copy of the same facts would only be able to
        disagree with it.
        """
        since = _utc_now() - timedelta(seconds=window_sec)
        statement = (
            select(func.count())
            .select_from(AuthAttemptEvent)
            .where(
                AuthAttemptEvent.attempt_key == f"otp_request:{_sha256(phone)}",
                AuthAttemptEvent.occurred_at >= since,
            )
        )
        return int(session.execute(statement).scalar_one())


# --------------------------------------------------------------------------- #
# Rate limiting
# --------------------------------------------------------------------------- #


class AttemptRepository:
    """Failed-attempt counting and lockouts.

    ``auth_attempt_events`` is append-only and holds the history;
    ``auth_lockouts`` holds the single mutable fact "this key is locked until
    T". Splitting them is what lets the history stay evidence while the lockout
    stays cheap to check.
    """

    def key(self, kind: str, value: str) -> str:
        return f"{kind}:{_sha256(str(value or '').strip().lower())}"

    def locked_until(self, session: Session, attempt_key: str) -> Optional[datetime]:
        row = session.get(AuthLockout, attempt_key)
        if row is None:
            return None
        locked_until = _aware(row.locked_until)
        if locked_until is None or locked_until <= _utc_now():
            return None
        return locked_until

    def record(
        self,
        session: Session,
        *,
        attempt_key: str,
        kind: str,
        result: str,
        user_id: Optional[str] = None,
    ) -> None:
        session.add(
            AuthAttemptEvent(
                attempt_key=attempt_key,
                kind=kind,
                result=result,
                user_id=user_id,
                occurred_at=_utc_now(),
            )
        )
        # Flushed on purpose. The caller counts the failures in the window
        # immediately after recording one, and that count decides whether to
        # lock the key. Relying on autoflush made the count lag by exactly one
        # attempt, so the lockout fired on the sixth wrong password instead of
        # the fifth -- an off-by-one that a rate limiter cannot afford.
        session.flush()

    def failures_in_window(self, session: Session, attempt_key: str, window_sec: int) -> int:
        since = _utc_now() - timedelta(seconds=window_sec)
        statement = (
            select(func.count())
            .select_from(AuthAttemptEvent)
            .where(
                AuthAttemptEvent.attempt_key == attempt_key,
                AuthAttemptEvent.result == "failed",
                AuthAttemptEvent.occurred_at >= since,
            )
        )
        return int(session.execute(statement).scalar_one())

    def lock(self, session: Session, attempt_key: str, *, until: datetime, reason: str) -> None:
        statement = (
            pg_insert(AuthLockout)
            .values(
                attempt_key=attempt_key,
                locked_until=until,
                reason=reason,
                updated_at=_utc_now(),
            )
            .on_conflict_do_update(
                index_elements=[AuthLockout.attempt_key],
                set_={"locked_until": until, "reason": reason, "updated_at": _utc_now()},
            )
        )
        session.execute(statement)

    def clear_lock(self, session: Session, attempt_key: str) -> None:
        session.execute(delete(AuthLockout).where(AuthLockout.attempt_key == attempt_key))


# --------------------------------------------------------------------------- #
# Password material
# --------------------------------------------------------------------------- #


class CredentialRepository:
    """Reads, writes and transparently upgrades stored password hashes."""

    def get(self, session: Session, user_id: str) -> Optional[UserCredential]:
        return session.get(UserCredential, user_id)

    def set_password(self, session: Session, user_id: str, raw_password: str) -> UserCredential:
        algorithm, password_hash = hash_password(raw_password)
        statement = (
            pg_insert(UserCredential)
            .values(
                user_id=user_id,
                algorithm=algorithm,
                password_hash=password_hash,
                needs_rehash=False,
                must_change=False,
                updated_at=_utc_now(),
            )
            .on_conflict_do_update(
                index_elements=[UserCredential.user_id],
                set_={
                    "algorithm": algorithm,
                    "password_hash": password_hash,
                    "needs_rehash": False,
                    "must_change": False,
                    "updated_at": _utc_now(),
                },
            )
        )
        session.execute(statement)
        session.expire_all()
        return session.get(UserCredential, user_id)

    def verify(self, session: Session, user_id: str, raw_password: str) -> bool:
        """Check a password and upgrade the hash in place when it is legacy.

        The only moment a plaintext password is legitimately available is the
        moment the user proves they know it. Rehashing here is what lets bcrypt
        and pbkdf2 accounts move to Argon2id without anyone being asked to
        reset anything.
        """
        record = session.get(UserCredential, user_id)
        if record is None:
            return False
        outcome = verify_password(raw_password, record.password_hash, record.algorithm)
        if not outcome.ok:
            return False
        if outcome.needs_rehash:
            algorithm, password_hash = hash_password(raw_password)
            record.algorithm = algorithm
            record.password_hash = password_hash
            record.needs_rehash = False
            record.updated_at = _utc_now()
        elif record.needs_rehash:
            record.needs_rehash = False
        return True


# --------------------------------------------------------------------------- #
# Password reset codes
# --------------------------------------------------------------------------- #


class PasswordResetRepository:
    """One-shot codes issued by an administrator."""

    def issue(
        self, session: Session, *, user_id: str, code: str, ttl_hours: int, created_by: str
    ) -> PasswordResetCode:
        hours = max(1, min(int(ttl_hours or 72), 168))
        record = PasswordResetCode(
            reset_id=f"pwd_reset_{secrets.token_hex(8)}",
            user_id=user_id,
            code_hash=_sha256(str(code).strip().upper()),
            status="pending",
            created_at=_utc_now(),
            expires_at=_utc_now() + timedelta(hours=hours),
            created_by=created_by,
        )
        session.add(record)
        return record

    def find_pending(self, session: Session, code: str) -> Optional[PasswordResetCode]:
        statement = select(PasswordResetCode).where(
            PasswordResetCode.code_hash == _sha256(str(code or "").strip().upper()),
            PasswordResetCode.status == "pending",
        )
        return session.execute(statement).scalars().first()

    def mark_used(self, session: Session, record: PasswordResetCode) -> None:
        record.status = "used"
        record.used_at = _utc_now()

    def mark_expired(self, session: Session, record: PasswordResetCode) -> None:
        record.status = "expired"


# --------------------------------------------------------------------------- #
# Devices
# --------------------------------------------------------------------------- #


class DeviceRepository:
    """Trusted devices and the recovery codes that re-bind a lost one."""

    def list_for_user(self, session: Session, user_id: str) -> Sequence[DeviceRegistryEntry]:
        statement = (
            select(DeviceRegistryEntry)
            .where(DeviceRegistryEntry.user_id == user_id)
            .order_by(
                DeviceRegistryEntry.last_seen_at.desc().nullslast(),
                DeviceRegistryEntry.trusted_at.desc().nullslast(),
            )
        )
        return session.execute(statement).scalars().all()

    def active_count(self, session: Session, user_id: str) -> int:
        statement = (
            select(func.count())
            .select_from(DeviceRegistryEntry)
            .where(
                DeviceRegistryEntry.user_id == user_id,
                DeviceRegistryEntry.active.is_(True),
            )
        )
        return int(session.execute(statement).scalar_one())

    def get(
        self, session: Session, user_id: str, device_id: str
    ) -> Optional[DeviceRegistryEntry]:
        return session.get(DeviceRegistryEntry, {"user_id": user_id, "device_id": device_id})

    def upsert(
        self,
        session: Session,
        *,
        user_id: str,
        device_id: str,
        label: str,
        platform: Optional[str],
    ) -> DeviceRegistryEntry:
        now = _utc_now()
        statement = (
            pg_insert(DeviceRegistryEntry)
            .values(
                user_id=user_id,
                device_id=device_id,
                label=label,
                platform=platform,
                active=True,
                trusted_at=now,
                last_seen_at=now,
                revoked_at=None,
            )
            .on_conflict_do_update(
                index_elements=[DeviceRegistryEntry.user_id, DeviceRegistryEntry.device_id],
                set_={
                    "label": label,
                    "platform": platform,
                    "active": True,
                    "last_seen_at": now,
                    "revoked_at": None,
                },
            )
        )
        session.execute(statement)
        session.expire_all()
        return self.get(session, user_id, device_id)

    def revoke(self, session: Session, user_id: str, device_id: str) -> bool:
        record = self.get(session, user_id, device_id)
        if record is None:
            return False
        record.active = False
        record.revoked_at = _utc_now()
        return True

    def revoke_all(self, session: Session, user_id: str) -> int:
        statement = select(DeviceRegistryEntry).where(
            DeviceRegistryEntry.user_id == user_id, DeviceRegistryEntry.active.is_(True)
        )
        now = _utc_now()
        count = 0
        for record in session.execute(statement).scalars().all():
            record.active = False
            record.revoked_at = now
            count += 1
        return count

    def issue_recovery_code(
        self,
        session: Session,
        *,
        code: str,
        user_id: str,
        school_id: Optional[str],
        class_id: Optional[str],
        created_by: str,
        ttl_days: int = 3,
    ) -> DeviceRecoveryCode:
        record = DeviceRecoveryCode(
            code=code,
            user_id=user_id,
            school_id=school_id,
            class_id=class_id,
            status="pending",
            created_at=_utc_now(),
            expires_at=_utc_now() + timedelta(days=ttl_days),
            created_by=created_by,
        )
        session.add(record)
        return record

    def find_recovery_code(self, session: Session, code: str) -> Optional[DeviceRecoveryCode]:
        return session.get(DeviceRecoveryCode, str(code or "").strip().upper())


# --------------------------------------------------------------------------- #
# Entitlements and client state
# --------------------------------------------------------------------------- #


class EntitlementWriteRepository:
    """Grants what a user holds, and the counters that are not derivable."""

    def ensure_defaults(self, session: Session, user_id: str) -> None:
        """Give a brand-new account the free plan and the core module.

        Idempotent: ``ON CONFLICT DO NOTHING`` on the natural key, so calling it
        on an existing account never resets a counter or re-grants a module the
        user has since lost.
        """
        session.execute(
            pg_insert(UserEntitlement)
            .values(
                user_id=user_id,
                ai_quota_left=DEFAULT_AI_QUOTA,
                updated_at=_utc_now(),
            )
            .on_conflict_do_nothing(index_elements=[UserEntitlement.user_id])
        )
        rows = [
            {"user_id": user_id, "kind": "plan", "value": value, "source": "legacy"}
            for value in DEFAULT_PLANS
        ] + [
            {"user_id": user_id, "kind": "module", "value": value, "source": "legacy"}
            for value in DEFAULT_MODULES
        ]
        session.execute(
            pg_insert(UserEntitlementItem)
            .values(rows)
            .on_conflict_do_nothing(constraint="uq_user_entitlement_items")
        )

    def grant_modules(
        self, session: Session, user_id: str, values: Sequence[str], *, source: str = "manual"
    ) -> int:
        cleaned = sorted({str(value).strip() for value in values if str(value or "").strip()})
        if not cleaned:
            return 0
        result = session.execute(
            pg_insert(UserEntitlementItem)
            .values(
                [
                    {"user_id": user_id, "kind": "module", "value": value, "source": source}
                    for value in cleaned
                ]
            )
            .on_conflict_do_nothing(constraint="uq_user_entitlement_items")
        )
        return int(result.rowcount or 0)

    def quota(self, session: Session, user_id: str) -> int:
        row = session.get(UserEntitlement, user_id)
        return int(row.ai_quota_left) if row is not None else 0

    def move_items(self, session: Session, *, from_user_id: str, to_user_id: str) -> None:
        """Fold a device-local account's entitlements into the canonical one.

        Done as insert-then-delete rather than an UPDATE of ``user_id`` because
        the target may already hold the same module, and the unique constraint
        is the thing that should decide, not the application.
        """
        statement = select(UserEntitlementItem).where(
            UserEntitlementItem.user_id == from_user_id
        )
        rows = session.execute(statement).scalars().all()
        if rows:
            session.execute(
                pg_insert(UserEntitlementItem)
                .values(
                    [
                        {
                            "user_id": to_user_id,
                            "kind": row.kind,
                            "value": row.value,
                            "source": row.source,
                            "grant_id": row.grant_id,
                            "starts_at": row.starts_at,
                            "expires_at": row.expires_at,
                        }
                        for row in rows
                    ]
                )
                .on_conflict_do_nothing(constraint="uq_user_entitlement_items")
            )
        session.execute(
            delete(UserEntitlementItem).where(UserEntitlementItem.user_id == from_user_id)
        )


class AppStateRepository:
    """Content versions and preferences synced up from a device."""

    def get(self, session: Session, user_id: str) -> Optional[UserAppState]:
        return session.get(UserAppState, user_id)

    def upsert(
        self,
        session: Session,
        *,
        user_id: str,
        content_versions: dict[str, Any],
        preferences: dict[str, Any],
    ) -> UserAppState:
        statement = (
            pg_insert(UserAppState)
            .values(
                user_id=user_id,
                content_versions=content_versions,
                preferences=preferences,
                updated_at=_utc_now(),
            )
            .on_conflict_do_update(
                index_elements=[UserAppState.user_id],
                set_={
                    "content_versions": content_versions,
                    "preferences": preferences,
                    "updated_at": _utc_now(),
                },
            )
        )
        session.execute(statement)
        session.expire_all()
        return session.get(UserAppState, user_id)

    def merge(
        self,
        session: Session,
        *,
        user_id: str,
        content_versions: dict[str, Any],
        preferences: dict[str, Any],
    ) -> UserAppState:
        """Merge a device's state into whatever the account already has.

        Content versions take the higher value per key -- a device that is
        behind must not drag the account back -- and preferences are overlaid.
        """
        current = self.get(session, user_id)
        merged_versions = dict(current.content_versions or {}) if current else {}
        for key, value in (content_versions or {}).items():
            if key not in merged_versions or str(value) > str(merged_versions[key]):
                merged_versions[key] = value
        merged_preferences = dict(current.preferences or {}) if current else {}
        merged_preferences.update(preferences or {})
        return self.upsert(
            session,
            user_id=user_id,
            content_versions=merged_versions,
            preferences=merged_preferences,
        )


# --------------------------------------------------------------------------- #
# Identifier helpers used by both registration flows
# --------------------------------------------------------------------------- #


def attach_identifier(
    session: Session,
    *,
    user_id: str,
    kind: str,
    value: str,
    value_normalized: str,
    is_primary: bool = True,
    verified: bool = False,
) -> UserIdentifier:
    """Bind a login / phone / e-mail to an account.

    Raises :class:`ValueError` when the identifier already belongs to somebody
    else. The uniqueness is enforced by the database as well; the check here
    exists only so the caller gets a message in Russian rather than an
    ``IntegrityError``.
    """
    existing = session.execute(
        select(UserIdentifier).where(
            UserIdentifier.kind == kind,
            UserIdentifier.value_normalized == value_normalized,
        )
    ).scalars().first()
    if existing is not None:
        if existing.user_id != user_id:
            raise ValueError("Такой логин уже занят" if kind == "login" else "Идентификатор занят")
        existing.value = value
        if verified and existing.verified_at is None:
            existing.verified_at = _utc_now()
        return existing

    if is_primary:
        for row in session.execute(
            select(UserIdentifier).where(
                UserIdentifier.user_id == user_id, UserIdentifier.kind == kind
            )
        ).scalars().all():
            row.is_primary = False

    record = UserIdentifier(
        user_id=user_id,
        kind=kind,
        value=value,
        value_normalized=value_normalized,
        is_primary=is_primary,
        verified_at=_utc_now() if verified else None,
    )
    session.add(record)
    session.flush()
    return record


def ensure_user(session: Session, user_id: str, *, display_name: Optional[str] = None) -> User:
    """Fetch an account, creating it if this is the first time we have seen it."""
    user = session.get(User, user_id)
    if user is None:
        user = User(user_id=user_id, status="active", display_name=display_name)
        session.add(user)
        session.flush()
    elif display_name and not user.display_name:
        user.display_name = display_name
    return user
