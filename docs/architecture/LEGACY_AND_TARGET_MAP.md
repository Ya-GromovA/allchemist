# ALC-000 — Legacy and Target Architecture Map

## Architecture layers

| Capability | Legacy/current implementation | Parallel target implementation | Confirmed status |
|---|---|---|---|
| Public/cabinet web | `backend/app/web_public` static HTML/CSS/JS | `apps/web` Next 16 App Router | legacy ACTIVE; target PARTIAL/internal only |
| Admin web | `backend/app/web_admin` static HTML/CSS/JS | `apps/admin` Next App Router | legacy ACTIVE; target PARTIAL/not running |
| API | FastAPI `backend/app`, API v1 endpoints | proposed `apps/api` not present | ACTIVE legacy/current backend |
| Mobile | `mobile` Expo/React Native | target docs also name `apps/mobile`, not present | PARTIAL |
| Shared contracts | backend Pydantic schemas and legacy JS assumptions | `packages/types`, `packages/api-client` | PARTIAL; contract verification passed |
| Science engines | backend/mobile-specific data and UI | science/chemistry/physics/biology packages | PARTIAL |
| Content QA | backend endpoints/admin legacy | `content-qa-core`, API client, target admin placeholder | ACTIVE backend; PARTIAL target UI |
| AI assistant | backend AI mentor plus mobile/legacy UI | `packages/ai-assistant`, approved widget component | ACTIVE backend; PARTIAL shared UI |

`AGENTS.md` explicitly states that legacy web/admin are behavior and contract references, not visual references, and must not be deleted or switched out without an approved migration plan.

## Functional readiness matrix

Nothing is marked ready solely from a file name. ACTIVE requires runtime or API evidence; PARTIAL means code/contracts/tests exist but end-to-end readiness was not proven.

| Feature | Evidence | State | Gap / unknown |
|---|---|---|---|
| Login | `/auth/login`, phone request/verify, admin password login; legacy UI; auth tests | ACTIVE | authenticated success not exercised on production |
| Register | invite activate and admin user create; no generic public `/register` endpoint found | PARTIAL | public registration policy/flow unknown |
| Sessions | refresh/logout/session store; auth contract tests; `/auth/me` returns 401 unauthenticated | ACTIVE | live authenticated lifecycle not exercised |
| Roles | policies, role switch, student/teacher/parent/school admin/system admin types | ACTIVE | role matrix spans backend and target types; parity review needed |
| Permissions | scope checks and admin scope overrides; policy tests | ACTIVE | no live privileged probe performed |
| School tenant isolation | school tables, class/membership filters, homeroom-only test | PARTIAL | tests exist; complete cross-tenant adversarial suite not found/run |
| Student dashboard | legacy shell active; Next approved/demo route responds internally | ACTIVE legacy / PARTIAL target | Next uses demo data and is not externally routed |
| Teacher dashboard | teacher cabinet endpoints, legacy UI and isolation tests | ACTIVE legacy/backend | target Next teacher screen absent |
| School admin | role and admin/school endpoints exist | PARTIAL | dedicated target dashboard and live tenant validation not proven |
| System admin | admin API scopes, legacy admin subdomain, admin tests | ACTIVE legacy/backend | legacy `app.js` currently fails syntax check |
| Assignments | task tables/content endpoints, teacher homework summary, TS assignment types, demo card | PARTIAL | no dedicated complete assignment CRUD/submission workflow proven |
| Chemistry lab | reactions/molecules API/data, target engine and internal `/zinc-hcl` demo | PARTIAL | not production-routed; canonical chemistry golden missing |
| Physics simulation | physics scenarios table/package; internal physics placeholder route | PARTIAL | no approved golden and no concrete simulation route found in source |
| Microscope | biology/microscope packages and assets | PARTIAL | no target microscope route and no approved golden |
| AI assistant | AI mentor endpoints, health 200, shared package/widget | PARTIAL | provider answer quality, quota and authenticated E2E not tested |
| Feature flags | auth response `featureFlags`, entitlements/capabilities, shared types | PARTIAL | no independent flag service/admin lifecycle proven |
| Content QA | QA tables/endpoints, publish-gate tests, legacy admin and target placeholder | ACTIVE backend / PARTIAL target UI | authenticated review workflow not exercised |
| Audit log | admin and payment audit endpoints/exports | ACTIVE backend | retention, immutability and external sink unknown |
| Error tracking | no Sentry/error-tracking integration found | UNKNOWN / absent | production exception collection not proven |
| Backup/rollback | backup script, backup metadata/status endpoints, old artifacts | PARTIAL | restore success/freshness not proven; no rollback executed |

## New web route depth

Confirmed `apps/web` source routes: `/`, `/dashboard/student`, `/design-preview/platform-structure`, `/design-preview/student-dashboard`, `/modules`, `/modules/chemistry`, `/modules/chemistry/lab/zinc-hcl`, `/modules/physics`, `/modules/biology`.

The dashboard and chemistry-lab routes import demo data. Physics and biology pages contain placeholder markers. No fetch call or API-client use was found in the Next web application source inventory.

## New admin route depth

Confirmed routes include dashboard, users, schools, roles/access, content, content QA, analytics, audit, licenses/payments, reaction packs, physics simulations, biology microscope packs and media assets. Most page files are 25 lines and contain placeholder markers. No active admin Next process was found.

## Reusable components and contracts

- `packages/types`: auth, roles, schools, access, content, science DTOs.
- `packages/api-client`: HTTP/auth/access/admin/content QA/science clients; 32 selected tests passed.
- `packages/science-core` plus subject core/engine packages: useful boundaries, not production-complete engines.
- `packages/content-core` and `content-qa-core`: publication/QA contracts with scientific guardrails.
- `apps/web/components/platform-layout`, approved student dashboard and AI widget: reusable UI foundation, presently demo/placeholder-backed.
- FastAPI Pydantic schemas and endpoint tests: contract evidence for migration planning.

## Legacy elements that must remain

- `backend/app/web_public` and `backend/app/web_admin` until explicit route-switch approval.
- Current `/api/v1` contracts, auth, roles, licensing, access and payment behavior.
- PostgreSQL schema/data and the Docker runtime.
- Existing mobile behavior until target parity is demonstrated.

## Blockers to target migration

1. Target architecture is largely untracked and lacks an owned commit baseline.
2. Internal Next preview artifact is not restartable after the aborted existing quality script build.
3. New admin and several science screens are placeholders.
4. Approved visual references are 1/8 present.
5. Target web is not wired to API/auth/session data.
6. CI does not gate root Next builds, target typechecks or Playwright visual checks.
7. Legacy admin JavaScript has a duplicate declaration syntax error.

## Recommended next task

`ALC-001 — PREVIEW ARTIFACT RECOVERY AND REPOSITORY BASELINE STABILIZATION`, followed only then by an architecture-planning task. No screen implementation or routing migration is recommended now.

## ALC-003 normalization update

- All tracked legacy paths under `backend/app/web_public` and `backend/app/web_admin` were preserved; no byte content, route, service or consumer was changed.
- Target source under `apps` and `packages` is tracked on the normalization branch and reproduces a Next web build from a fresh checkout.
- This does not change readiness: legacy remains ACTIVE, target web remains PARTIAL/internal, and target admin remains PARTIAL/not running.
- Cross-runtime duplicate assets remain separate deployment copies until parity, provenance and packaging are proven.
- The recommended next operational task is ALC-004 for the P0 deleted-cwd preview risk under explicit operations authorization. ALC-005/006/007 may prepare in separate non-overlapping worktrees under their stated conditions.
