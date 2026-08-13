"""Typed repositories over the identity and access tables."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional, Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.identity import (
    AuditLogEntry,
    Consent,
    FeatureFlag,
    FeatureFlagOverride,
    Permission,
    RefreshToken,
    Role,
    RoleAssignment,
    RolePermission,
    User,
    UserCredential,
    UserEntitlementItem,
    UserIdentifier,
    UserSession,
)
from app.models.school import AccessGrant, SchoolMembership

__all__ = [
    "AuditRepository",
    "ConsentRepository",
    "EntitlementRepository",
    "FeatureFlagRepository",
    "RoleRepository",
    "ScopedRole",
    "SessionRepository",
    "UserRepository",
]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class ScopedRole:
    """One role a user holds, together with the scope it holds it in."""

    role_key: str
    scope_type: str
    organization_id: Optional[str] = None
    school_id: Optional[str] = None
    site_id: Optional[str] = None
    class_id: Optional[str] = None
    subject: Optional[str] = None

    def covers(
        self,
        *,
        organization_id: Optional[str],
        school_id: Optional[str],
        site_id: Optional[str],
        class_id: Optional[str],
    ) -> bool:
        """Does this assignment reach the requested scope?

        A global role reaches everything. A narrower role reaches a request only
        when the request names the same object -- and a request that names no
        scope at all is *not* covered by a scoped role: a teacher of one class
        is not thereby a teacher of the platform.
        """
        if self.scope_type == "global":
            return True
        if self.scope_type == "organization":
            return organization_id is not None and organization_id == self.organization_id
        if self.scope_type == "school":
            return school_id is not None and school_id == self.school_id
        if self.scope_type == "site":
            return site_id is not None and site_id == self.site_id
        if self.scope_type == "class":
            return class_id is not None and class_id == self.class_id
        return False


class UserRepository:
    """Accounts, identifiers and password material."""

    def get(self, session: Session, user_id: str) -> Optional[User]:
        return session.get(User, user_id)

    def get_active(self, session: Session, user_id: str) -> Optional[User]:
        user = session.get(User, user_id)
        if user is None or user.status != "active":
            return None
        return user

    def find_by_identifier(
        self, session: Session, kind: str, value_normalized: str
    ) -> Optional[User]:
        statement = (
            select(User)
            .join(UserIdentifier, UserIdentifier.user_id == User.user_id)
            .where(
                UserIdentifier.kind == kind,
                UserIdentifier.value_normalized == value_normalized,
            )
        )
        return session.execute(statement).scalars().first()

    def identifiers(self, session: Session, user_id: str) -> Sequence[UserIdentifier]:
        statement = (
            select(UserIdentifier)
            .where(UserIdentifier.user_id == user_id)
            .order_by(UserIdentifier.kind, UserIdentifier.value_normalized)
        )
        return session.execute(statement).scalars().all()

    def credential(self, session: Session, user_id: str) -> Optional[UserCredential]:
        return session.get(UserCredential, user_id)

    def touch_last_login(self, session: Session, user_id: str, at: Optional[datetime] = None) -> None:
        user = session.get(User, user_id)
        if user is None:
            return
        user.last_login_at = at or _utc_now()
        user.updated_at = _utc_now()


class RoleRepository:
    """The role/permission matrix and per-user scoped assignments."""

    def permission_matrix(self, session: Session) -> dict[str, dict[str, str]]:
        """``{permission_key: {role_key: effect}}`` for the whole platform.

        Returned as effects rather than a plain allow-set so that an explicit
        ``deny`` stays visible to the caller. Collapsing it here would silently
        turn "forbidden" into "not mentioned", and those are different answers.
        """
        matrix: dict[str, dict[str, str]] = {}
        statement = select(
            RolePermission.permission_key, RolePermission.role_key, RolePermission.effect
        )
        for permission_key, role_key, effect in session.execute(statement).all():
            matrix.setdefault(permission_key, {})[role_key] = effect
        return matrix

    def known_roles(self, session: Session) -> set[str]:
        return set(session.execute(select(Role.role_key)).scalars().all())

    def known_permissions(self, session: Session) -> set[str]:
        return set(session.execute(select(Permission.permission_key)).scalars().all())

    def scoped_roles(self, session: Session, user_id: str) -> list[ScopedRole]:
        """Every live role assignment held by one user.

        Expired and revoked assignments are excluded here rather than at the
        call sites: an expired role that is merely "usually filtered out" is a
        role that will eventually be honoured by the one caller that forgot.
        """
        now = _utc_now()
        statement = select(RoleAssignment).where(
            RoleAssignment.user_id == user_id,
            RoleAssignment.revoked_at.is_(None),
            or_(RoleAssignment.expires_at.is_(None), RoleAssignment.expires_at > now),
        )
        return [
            ScopedRole(
                role_key=row.role_key,
                scope_type=row.scope_type,
                organization_id=row.organization_id,
                school_id=row.school_id,
                site_id=row.site_id,
                class_id=row.class_id,
                subject=row.subject,
            )
            for row in session.execute(statement).scalars().all()
        ]

    def effective_role(self, session: Session, user_id: str) -> Optional[str]:
        """The single role the API reports for a user.

        The legacy resolution order was: an explicit override, then the role
        recorded on the consent, then "student". Both of those became global
        assignments during the migration, so the highest-ranked global
        assignment reproduces it -- and now says *why* the user has that role.
        """
        statement = (
            select(RoleAssignment.role_key)
            .join(Role, Role.role_key == RoleAssignment.role_key)
            .where(
                RoleAssignment.user_id == user_id,
                RoleAssignment.scope_type == "global",
                RoleAssignment.revoked_at.is_(None),
                or_(RoleAssignment.expires_at.is_(None), RoleAssignment.expires_at > _utc_now()),
            )
            .order_by(Role.rank.desc())
            .limit(1)
        )
        return session.execute(statement).scalars().first()

    def school_ids(self, session: Session, user_id: str) -> set[str]:
        """Schools the user belongs to, from memberships and from assignments."""
        from_membership = select(SchoolMembership.school_id).where(
            SchoolMembership.user_id == user_id, SchoolMembership.school_id.is_not(None)
        )
        from_assignment = select(RoleAssignment.school_id).where(
            RoleAssignment.user_id == user_id,
            RoleAssignment.school_id.is_not(None),
            RoleAssignment.revoked_at.is_(None),
        )
        ids = set(session.execute(from_membership).scalars().all())
        ids |= set(session.execute(from_assignment).scalars().all())
        return {value for value in ids if value}

    def class_ids(self, session: Session, user_id: str) -> set[str]:
        statement = select(SchoolMembership.class_id).where(SchoolMembership.user_id == user_id)
        return {value for value in session.execute(statement).scalars().all() if value}


class SessionRepository:
    """Login sessions and the refresh-token rotation chain."""

    def create(
        self,
        session: Session,
        *,
        session_id: str,
        user_id: str,
        role_key: Optional[str],
        access_jti: Optional[str],
        access_expires_at: Optional[datetime],
        expires_at: datetime,
        refresh_token: Optional[str] = None,
        device_id: Optional[str] = None,
    ) -> UserSession:
        record = UserSession(
            session_id=session_id,
            user_id=user_id,
            role_key=role_key,
            access_jti=access_jti,
            access_expires_at=access_expires_at,
            expires_at=expires_at,
            device_id=device_id,
            revoked=False,
        )
        session.add(record)
        if refresh_token:
            session.add(
                RefreshToken(
                    session_id=session_id,
                    token_hash=_sha256(refresh_token),
                    expires_at=expires_at,
                )
            )
        return record

    def get(self, session: Session, session_id: str) -> Optional[UserSession]:
        return session.get(UserSession, session_id)

    def find_by_refresh_token(
        self, session: Session, refresh_token: str
    ) -> Optional[RefreshToken]:
        statement = select(RefreshToken).where(RefreshToken.token_hash == _sha256(refresh_token))
        return session.execute(statement).scalars().first()

    def rotate(
        self, session: Session, current: RefreshToken, new_token: str, expires_at: datetime
    ) -> RefreshToken:
        """Issue the next token in the chain and retire the current one.

        If the presented token has already been rotated, it is a replay: the
        whole session is revoked rather than merely refused, because a token
        that leaked once will be presented again.
        """
        if current.replaced_by_token_id is not None or current.used_at is not None:
            self.revoke(session, current.session_id, reason="refresh token replay")
            raise ValueError("refresh token already used")

        successor = RefreshToken(
            session_id=current.session_id,
            token_hash=_sha256(new_token),
            expires_at=expires_at,
        )
        session.add(successor)
        session.flush()
        current.used_at = _utc_now()
        current.replaced_by_token_id = successor.token_id
        return successor

    def revoke(self, session: Session, session_id: str, *, reason: str) -> None:
        record = session.get(UserSession, session_id)
        if record is None or record.revoked:
            return
        now = _utc_now()
        record.revoked = True
        record.revoked_at = now
        record.revoked_reason = reason
        for token in record.refresh_tokens:
            if token.revoked_at is None:
                token.revoked_at = now

    def revoke_all_for_user(self, session: Session, user_id: str, *, reason: str) -> int:
        statement = select(UserSession).where(
            UserSession.user_id == user_id, UserSession.revoked.is_(False)
        )
        count = 0
        for record in session.execute(statement).scalars().all():
            self.revoke(session, record.session_id, reason=reason)
            count += 1
        return count

    def active_for_user(self, session: Session, user_id: str) -> Sequence[UserSession]:
        statement = (
            select(UserSession)
            .where(
                UserSession.user_id == user_id,
                UserSession.revoked.is_(False),
                UserSession.expires_at > _utc_now(),
            )
            .order_by(UserSession.created_at.desc())
        )
        return session.execute(statement).scalars().all()


class ConsentRepository:
    """Recorded consents, by type and document version."""

    def latest(
        self, session: Session, user_id: str, consent_type: str
    ) -> Optional[Consent]:
        statement = (
            select(Consent)
            .where(
                Consent.user_id == user_id,
                Consent.consent_type == consent_type,
                Consent.revoked_at.is_(None),
            )
            .order_by(Consent.accepted_at.desc())
            .limit(1)
        )
        return session.execute(statement).scalars().first()

    def has_accepted(
        self, session: Session, user_id: str, consent_type: str, document_version: str
    ) -> bool:
        statement = select(func.count()).select_from(Consent).where(
            Consent.user_id == user_id,
            Consent.consent_type == consent_type,
            Consent.document_version == document_version,
            Consent.revoked_at.is_(None),
        )
        return bool(session.execute(statement).scalar_one())

    def record(
        self,
        session: Session,
        *,
        user_id: str,
        consent_type: str,
        document_version: str,
        accepted_at: Optional[datetime] = None,
        accepted_by_user_id: Optional[str] = None,
        subject_role: Optional[str] = None,
        evidence: Optional[dict[str, Any]] = None,
    ) -> Consent:
        record = Consent(
            user_id=user_id,
            consent_type=consent_type,
            document_version=document_version,
            accepted_at=accepted_at or _utc_now(),
            accepted_by_user_id=accepted_by_user_id,
            subject_role=subject_role,
            evidence=evidence or {},
        )
        session.add(record)
        return record

    def revoke(self, session: Session, consent: Consent) -> None:
        consent.revoked_at = _utc_now()


class EntitlementRepository:
    """What a user is actually entitled to, and where it came from."""

    def items(self, session: Session, user_id: str, kind: str) -> set[str]:
        now = _utc_now()
        statement = select(UserEntitlementItem.value).where(
            UserEntitlementItem.user_id == user_id,
            UserEntitlementItem.kind == kind,
            or_(
                UserEntitlementItem.expires_at.is_(None),
                UserEntitlementItem.expires_at > now,
            ),
        )
        return set(session.execute(statement).scalars().all())

    def modules(self, session: Session, user_id: str) -> set[str]:
        return self.items(session, user_id, "module")

    def features(self, session: Session, user_id: str) -> set[str]:
        return self.items(session, user_id, "feature")

    def plans(self, session: Session, user_id: str) -> set[str]:
        return self.items(session, user_id, "plan")

    def active_grants(self, session: Session, user_id: str) -> Sequence[AccessGrant]:
        now = _utc_now()
        statement = (
            select(AccessGrant)
            .where(
                AccessGrant.user_id == user_id,
                AccessGrant.status == "active",
                or_(AccessGrant.expires_at.is_(None), AccessGrant.expires_at > now),
            )
            .order_by(AccessGrant.created_at)
        )
        return session.execute(statement).scalars().all()

    def has_valid_license(self, session: Session, user_id: str) -> bool:
        return bool(self.active_grants(session, user_id))


class FeatureFlagRepository:
    """Feature flags with per-scope overrides. The narrowest scope wins."""

    # Most specific first. A per-user override beats a per-class one, which
    # beats the school, and so on down to the platform default.
    _PRECEDENCE = ("user", "class", "site", "school", "organization", "global")

    def is_enabled(
        self,
        session: Session,
        flag_key: str,
        *,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        school_id: Optional[str] = None,
        site_id: Optional[str] = None,
        class_id: Optional[str] = None,
    ) -> bool:
        flag = session.get(FeatureFlag, flag_key)
        if flag is None:
            # An unregistered flag is off. Anything else would make a typo in a
            # flag name silently open a feature.
            return False

        overrides = session.execute(
            select(FeatureFlagOverride).where(FeatureFlagOverride.flag_key == flag_key)
        ).scalars().all()

        scope_values = {
            "user": user_id,
            "class": class_id,
            "site": site_id,
            "school": school_id,
            "organization": organization_id,
        }
        for scope_type in self._PRECEDENCE:
            for override in overrides:
                if override.scope_type != scope_type:
                    continue
                if scope_type == "global":
                    return override.enabled
                requested = scope_values.get(scope_type)
                if requested is None:
                    continue
                actual = getattr(override, f"{scope_type}_id" if scope_type != "class" else "class_id")
                if actual == requested:
                    return override.enabled
        return flag.enabled

    def enabled_keys(self, session: Session) -> set[str]:
        statement = select(FeatureFlag.flag_key).where(FeatureFlag.enabled.is_(True))
        return set(session.execute(statement).scalars().all())


class AuditRepository:
    """Append-only audit trail. There is no update and no delete, by design."""

    def record(
        self,
        session: Session,
        *,
        action: str,
        actor_user_id: Optional[str] = None,
        actor_role: Optional[str] = None,
        object_type: Optional[str] = None,
        object_id: Optional[str] = None,
        result: str = "ok",
        denied_link: Optional[str] = None,
        organization_id: Optional[str] = None,
        school_id: Optional[str] = None,
        site_id: Optional[str] = None,
        class_id: Optional[str] = None,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> AuditLogEntry:
        entry = AuditLogEntry(
            action=action,
            actor_user_id=actor_user_id,
            actor_role=actor_role,
            object_type=object_type,
            object_id=object_id,
            result=result,
            denied_link=denied_link,
            organization_id=organization_id,
            school_id=school_id,
            site_id=site_id,
            class_id=class_id,
            request_id=request_id,
            correlation_id=correlation_id,
            details=details or {},
        )
        session.add(entry)
        return entry

    def recent_for_actor(
        self, session: Session, actor_user_id: str, limit: int = 50
    ) -> Sequence[AuditLogEntry]:
        statement = (
            select(AuditLogEntry)
            .where(AuditLogEntry.actor_user_id == actor_user_id)
            .order_by(AuditLogEntry.occurred_at.desc())
            .limit(limit)
        )
        return session.execute(statement).scalars().all()
