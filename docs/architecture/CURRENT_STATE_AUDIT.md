# ALC-000 — Current State Audit

Дата аудита: 2026-07-14 (Europe/Moscow)

Среда: production host `100.67.164.12`, проект `/root/synapse`

Режим: baseline audit; миграции, deploy, restart, dependency install/update и изменения БД не выполнялись.

## Executive summary

`/root/synapse` — единственный найденный Git repository root и npm-workspaces монорепозиторий. Production обслуживается FastAPI/legacy static web и admin; параллельная Next.js/TypeScript архитектура находится в `apps/` и `packages/`, но ключевые файлы этой архитектуры не отслеживаются Git. Checkout изначально содержал 34 modified tracked files и 2092 untracked files. Текущая ветка `figma-full-ui-migration-20260602`, `main` и локальный remote-tracking ref `origin/main` указывали на один commit `d3106a0`; единственный worktree — `/root/synapse`.

Во время проверки существующий `tools/verify-ui-foundation.mjs`, ошибочно классифицированный как статический, запустил `next build apps/web`. Вызов остановлен timeout без рестарта сервисов. Основные production routes остались healthy, но untracked build tree `apps/web/.next` стал неполным: `BUILD_ID` отсутствует, а cwd работающего preview-процесса показывает `(deleted)`. Это блокер для любого restart preview и требует отдельного одобренного recovery-task до разработки.

## Environment and repository

| Item | Confirmed result | Evidence |
|---|---|---|
| Current directory | `/root/synapse` | `pwd` |
| Repository root | `/root/synapse`; других `.git` не найдено | `git rev-parse --show-toplevel`; filtered `find . -name .git` |
| Branch | `figma-full-ui-migration-20260602` | `git branch --show-current` |
| HEAD | `d3106a0df8bfe5da2fad87602c13fd9beeddedaa` | `git worktree list --porcelain` |
| Worktrees | один: `/root/synapse` | `git worktree list --porcelain` |
| Local branches | `figma-full-ui-migration-20260602`, `main` | `git branch --format=...` |
| Remote refs available locally | `origin/main`, `origin/stage18-complete`, оба `d3106a0` | `git branch -r --format=...`; fetch не выполнялся |
| Branch divergence | `main...feature = 0/0`; `origin/main...feature = 0/0` по локальным refs | `git rev-list --left-right --count` |
| Package manager | npm, lockfile v3; root workspaces `apps/*`, `packages/*` | root `package.json`, `package-lock.json` |
| Monorepo | YES | root npm workspaces plus `apps/`, `packages/` |
| Old and new architecture | both present | `backend/app/web_public`, `backend/app/web_admin`; `apps/*`, `packages/*` |

### Runtime versions

- Node.js `v20.20.2`; npm/npx `10.8.2`.
- Python `3.10.12`; pip `22.0.2`.
- Docker `29.1.3`; Docker Compose `2.40.3`.
- Git `2.34.1`.
- Root lock: Next `16.2.10`, React `19.2.7`, TypeScript `5.9.3`, Vitest `4.1.10`.
- Mobile lock: Expo `52.0.47`, React Native `0.76.9`, React `18.3.1`.
- Tools lock: Playwright `1.60.0`.
- Backend pins include FastAPI `0.115.0`, Uvicorn `0.30.0`, SQLAlchemy `2.0.32`, psycopg `3.2.3`, Alembic `1.13.2`, Redis client `5.0.7`, pytest `8.3.4`.

## Initial dirty baseline

Before audit report creation and before the unintended Next build side effect:

- 34 modified tracked files.
- 2092 untracked files when expanded with `--untracked-files=all`.
- Top untracked concentration: `apps` 1702, `packages` 158, `docs` 103, `artifacts` 82, `backend` 33, `tools` 22.
- `AGENTS.md`, root `package.json`, `apps/web/package.json`, `apps/admin/package.json`, `packages/types/package.json`, approved-reference manifest and preview nginx example were all untracked.

Modified tracked files were:

