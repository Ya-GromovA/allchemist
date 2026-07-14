# Frontend API Usage Map

This map documents how the current legacy static apps call the API. It is a behavior reference for future `apps/web`, `apps/admin`, `packages/types`, and `packages/api-client`. It is not a visual design source.

## Shared legacy helpers

| File | Helper | Behavior |
| --- | --- | --- |
| `backend/app/web_admin/app.js` | `req(path, init)` | Prefixes `/api/v1`, attaches auth headers from local state, throws parsed errors |
| `backend/app/web_public/app.js` | `apiFetch(path, options, allowRefresh)` | Prefixes `/api/v1`, attaches bearer token, refreshes session once on auth expiry |

## Legacy web_admin endpoint usage

| Legacy function/screen area | Endpoints | Needed by future admin |
| --- | --- | --- |
| Login/auth | `/auth/phone/request-code`, `/auth/phone/verify`, `/admin/auth/login-password`, `/admin/options` | yes, admin shell/auth bootstrap |
| Admin dashboard | `/admin/dashboard/summary`, `/admin/dashboard/activity`, `/admin/dashboard/subjects-activity`, `/admin/dashboard/schools-map`, `/admin/events/recent`, `/admin/dashboard/attention`, `/admin/dashboard/activity-totals`, `/admin/content/qa/summary` | yes, redesigned dashboard |
| Global search/directory | `/admin/search`, `/admin/directory/{section}` | yes |
| Users | `/admin/users`, `/admin/users/create`, `/admin/users/role`, `/admin/users/{userId}/access`, `/admin/users/{userId}/devices`, `/admin/users/{userId}/devices/reset`, `/admin/users/{userId}/password-reset-code`, `/admin/audit` | yes |
| Access/subscriptions | `/admin/access/grant`, `/admin/subscriptions/grant`, `/admin/subscriptions/revoke`, `/admin/subscriptions/bulk`, `/admin/subscriptions/kpi` | yes |
| Schools/classes/invites | `/admin/schools/overview`, `/admin/schools`, `/admin/schools/classes`, `/admin/schools/invites` | yes |
| Rights/scopes | `/admin/rights/scopes`, `/admin/rights/matrix` | yes |
| Content QA | `/content/qa/summary`, `/content/qa/sources`, `/content/qa/blocks`, `/content/qa/queues`, `/content/qa/blocks/{contentId}/events`, `/content/qa/blocks/{contentId}/transition` | yes, critical for admin/content team |
| Security/legal/ops | `/admin/security/checklist`, `/admin/security/actions`, `/admin/security/alerts`, `/admin/security/alerts/ack`, `/admin/security/mobile-readiness`, `/admin/security/mobile-onboarding/smoke`, `/admin/security/content-ingestion`, `/admin/security/go-no-go`, `/admin/security/go-no-go/history`, `/admin/security/handover/archive`, `/admin/security/backup-dry-run`, `/admin/security/export.*`, `/admin/legal/compliance-status`, `/admin/legal/compliance-history` | yes for system admin/owner ops |
| Audit/export | `/admin/audit`, `/admin/audit/export.csv`, `/admin/security/export.json`, `/admin/security/export.csv` | yes |

## Legacy web_public endpoint usage

| Public/user feature | Endpoints | Needed by future user web |
| --- | --- | --- |
| APK notice/download | `/content/downloads/apk/latest/metadata`, `/content/downloads/apk/latest` | maybe, if mobile distribution remains web-hosted |
| Phone/password auth | `/auth/phone/request-code`, `/auth/phone/verify`, `/auth/login`, `/auth/logout`, `/auth/refresh`, `/auth/me` | yes |
| Invite/school code | `/auth/invite/preview`, `/auth/invite/activate` | yes |
| Role/account | `/auth/role/switch`, `/auth/change-password`, `/users/profile`, `/users/access`, `/users/consents/accept`, `/users/devices`, `/users/devices/register`, `/users/devices/revoke`, `/auth/device-recovery/activate` | yes |
| Catalog/modules | `/modules`, `/content/platform-catalog`, `/content/lesson-blocks`, `/content/tasks` | yes |
| Exams/tickets | `/content/exams/generate`, `/content/tickets/analyze` | yes |
| AI tutor | `/ai-mentor/ask`, `/ai-mentor/next-task` | yes |
| Payments | `/payments/create` | yes |
| Teacher cabinet | `/cabinet/teacher/classes`, `/cabinet/teacher/overview`, `/cabinet/teacher/students/{studentUserId}/devices/reset`, `/cabinet/teacher/live/session/start` | yes |
| Parent cabinet | `/cabinet/parent/overview`, `/cabinet/parent/children/{childId}/progress` | yes |
| Live lesson join | `/cabinet/live/join` | yes |

## Future frontend contract implications

- `packages/api-client` needs separate clients or method groups: `auth`, `users`, `access`, `payments`, `content`, `contentQa`, `admin`, `cabinet`, `liveLessons`, `progress`, `aiTutor`.
- Admin and user web must share token refresh/error normalization but keep route permissions separate.
- Legacy screens currently rely on raw `dict` shapes and DOM-specific state. New apps need typed response models before route replacement.
- Do not copy legacy layout, CSS, or visual composition; use this file only for behavior and endpoint coverage.
