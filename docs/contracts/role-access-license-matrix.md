# Role, Access and License Matrix

## Roles found in code

Roles are defined in `backend/app/security/policies.py`.

| Role | Current meaning |
| --- | --- |
| `student` | Default learner role |
| `learner` | Alternate learner/student role |
| `teacher` | Teacher cabinet, class/live lesson workflows |
| `homeroom_teacher` | Class teacher variant with homeroom management behavior |
| `parent` | Parent cabinet and child progress |
| `school_admin` | School-level admin; also currently allowed into admin panel/scopes/subscriptions/content management |
| `content_editor` | Content management scope |
| `support` | Admin panel support access |
| `admin` | System admin |
| `owner` | Owner/system-level access |

Target roles requested by product docs also include university student, methodist, reviewer, and owner dashboard. `methodist`, `reviewer`, and `university_student` are not first-class policy roles yet.

## Scope matrix found in code

| Scope | Allowed roles |
| --- | --- |
| `auth:me` | all known roles |
| `user:read_self` | all known roles |
| `user:sync_self` | all known roles |
| `user:profile_self` | all known roles |
| `telemetry:write_self` | all known roles |
| `payments:admin` | teacher, homeroom_teacher, school_admin, admin, owner |
| `cabinet:teacher` | teacher, homeroom_teacher |
| `cabinet:parent` | parent |
| `admin:panel` | support, school_admin, admin, owner |
| `admin:roles` | school_admin, admin, owner |
| `admin:rights` | school_admin, admin, owner |
| `admin:subscriptions` | school_admin, admin, owner |
| `content:manage` | content_editor, school_admin, admin, owner |

Scope overrides are stored in user state and can alter effective permissions.

## Auth/access context shape

Auth responses expose `userId`, `displayName`, `role`, `activeRole`, `availableRoles`, `schoolMemberships`, `classMemberships`, `subscriptions`, `grants`, `capabilities`, `featureFlags`, access/refresh tokens and expiry timestamps.

Capabilities currently include `canStudy`, `canViewChildProgress`, `canTeach`, `canLaunchLesson`, `canManageHomeroom`, `canManageSchool`, `canUseAi`, `canManageContent`, `canSupportUsers`, and `canAdminSystem`.

## License and entitlement logic

| Area | Current behavior |
| --- | --- |
| Default entitlement | `plans: ['free']`, `modules: []`, `ai_quota_left: 20` |
| Individual subscription | Admin grants/revokes plan and/or module via `/admin/subscriptions/*`; user reads via `/users/entitlements` |
| Module purchase | Payment create/status/webhook can grant module-related purchases; response models use `moduleId` and `amountRub` |
| Access grant | `/admin/access/grant` stores source type, plan/module/feature, organization/school/site/license IDs, expiry and price |
| School license | School invite activation can create membership and grant modules/features from school license data |
| School code/invite | `/auth/invite/preview` and `/auth/invite/activate` expose school, site, class, role, modules, features, license title and status |
| Feature gates | Mostly computed in auth context as capabilities and feature flags; not yet a centralized typed feature matrix package |

## Gaps against target architecture

- `methodist`, `reviewer`, `content_author`, and `university_student` are product roles but not formal policy roles.
- Entitlements are state-backed and loosely typed; no shared TypeScript contract exists.
- School license limits, seats, expiry, plan tiers, and module bundles are not expressed as a stable API schema.
- Some user endpoints still accept `userId` query parameters; future client must review authorization semantics.
- Feature gates are computed ad hoc in auth code, not from a versioned `access-core` contract.
- Content QA roles are collapsed into `content_editor`, `school_admin`, `admin`, `owner`.
