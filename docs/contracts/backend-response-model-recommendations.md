# Backend Response Model Recommendations

This document lists Pydantic response models that should be added later. It does not implement or change backend models in this task.

## P0 recommendations

| Model | Why | Suggested source |
| --- | --- | --- |
| `AuthUserOut` | Stable auth identity across login/me/profile | current `AuthMeOut`, `AuthLoginOut` |
| `AuthContextOut` | Shared role, memberships, grants, capabilities, feature flags | current auth context builder |
| `EntitlementOutV2` | Include optional features and source metadata | current `EntitlementOut` plus access grants |
| `AccessGrantOut` | Type manual/school/payment/promo grants | admin access grant service |
| `SchoolMembershipOut` | Normalize school/site/class/role rows | auth membership collector |
| `PaymentSubscriptionStatusOut` | Separate payment status from subscription/access status | payment status and admin subscription services |
| `ProgressSyncResponseOut` | Preserve accepted task IDs contract | current `ProgressSyncOut` |
| `MoleculeOut` | Type molecule atoms and source verification metadata | content molecule endpoint |
| `ReactionOut` | Type reactants/products/conditions and future visual metadata | content reaction endpoint |

## P1 recommendations

| Model | Why | Suggested fields |
| --- | --- | --- |
| `SchoolLicenseSummaryOut` | Required for school license UI and seat accounting | licenseId, schoolId, siteId, modules, features, seatsTotal, seatsUsed, expiresAt, status |
| `AdminDashboardSummaryOut` | Admin dashboard currently raw aggregate | schools, users, licenses, materials, revenue, attention counts |
| `AdminActivityOut` | Charts need stable time series | period, points, totals |
| `AdminAttentionItemOut` | Alert/attention widgets need stable shape | id, type, title, description, severity, count, targetUrl |
| `StudentCabinetSummaryOut` | No dedicated endpoint yet; needed for redesigned student app | progress, modules, recommendations, assignments |
| `TeacherCabinetSummaryOut` | Current Pydantic model has raw nested dicts | classes, homeworkSummary, analytics with typed nested rows |
| `ParentCabinetSummaryOut` | Current Pydantic model has raw child rows | children, alerts, recommendations |
| `ContentQaQueueItemOut` | Queues currently raw aggregate | status, titleRu, items, count, blockers |
| `ContentSourceOut` | Source registry needs stable typing | id, titleRu, organizationRu, url, licenseStatus, trustLevel |
| `ContentQaBlockOut` | QA table/drawer needs stable block shape | content fields, source list, statuses, reviewers, version |
| `LiveSessionOut` | Teacher live workflows need stable shape | sessionId, joinCode, moduleId, lessonId, participants, events, status |
| `AiGeneratedTaskOut` | AI next-task/generate-task currently raw | task id, subject, topic, difficulty, source/safety status |

## Scientific visualization recommendations

| Model | Why |
| --- | --- |
| `SolutionAppearanceOut` | Prevent fake colors; require source-backed color metadata |
| `PrecipitateAppearanceOut` | Require precipitate identity, appearance and source |
| `GasObservationOut` | Require gas identity and safety note |
| `OdorNoteOut` | Text/safety metadata only; no fake visual |
| `PHValueOut` | Source-backed pH/range/indicator metadata |
| `PhysicsSimulationOut` | Variables, formulas, parameters and graphs need typed model |
| `MicroscopeSampleOut` | Biology microscope requires sample/preparation/zoom/source fields |

## Implementation note

Add these models incrementally after API-client parity stabilizes. Each new Pydantic response model should be covered by focused backend tests and a matching `packages/types` DTO update.