```text
assistant_log.md
backend/app/api/v1/endpoints/admin_panel.py
backend/app/api/v1/endpoints/public_web.py
backend/app/api/v1/endpoints/system.py
backend/app/services/admin_panel_service.py
backend/app/web_admin/app.js
backend/app/web_admin/index.html
backend/app/web_admin/styles.css
backend/app/web_public/app.js
backend/app/web_public/index.html
backend/app/web_public/styles.css
backend/data/security/alerts_ack.json
backend/data/security/backup_dry_run_history.json
backend/data/security/backup_dry_run_status.json
backend/data/security/go_no_go_history.json
backend/data/security/handover_archive.json
backend/data/security/mobile_onboarding_smoke_status.json
backend/data/user_state.json
backend/tests/test_admin_panel.py
backend/tests/test_admin_web.py
backend/tests/test_public_web.py
content_packs/allchemist-apk-latest.json
docs/qa/stage-ledger.md
mobile/App.tsx
mobile/android/app/build.gradle
mobile/app/components/AppBackground.tsx
mobile/app/screens/OnboardingRoleScreen.tsx
mobile/app/screens/PeriodicTableScreen.tsx
mobile/app/screens/WebFallbackShell.tsx
mobile/assets/content/chemistry_pack_v1.json
mobile/assets/content/physics_pack_v1.json
tools/playwright-admin-auth-roles-smoke.mjs
tools/playwright-authenticated-roles-smoke.mjs
tools/playwright-visual-smoke.mjs
```

Ownership and intent for these pre-existing changes are UNKNOWN. They must not be reset, cleaned, staged wholesale or overwritten.

## Application inventory

Status meanings: ACTIVE = connected to confirmed runtime; PARTIAL = implemented or built in part but not confirmed as production path; LEGACY = current legacy implementation retained for behavior/contracts; UNKNOWN = insufficient evidence.

| Element | Actual path | Purpose / current use | Evidence | State |
|---|---|---|---|---|
| Public web | `backend/app/web_public` | Current public/cabinet static web served by FastAPI | nginx `/` -> `127.0.0.1:8000/api/v1/web`; HTTP 200 | ACTIVE / LEGACY |
| New web | `apps/web` | Next target, dashboard/design preview/science routes | source and built route manifests; systemd on `127.0.0.1:3010`; no public nginx route | PARTIAL |
| Admin web | `backend/app/web_admin` | Current admin static web | `admin.allchemist.ru/` -> `/api/v1/admin/web`; HTTP 200 | ACTIVE / LEGACY |
| New admin | `apps/admin` | Next target admin route placeholders | 14 source routes; no running admin Next service; most pages 25-line placeholders | PARTIAL |
| Backend | `backend/app` | FastAPI API v1, auth, content, cabinets, admin, AI | `synapse-backend` healthy; public health 200 | ACTIVE |
| Mobile | `mobile` | Expo/React Native app plus Android tree | package/lock, screens/services/assets present; no server runtime | PARTIAL |
| Database | Docker `synapse-db`; SQL under `infra/*.sql`, `backend/sql`; SQLite artifacts | PostgreSQL production storage; legacy/mobile SQLite artifacts | healthy Postgres; read-only metadata listed 21 public tables | ACTIVE + LEGACY artifacts |
| Migrations | SQL bootstrap files; no repository Alembic revision directory found | schema bootstrap/manual evolution | Alembic dependency exists, but no `alembic.ini`/revision tree found | PARTIAL |
| Redis | backend dependency/config only | optional cache/integration boundary | Redis client pin and config reference; no compose/runtime Redis service | PARTIAL / inactive |
| Object storage | `tools/cdn_object_storage_readiness.py`, docs/ops, APK metadata support | readiness and CDN URL integration | files and public-web test name; no object-storage runtime/service confirmed | PARTIAL |
| Science core | `packages/science-core`, chemistry/physics/biology packages | shared contracts and engines | TS sources and root typecheck scripts | PARTIAL |
| AI package | `packages/ai-assistant`; backend `ai_mentor.py` | target shared state plus active API | `/api/v1/ai-mentor/health` HTTP 200; TS package source | ACTIVE backend / PARTIAL package |
| Content packages | `packages/content-core`, `packages/content-qa-core`, `content/mvp` | content models, QA workflow, MVP packs | API endpoints, live DB tables, source packages | ACTIVE backend / PARTIAL shared packages |
| Tests | `backend/tests`, `packages/api-client/tests` | backend contracts and TS contract/science tests | 41 cached pytest nodeids; 32 contract tests passed during audit | PARTIAL baseline |
| Storybook | none found | component catalogue | no `.storybook` or Storybook config/dependency found | UNKNOWN / absent |
| Playwright | `tools/playwright-*.mjs`, `tools/package-lock.json` | smoke/visual tooling | four scripts and Playwright 1.60.0; no config and no CI invocation found | PARTIAL |
| CI/CD | `.github/workflows/ci.yml`, `production-release-gate.yml` | backend/static/mobile checks and release gate | workflow commands inspected | PARTIAL |
| nginx | live `/etc/nginx/sites-enabled/*.conf`; repo preview example | production reverse proxy and optional preview plan | live directives and nginx active | ACTIVE live / PARTIAL repo ownership |
| systemd | live `allchemist-web-preview.service`; repo example | internal Next preview process | service active before/after audit; port 3010 | ACTIVE but restart-blocked |
| Docker | `infra/docker-compose.yml`, `backend/Dockerfile` | FastAPI/Postgres runtime | two healthy containers | ACTIVE |

