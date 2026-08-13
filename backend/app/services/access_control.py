"""The access decision, in one place.

Every authorisation question in the platform is the same question::

    role -> permission -> ownership -> tenant -> scope -> licence -> flag ->
    publication status

evaluated in that order, on the server, with deny winning. This module is the
only implementation of it. Endpoints ask; they do not re-derive.

Three properties are worth more than the code that provides them.

**Deny wins, and it wins early.** The first link that refuses ends the
evaluation. There is no "unless", no later link that can rescue a request, and
no argument a caller can pass that skips a check.

**Each link answers exactly one question.** ``role`` asks whether the subject
has any standing at all; ``permission`` whether that standing includes this
verb; ``tenant`` whether the subject belongs to the object's school; ``scope``
whether the granting role reaches the object. Collapsing two of these into one
check is how a system ends up unable to tell "you are not a teacher" from "you
are not a teacher *here*" -- and unable to test either.

**A refusal says which link refused.** ``AccessDecision.denied_link`` names it
and ``reason_ru`` is a sentence a support engineer can read out loud. A 403 that
cannot explain itself makes every access question an archaeology session and,
worse, makes a correct refusal indistinguishable from a bug.

Callers pass the object's narrowest known scope. The engine widens it itself --
a class implies its site, school and organization -- so a caller cannot weaken a
check by omitting the parent ids, and does not have to look them up to be safe.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Optional, Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.identity import ParentChildLink
from app.models.school import School, SchoolClass, SchoolSite
from app.repositories.identity import (
    AuditRepository,
    EntitlementRepository,
    FeatureFlagRepository,
    RoleRepository,
    ScopedRole,
    UserRepository,
)

__all__ = [
    "AccessDecision",
    "AccessRequest",
    "LINKS",
    "evaluate",
    "explain",
]

# The chain, in evaluation order. Exported so that tests, the admin UI and the
# audit trail all name the links the same way.
LINKS: tuple[str, ...] = (
    "role",
    "permission",
    "ownership",
    "tenant",
    "scope",
    "license",
    "flag",
    "publication",
)

# Content in any other state is visible only to those who may manage content.
PUBLISHED_STATUSES = frozenset({"published", "approved"})

# Authority to act outside a subject's own scope. It is a permission, not a
# scope. Revision 0002 gave forty-four ordinary accounts a global-scoped role,
# because their role genuinely is not tied to a school -- and reading that as
# platform-wide authority handed every parent every child on the platform.
# Being unscoped and being omnipotent are different claims, so they now have
# different names. Granted to `admin` and `owner` by revision 0004.
PLATFORM_ANY_SCOPE = "platform:any_scope"

_users = UserRepository()
_roles = RoleRepository()
_entitlements = EntitlementRepository()
_flags = FeatureFlagRepository()
_audit = AuditRepository()


@dataclass(frozen=True)
class AccessRequest:
    """One question: may *this* subject do *this* to *this* object?

    Everything the chain needs is named here, so a check cannot silently depend
    on ambient state. A field left at its default means "this link does not
    apply to this request" -- never "skip this link".
    """

    user_id: str
    permission: str

    # The object's place in the tenancy tree. Give the narrowest one known; the
    # engine fills in the parents.
    organization_id: Optional[str] = None
    school_id: Optional[str] = None
    site_id: Optional[str] = None
    class_id: Optional[str] = None

    # Set when the object belongs to somebody: a pupil's progress, a parent's
    # child, a teacher's own class.
    owner_user_id: Optional[str] = None

    # Commercial and rollout gates.
    required_modules: tuple[str, ...] = ()
    required_features: tuple[str, ...] = ()
    required_flags: tuple[str, ...] = ()

    # Publication gate. Only meaningful for content.
    publication_status: Optional[str] = None

    @property
    def names_a_scope(self) -> bool:
        return any(
            value is not None
            for value in (self.organization_id, self.school_id, self.site_id, self.class_id)
        )


@dataclass
class AccessDecision:
    """The verdict, and enough detail to defend it."""

    allowed: bool
    denied_link: Optional[str] = None
    reason_ru: str = "Доступ разрешён"
    matched_role: Optional[str] = None
    checked_links: list[str] = field(default_factory=list)

    def __bool__(self) -> bool:
        return self.allowed


def _deny(
    link: str, reason_ru: str, checked: list[str], role: Optional[str] = None
) -> AccessDecision:
    return AccessDecision(
        allowed=False,
        denied_link=link,
        reason_ru=reason_ru,
        matched_role=role,
        checked_links=checked,
    )


def _resolve_scope_path(session: Session, request: AccessRequest) -> AccessRequest:
    """Widen the request to the full scope path of the object it names.

    A caller that knows only the class id must not thereby get a weaker check
    than one that spells out the school. Walking upwards here means the strict
    answer is also the convenient one.
    """
    organization_id = request.organization_id
    school_id = request.school_id
    site_id = request.site_id

    if request.class_id is not None and (school_id is None or site_id is None):
        school_class = session.get(SchoolClass, request.class_id)
        if school_class is not None:
            school_id = school_id or school_class.school_id
            site_id = site_id or school_class.site_id

    if site_id is not None and school_id is None:
        site = session.get(SchoolSite, site_id)
        if site is not None:
            school_id = site.school_id

    if school_id is not None and organization_id is None:
        school = session.get(School, school_id)
        if school is not None:
            organization_id = school.organization_id

    if (
        organization_id == request.organization_id
        and school_id == request.school_id
        and site_id == request.site_id
    ):
        return request
    return replace(
        request, organization_id=organization_id, school_id=school_id, site_id=site_id
    )


def evaluate(session: Session, request: AccessRequest) -> AccessDecision:
    """Run the chain. Returns a verdict; a plain refusal is not an exception."""
    checked: list[str] = []
    request = _resolve_scope_path(session, request)

    # -- role: does the subject have any standing at all? --------------------
    checked.append("role")
    user = _users.get_active(session, request.user_id)
    if user is None:
        return _deny("role", "Учётная запись не найдена или заблокирована.", checked)

    scoped_roles = _roles.scoped_roles(session, request.user_id)
    if not scoped_roles:
        return _deny("role", "У пользователя нет ни одной действующей роли.", checked)
    held_roles = {scoped.role_key for scoped in scoped_roles}

    # -- permission: does that standing include this verb? -------------------
    checked.append("permission")
    matrix = _roles.permission_matrix(session)
    effects = matrix.get(request.permission)
    if not effects:
        return _deny(
            "permission",
            f"Разрешение «{request.permission}» не выдано ни одной роли.",
            checked,
        )

    denying = sorted(key for key in held_roles if effects.get(key) == "deny")
    if denying:
        # An explicit deny is not one vote among several. It ends the matter,
        # even when another role of the same user would have allowed it.
        return _deny(
            "permission",
            f"Роль «{denying[0]}» имеет явный запрет на «{request.permission}».",
            checked,
            role=denying[0],
        )

    allowing = {key for key in held_roles if effects.get(key) == "allow"}
    if not allowing:
        return _deny(
            "permission",
            f"Роль пользователя не даёт разрешения «{request.permission}».",
            checked,
        )
    matched_role = sorted(allowing)[0]
    any_scope = matrix.get(PLATFORM_ANY_SCOPE, {})
    has_platform_authority = any(
        any_scope.get(role_key) == "allow" for role_key in held_roles
    ) and not any(any_scope.get(role_key) == "deny" for role_key in held_roles)

    # -- ownership: whose object is it? --------------------------------------
    checked.append("ownership")
    if request.owner_user_id is not None and request.owner_user_id != request.user_id:
        if not _may_act_for(session, request, has_platform_authority=has_platform_authority):
            return _deny(
                "ownership",
                "Объект принадлежит другому пользователю.",
                checked,
                role=matched_role,
            )

    # -- tenant: does the subject belong to the object's school? -------------
    checked.append("tenant")
    if request.school_id is not None and not has_platform_authority:
        if request.school_id not in _roles.school_ids(session, request.user_id):
            return _deny(
                "tenant", "Пользователь не состоит в этой школе.", checked, role=matched_role
            )

    # -- scope: does the granting role reach this object? --------------------
    checked.append("scope")
    if request.names_a_scope and not has_platform_authority:
        granting = [scoped for scoped in scoped_roles if scoped.role_key in allowing]
        reaches = any(
            scoped.covers(
                organization_id=request.organization_id,
                school_id=request.school_id,
                site_id=request.site_id,
                class_id=request.class_id,
            )
            for scoped in granting
        )
        if not reaches:
            return _deny(
                "scope",
                "Объект вне области действия роли пользователя.",
                checked,
                role=matched_role,
            )

    # -- licence: is it paid for, and still valid? ---------------------------
    checked.append("license")
    if request.required_modules:
        owned = _entitlements.modules(session, request.user_id)
        missing = [module for module in request.required_modules if module not in owned]
        if missing:
            return _deny(
                "license",
                f"Нет действующей лицензии на модуль «{missing[0]}».",
                checked,
                role=matched_role,
            )
    if request.required_features:
        owned = _entitlements.features(session, request.user_id)
        missing = [feature for feature in request.required_features if feature not in owned]
        if missing:
            return _deny(
                "license",
                f"Возможность «{missing[0]}» не входит в текущий доступ.",
                checked,
                role=matched_role,
            )

    # -- feature flag: is the function switched on here? ---------------------
    checked.append("flag")
    for flag_key in request.required_flags:
        if not _flags.is_enabled(
            session,
            flag_key,
            user_id=request.user_id,
            organization_id=request.organization_id,
            school_id=request.school_id,
            site_id=request.site_id,
            class_id=request.class_id,
        ):
            return _deny(
                "flag", f"Функция «{flag_key}» сейчас выключена.", checked, role=matched_role
            )

    # -- publication: has the content cleared QA? ----------------------------
    checked.append("publication")
    if request.publication_status is not None and request.publication_status not in PUBLISHED_STATUSES:
        content_effects = matrix.get("content:manage", {})
        may_manage = any(
            content_effects.get(role_key) == "allow" for role_key in held_roles
        ) and not any(content_effects.get(role_key) == "deny" for role_key in held_roles)
        if not may_manage:
            return _deny(
                "publication", "Материал ещё не опубликован.", checked, role=matched_role
            )

    return AccessDecision(
        allowed=True,
        denied_link=None,
        reason_ru="Доступ разрешён",
        matched_role=matched_role,
        checked_links=checked,
    )


def _may_act_for(
    session: Session, request: AccessRequest, *, has_platform_authority: bool
) -> bool:
    """May the subject act on an object owned by somebody else?

    Three ways, and no others: the platform-wide authority permission, a
    confirmed parent-child link, or a role in a school the owner also belongs
    to. Note what is not on the list -- "the client sent us this user id" is not
    a way.
    """
    if has_platform_authority:
        return True

    link = session.execute(
        select(ParentChildLink).where(
            ParentChildLink.parent_user_id == request.user_id,
            ParentChildLink.child_user_id == request.owner_user_id,
            ParentChildLink.status == "confirmed",
            ParentChildLink.revoked_at.is_(None),
        )
    ).scalars().first()
    if link is not None:
        return True

    subject_schools = _roles.school_ids(session, request.user_id)
    owner_schools = _roles.school_ids(session, str(request.owner_user_id))
    return bool(subject_schools & owner_schools)


def explain(
    session: Session,
    request: AccessRequest,
    decision: AccessDecision,
    *,
    request_id: Optional[str] = None,
) -> AccessDecision:
    """Write a refusal to the audit trail and return the decision unchanged.

    Only refusals are recorded. Auditing every permitted read would bury the
    refusals -- the entries anyone ever goes looking for -- under millions of
    uninteresting rows.
    """
    if decision.allowed:
        return decision

    _audit.record(
        session,
        action=f"access:{request.permission}",
        actor_user_id=request.user_id,
        actor_role=decision.matched_role,
        object_type="permission",
        object_id=request.permission,
        result="denied",
        denied_link=decision.denied_link,
        organization_id=request.organization_id,
        school_id=request.school_id,
        site_id=request.site_id,
        class_id=request.class_id,
        request_id=request_id,
        details={"reason": decision.reason_ru, "checked": decision.checked_links},
    )
    return decision
