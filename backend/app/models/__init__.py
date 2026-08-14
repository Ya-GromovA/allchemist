"""SQLAlchemy 2 model layer for the Allchemist database.

Importing this package registers every table on ``app.db.base.Base.metadata``.
That single fact is what the structural gate in ``tools/db/model_schema_check.sh``
relies on: the metadata is materialised into a throwaway database and its
catalogue fingerprint is compared with the migrated schema, so a model that
drifts from the migration fails the gate instead of failing in production.

The layer is split by bounded context, not by table count:

``identity``  users, identifiers, credentials, roles, permissions, scoped role
              assignments, sessions, refresh tokens, consents, family links,
              entitlements, feature flags, throttling, audit
``school``    organizations, schools, sites, classes, licences, memberships,
              invitation codes, access grants, devices
``content``   modules, lessons, tasks, molecules, reactions, physics scenarios,
              AI knowledge, content blocks and their QA trail
``progress``  synced learning results
"""

from __future__ import annotations

from app.db.base import Base
from app.models.content import (
    AiDoc,
    AiKnowledge,
    ContentBlock,
    ContentQaEvent,
    ContentSource,
    LessonBlock,
    Module,
    Molecule,
    PhysicsScenario,
    Reaction,
    Task,
)
from app.models.identity import (
    AuditLogEntry,
    AuthAttemptEvent,
    AuthLockout,
    Consent,
    FeatureFlag,
    FeatureFlagOverride,
    OtpChallenge,
    ParentChildLink,
    Permission,
    RefreshToken,
    Role,
    RoleAssignment,
    RolePermission,
    User,
    UserAppState,
    UserCredential,
    UserEntitlement,
    UserEntitlementItem,
    UserIdentifier,
    UserSession,
)
from app.models.progress import UserProgressServer
from app.models.live import LiveSession, LiveSessionEvent, LiveSessionParticipant
from app.models.recovery import PasswordResetCode
from app.models.telemetry import LearningEvent, TelemetryEvent
from app.models.school import (
    AccessGrant,
    AccessGrantOrphaned,
    DeviceRecoveryCode,
    DeviceRegistryEntry,
    Organization,
    School,
    SchoolClass,
    SchoolInviteCode,
    SchoolLicense,
    SchoolMembership,
    SchoolSite,
)

__all__ = [
    "TelemetryEvent",
    "PasswordResetCode",
    "LiveSessionParticipant",
    "LiveSessionEvent",
    "LiveSession",
    "LearningEvent",
    "AccessGrant",
    "AccessGrantOrphaned",
    "AiDoc",
    "AiKnowledge",
    "AuditLogEntry",
    "AuthAttemptEvent",
    "AuthLockout",
    "Base",
    "Consent",
    "ContentBlock",
    "ContentQaEvent",
    "ContentSource",
    "DeviceRecoveryCode",
    "DeviceRegistryEntry",
    "FeatureFlag",
    "FeatureFlagOverride",
    "LessonBlock",
    "Module",
    "Molecule",
    "Organization",
    "OtpChallenge",
    "ParentChildLink",
    "Permission",
    "PhysicsScenario",
    "Reaction",
    "RefreshToken",
    "Role",
    "RoleAssignment",
    "RolePermission",
    "School",
    "SchoolClass",
    "SchoolInviteCode",
    "SchoolLicense",
    "SchoolMembership",
    "SchoolSite",
    "Task",
    "User",
    "UserAppState",
    "UserCredential",
    "UserEntitlement",
    "UserEntitlementItem",
    "UserIdentifier",
    "UserProgressServer",
    "UserSession",
]
