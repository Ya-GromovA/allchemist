# API Client Parity

This document tracks P0/P1 API-client readiness before redesigned `apps/web` and `apps/admin` are created. It describes current API-client coverage only; it does not change backend behavior.

## Stability legend

- `stable`: DTO maps an existing Pydantic or clearly documented response shape.
- `partial`: stable top-level fields exist, but response can contain additional backend data.
- `raw-dict`: current backend returns aggregate/raw dictionaries; frontend can call it but must treat shape defensively.
- `future-required`: target architecture needs it, but current backend endpoint is missing.

## P0 endpoint parity

| Group | Endpoint | API-client method | DTO return type | Fixture | Stability | Pydantic response model | Frontend safe now | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Auth | `/auth/login` | `auth.login` | `LoginResponse` | `auth-login.json` | stable | yes | yes | role lists may expand |
| Auth | `/auth/refresh` | `auth.refreshSession` | `RefreshSessionResponse` | covered by auth fixtures | stable | yes | yes | token storage is app-owned |
| Auth | `/auth/logout` | `auth.logout` | `{ ok: boolean }` | none | stable/minimal | raw dict | yes | response may be empty |
| Auth | `/auth/me` | `auth.me` | `AuthContext` | `auth-me.json` | stable | yes | yes | feature flags may expand |
| Auth | `/auth/role/switch` | `auth.switchRole` | `RoleSwitchResponse` | `auth-me.json` | stable | yes | yes | target-only roles not backend roles yet |
| Access | `/users/entitlements` | `access.getEntitlements` | `Entitlement` | `access-entitlements.json` | stable | yes | yes | features optional |
| Access | `/users/access` | `access.getAccessGrants` | `UserAccessResponse` | access fixture | partial | raw dict | cautiously | query `userId` auth semantics |
| Teacher cabinet | `/cabinet/teacher/overview` | `cabinet.getTeacherOverview` | `TeacherCabinetSummary` | `teacher-cabinet.json` | stable | yes | yes | nested classes are raw |
| Parent cabinet | `/cabinet/parent/overview` | `cabinet.getParentOverview` | `ParentCabinetSummary` | `parent-cabinet.json` | stable | yes | yes | child rows are raw |
| Student cabinet | none dedicated | intentionally not implemented | future-required | `student-cabinet.json` | future-required | no | no | composed from profile/modules/progress today |
| Admin dashboard | `/admin/dashboard/*` | `admin.getDashboard*` | `Record<string, unknown>` | `admin-dashboard.json` | raw-dict | no | cautiously | aggregate shapes may change |
| Content QA | `/content/qa/queues` | `contentQa.listQueues` | queue raw aggregate | `content-qa-queue.json` | partial | raw dict | cautiously | queue wrapper keys need model |
| Progress | `/progress/sync` | `progress.sync` | `ProgressSyncResponse` | `progress-sync.json` | stable | yes | yes | endpoint is device/public today |
| Progress | `/progress/pull/{deviceId}` | `progress.pull` | raw rows | progress fixture | partial | yes for row model | cautiously | row shape not exported as DTO yet |
| Chemistry | `/content/molecules` | `chemistry.listMolecules` | `{ molecules: Molecule[]; count }` | `chemistry-molecules.json` | partial | no | cautiously | atoms are raw, no source metadata |
| Chemistry | `/content/reactions` | `chemistry.listReactions` | `{ reactions: Reaction[]; count }` | `chemistry-reactions.json` | partial | no | cautiously | no visual verification fields |
| Payments | `/payments/{paymentId}` | `payments.getPaymentStatus` | `Payment` | `payment-subscription.json` | stable | yes | yes | real provider fields vary |
| Subscriptions | `/admin/subscriptions/kpi` | `payments.getSubscriptionsKpi` | `Record<string, unknown>` | payment fixture | raw-dict | no | admin cautiously | KPI shape needs model |

## P1 endpoint parity

| Group | Endpoint | API-client method | DTO return type | Fixture | Stability | Pydantic response model | Frontend safe now | Remaining risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Schools | `/admin/schools/overview` | `schools.getSchoolsOverview` | raw aggregate | admin dashboard fixture | raw-dict | no | cautiously | school scoping for school_admin |
| Classes | `/admin/schools/classes` | `schools.listClasses/createClass` | partial school class aggregate | none | partial | raw dict | cautiously | wrapper keys vary |
| Invites | `/admin/schools/invites` | `schools.listInvites/createInvite` | partial invite aggregate | none | partial | raw dict | cautiously | license seat behavior not typed |
| Live sessions | `/cabinet/teacher/live/*` | `cabinet.*Live*` | `Record<string, unknown>` | none | raw-dict | no | cautiously | session/event schemas need DTO |
| AI tutor | `/ai-mentor/ask` | `aiTutor.ask` | `AiTutorResponse` | none | stable | yes | yes | biology mode coverage incomplete |
| AI tutor | `/ai-mentor/next-task`, `/generate-task` | `aiTutor.nextTask/generateTask` | raw dict | none | raw-dict | no | cautiously | generated task schema not stable |
| Content | `/content/packs`, `/content/pack/{id}` | `content.listPacks/getPack` | raw dict | none | raw-dict | no | cautiously | pack schema varies |
| Content | `/content/platform-catalog` | `content.getPlatformCatalog` | raw dict | none | raw-dict | no | yes for display only | catalog is aggregate |
| Exams/tickets | `/content/exams/generate`, `/tickets/analyze` | `content.generateExam/analyzeTicket` | raw dict | none | raw-dict | no | cautiously | assessment DTO needed |
| Admin users/security/audit | `/admin/users`, `/admin/security/*`, `/admin/audit` | `users/admin` methods | raw or partial | none | raw-dict | mixed/no | cautiously | ops data shapes unstable |
| Chemistry report | `/content/layers/chemistry/report` | `chemistry.getChemistryLayerReport` | raw dict | none | raw-dict | no | cautiously | report-only, not visual contract |
| Physics | none dedicated | `physics.futureRequired` | future marker | none | future-required | no | no | endpoint design required |
| Biology | none dedicated | `biology.futureRequired` | future marker | none | future-required | no | no | endpoint design required |
| Media | none dedicated | `media.futureRequired` | future marker | none | future-required | no | no | asset registry required |
| Owner analytics | none dedicated | `analytics.futureRequired` | future marker | none | future-required | no | no | metrics endpoints required |

## Summary

The API client is safe for contract-first frontend prototyping when P0 stable methods are used directly and raw-dict methods are wrapped defensively. It is not yet safe to build production admin screens that assume fixed dashboard/security/content aggregate shapes.