## Database inventory

Read-only `information_schema` query with `default_transaction_read_only=on` confirmed these tables: `access_grants`, `ai_docs`, `ai_knowledge`, `content_blocks`, `content_qa_events`, `content_sources`, `device_recovery_codes`, `device_registry`, `lesson_blocks`, `modules`, `molecules`, `organizations`, `physics_scenarios`, `reactions`, `school_classes`, `school_invite_codes`, `school_licenses`, `school_memberships`, `school_sites`, `schools`, `tasks`, `user_progress_server`.

The query returned schema only; no application rows or secret values were read. The named volume is `infra_synapse_pg_data`. Backup artifacts exist, but freshness/restorability was not proven.

## Safe reuse

- FastAPI route contracts, schemas, role policies and tests as behavioral references.
- `packages/types` and `packages/api-client` contract layer, subject to tracking/ownership stabilization.
- science/content package boundaries and data-driven guardrails.
- current student-dashboard approved golden and its manifest.
- existing nginx/systemd examples as documentation only, not as authorization to switch routes.

## Do not touch

- Live nginx/systemd/compose, running containers, Postgres volume and data.
- `backend/app/web_public` and `backend/app/web_admin` behavior until migration gates approve replacement.
- Any of the 34 pre-existing modified tracked files without ownership resolution.
- Untracked `apps/`, `packages/`, `docs/`, `artifacts/` until an explicit baseline decision.
- `apps/web/.next`: it is incomplete and must not be restarted or treated as a deployable artifact.
- Secrets, `.env`, credentials and backup contents.

## Risks and blockers

1. Dirty production checkout has no attributable baseline; target architecture is mostly untracked.
2. Current branch has no committed delta from `main`; implemented work exists only in working tree.
3. Internal preview process runs from a deleted cwd after the aborted existing quality script build. It answers from memory now but restart safety is NO.
4. New admin is placeholder-only and not running.
5. No Alembic revision history was found despite Alembic dependency.
6. Only one of eight approved visual references is present.
7. Legacy admin JavaScript has a confirmed syntax failure (`renderAdminKpis` declared twice).
8. Error-tracking integration was not found.

## Recommended next task

`ALC-001 — PREVIEW ARTIFACT RECOVERY AND REPOSITORY BASELINE STABILIZATION`.

Scope must be explicitly approved: restore a restartable preview artifact without switching public routes, preserve all dirty files, assign ownership, and create a clean architecture-planning worktree. No screen development or migration should start first.

Ready for architecture planning: **NO**, until ALC-001 restores restart safety and establishes an attributable repository baseline.
