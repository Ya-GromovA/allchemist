# Architecture audit before approved UI implementation

Date: 2026-07-08
Scope: audit only. No production route switch, no backend changes, no legacy `backend/app/web_admin` or `backend/app/web_public` changes.

## 1. Current architecture summary

### Repository and deployment shape

Allchemist is currently a single repository with a production FastAPI backend under `backend/`, an Expo mobile app under `mobile/`, a new non-production Next.js frontend foundation under `apps/`, shared TypeScript packages under `packages/`, operational tools under `tools/`, and Docker deployment under `infra/`.

Production Docker currently runs only:

- `synapse-backend`: FastAPI/uvicorn, healthy on port 8000.
- `synapse-db`: PostgreSQL 16, healthy on host port 5433.

The git worktree is already dirty before this audit. Many frontend foundation, docs, package, mobile, backend and legacy web files are modified or untracked. This audit file is intentionally the only file created by this step.

### Web architecture

There are two web surfaces:

- Legacy production/public/admin web served by FastAPI static endpoints from `backend/app/web_public` and `backend/app/web_admin`.
- New parallel Next.js foundation in `apps/web` and `apps/admin`.

`apps/web` uses Next.js App Router with routes:

- `/`
- `/dashboard/student`
- `/design-preview/student-dashboard`
- `/modules`
- `/modules/chemistry`
- `/modules/physics`
- `/modules/biology`

`apps/admin` uses Next.js App Router with routes:

- `/dashboard`
- `/schools`
- `/users`
- `/roles-access`
- `/licenses-payments`
- `/content`
- `/content-qa`
- `/reaction-packs`
- `/physics-simulations`
- `/biology-microscope-packs`
- `/media-assets`
- `/analytics`
- `/audit`

The new web apps import `@allchemist/ui` and `@allchemist/design-tokens`. `apps/admin/app/admin-shell.tsx` provides a basic admin shell. `packages/ui` provides `AppShell`, `Sidebar`, `Topbar`, `Card`, `Badge`, `MetricCard`, `ProgressRing`, states and basic sections.

Important limitation: existing docs and route text explicitly describe the Next apps as non-production placeholders/read-only foundation. They do not yet implement real auth, protected routing, role shells, API-backed dashboards, simulation/lab screens, or production routing. The current Next web copy also shows encoding/mojibake in terminal output for some Russian strings, which should be verified in browser/source before implementation.

### Mobile architecture

`mobile/` is an Expo / React Native app with:

- React Navigation native stack and bottom tabs.
- Role-aware tab labels for student/teacher/homeroom teacher/parent contexts.
- SQLite offline storage via `expo-sqlite`.
- Local content pack import and schema versioning in `mobile/app/db/bootstrap.ts`.
- Offline-first content tables for modules, lesson blocks, tasks, molecules, reactions, physics scenarios, AI docs and local progress.
- AI mentor online/offline fallback using backend `/ai-mentor/ask` and local `ai_docs` search.
- 3D molecule rendering with `three`, `expo-gl`, `expo-three` on native.
- Web fallback shell for Expo web.

The mobile app is the most mature client architecture today. However, much of its science/rendering logic is mobile-local rather than packaged for reuse by Next.js.

### Backend architecture

The backend is FastAPI with SQLAlchemy, psycopg, PostgreSQL 16, Redis dependency available, and Alembic dependency declared. Runtime app entry is `backend/app/main.py`, with API routes under `backend/app/api/v1`.

Key route groups exist for:

- System health.
- Public web and admin web static surfaces.
- Auth, phone login, password login, invite activation, refresh/logout.
- Users, devices, consents, entitlements and access.
- Payments and webhook auditing.
- Role cabinets for teacher/parent/live sessions/notifications.
- Admin panel, schools, users, licenses, roles, rights, security, audit and operational exports.
- Content packs, platform catalog, tasks, lesson blocks, molecules, reactions, AI search, exams/tickets.
- Content QA sources, blocks, queues, events and transitions.
- AI mentor ask/health/next-task/generate-task.
- Progress sync/pull/analytics.

Persistence is mixed:

- SQLAlchemy model coverage is narrow (`UserProgress`).
- `init_db.py` creates additional tables using raw SQL, including `ai_docs`, `content_sources`, `content_blocks`, `content_qa_events`.
- `pg_school_store.py` synchronizes school/license/access/device state to PostgreSQL with raw psycopg SQL.
- `user_state_store.py` still persists broad auth/access/payment/school state in JSON under `backend/data/user_state.json`.

Alembic is installed, but the audited tree does not show a conventional active Alembic migration set. There are SQL init scripts such as `backend/sql/init_ai_knowledge.sql`, `backend/sql/init_content_import_schema.sql`, and `tools/school_access_device_pg_schema.sql`.

### Design system

Existing foundation:

- `packages/design-tokens`: colors, semantic colors, typography, spacing, radii, shadows, durations, z-index, breakpoints, subject themes, role accents and a design lock pointer.
- `packages/ui`: simple React primitives for shell, cards, metrics, badges, progress, states and subject cards.
- `apps/web/public/design-assets` and `apps/web/public/design-preview` contain student dashboard assets and approved/golden preview images.
- `docs/design/*` contains approved reference mapping, design locks, student dashboard layout/component contracts, implementation reports and visual parity artifacts.

Gaps:

- No complete component taxonomy for approved lab/simulation/microscope/admin/content QA/assistant screens.
- No shared modal, table system, data grid, form controls, sliders, tabs, chat panel, AI assistant state component, lab canvas, graph panel, microscope viewport, safety panel, timeline/player or responsive role shell yet.
- Tokens are useful but still minimal; no formal CSS variable/theme API across web/mobile.

### AI Assistant

Backend AI mentor exists with online providers and offline search. Mobile AI mentor exists with online/offline fallback and next-task/generated-task helpers.

Design docs define required assistant states:

- idle
- blink
- wink
- smile
- thinking
- hint
- warning
- success
- typing
- chat open

Current gap: there is no shared `ai-tutor-core` package or reusable web/mobile AI assistant component/state machine. Context integration with current module/lab/task exists only partially through request payloads and mobile service usage, not as a cross-app assistant architecture.

### Science engines

Current capabilities:

- Mobile molecule 2D/3D rendering exists.
- Mobile reaction screen has molecular and lab modes.
- Mobile physics scenarios are supported as content-pack records and SQLite table.
- Mobile biology has a microscope-themed screen/card, but not a full microscope engine.
- Content contracts/types include scientific metadata, verification statuses and source references.
- API client exposes chemistry molecules/reactions, physics, biology and science clients.
- Backend content endpoints expose molecules, reactions and chemistry layer report.

Current gaps:

- No shared `science-core`, `chemistry-core`, `physics-core`, `biology-core` packages yet.
- No shared deterministic lab scenario engine.
- No shared physics simulation engine with formulas, constraints and graph output.
- No shared microscope engine with sample/focus/magnification/label state.
- No browser-ready 3D/molecule viewer package; mobile native viewer is not directly usable in Next.
- Progress/attempt tracking exists, but not unified with subject engines and visual players.

### Content architecture

Content exists in multiple places:

- `mobile/assets/content/*.json`: core, chemistry, physics, molecule layers.
- `content_packs/*.json`: APK metadata currently visible; backend can mount `/content_packs` read-only.
- Backend in-memory/platform constants inside `content_readonly.py` for catalog, QA workflow and exam blueprints.
- PostgreSQL tables for `content_sources`, `content_blocks`, `content_qa_events`, `ai_docs`.
- Mobile SQLite tables for modules, lesson blocks, tasks, molecules, reactions, physics scenarios and AI docs.
- Contract docs under `docs/contracts/*` define current and target API/content/source expectations.

There is source metadata and content verification workflow at the contract/backend level. Required metadata and publish gates exist in backend constants and docs. The system is not yet fully normalized into source/content/science packages and migrations.

### QA

Existing QA assets:

- Backend pytest tests for auth sync, public/admin web, content quality, payments, role cabinet, policies, admin, localization.
- Mobile TypeScript check in CI.
- API client Vitest tests and scientific guardrails.
- Tools for Playwright visual smoke, visual parity, student dashboard quality, layout contract, screenshots and UI foundation verification.
- Artifacts under `artifacts/ui-snapshots` for student dashboard parity/readiness.
- GitHub Actions for backend contract tests, legacy static JS syntax, ops tools syntax and mobile TypeScript.

Gaps:

- CI does not yet gate `apps/web`, `apps/admin`, `packages/ui`, `packages/design-tokens`, or `packages/api-client` root scripts.
- No e2e flow for Next web/admin approved UI.
- No visual regression suite covering all approved references.
- No screenshot comparison pipeline for chemistry lab, physics simulation, biology microscope, admin dashboard, content QA, AI assistant or mobile dashboard first viewport.
- Existing Playwright tools appear available but are not integrated as mandatory CI gates for the new Next foundation.

### DX

Package manager is npm. The root has `package-lock.json`; mobile and tools also have their own lockfiles. The repository is moving toward a monorepo but does not yet declare npm workspaces in the audited root `package.json`.

Existing scripts:

- Root: typecheck tokens/ui/web/admin, build web/admin.
- `apps/web` and `apps/admin`: Next dev/build/typecheck/start.
- `mobile`: Expo start/run/export, APK demo build/preflight, content quality.
- `packages/api-client`: typecheck and vitest subset.
- CI: backend, legacy web syntax, tools, mobile TypeScript.

Docker is present for backend and PostgreSQL only. There is no Docker/compose service for the new Next web/admin apps.

## 2. What already fits production-ready plan

- FastAPI + PostgreSQL production backend is already deployed and healthy.
- Expo mobile app has a real offline-first architecture with SQLite, schema versioning, content packs, sync and native 3D rendering.
- Auth/access/licensing/school/role concepts already exist in backend services, policies and shared TypeScript types.
- Content QA exists in backend routes, PostgreSQL tables and API client contracts.
- Shared `packages/types` and `packages/api-client` already cover many domain areas: auth, access, schools, users, payments, content, Content QA, progress, AI tutor, science, chemistry, physics, biology, media and analytics.
- `packages/design-tokens` and `packages/ui` are a credible starting foundation for approved UI implementation.
- Approved reference mapping is documented in `docs/design/figma-approved-references.md` with explicit rules not to paste static screenshots into product screens.
- Student dashboard has the strongest design verification trail: screen contracts, assets, zone crops, layout reports, visual parity reports and Playwright tooling.
- The target architecture docs already recommend building new web/admin/mobile-compatible code in parallel and switching route-by-route only after gates pass. This matches the safe migration plan.

## 3. Critical gaps

1. New Next web/admin apps are not production surfaces yet.
   They are explicitly documented as non-production/read-only placeholders and are not wired into production Docker or routes.

2. No web auth/protected-route architecture exists in the Next foundation.
   There is no middleware, session provider, role shell, route guard, token storage strategy, or SSR/client auth boundary for approved web/admin UI.

3. Backend domain persistence is not migration-first enough for the target plan.
   Important tables are created by startup raw SQL or external SQL scripts, and broad state still lives in `backend/data/user_state.json`. This is risky for production-grade content/roles/licenses/progress evolution.

4. Approved UI references are not yet componentized beyond student dashboard preview/foundation.
   Lab, physics, microscope, admin, content QA and AI assistant references need a shared component map and primitives before screen implementation.

5. Science engines are mostly mobile-local or placeholder-level.
   Molecule rendering and reaction lab mode exist in mobile, but the reusable engines and browser packages described in target docs do not exist.

6. The AI assistant lacks a shared state machine and reusable widget.
   Backend/mobile AI features exist, but approved assistant states and contextual module/lab/task integration are not packaged.

7. Content model is split across constants, JSON packs, SQLite import logic, raw SQL tables and docs.
   There is not yet one typed content-core/source-core/science-core authority shared by web/admin/mobile/backend.

8. QA gates do not yet protect the new approved UI surfaces.
   CI covers backend/mobile/legacy static checks, but not Next builds, visual regression for all approved references, accessibility, or screenshot comparison.

9. Package management is not a clean workspace setup.
   Root imports shared packages but does not declare npm workspaces, and mobile uses a separate React 18 stack while web uses React 19. This needs explicit boundary handling.

## 4. Recommended target architecture

The safest target is an incremental monorepo architecture that keeps the existing production FastAPI/static routes stable while building approved UI in parallel.

Recommended layers:

- `apps/web`: Next.js App Router for public landing and user-facing role cabinets.
- `apps/admin`: Next.js App Router for school/admin/owner/content QA operations.
- `mobile`: keep Expo app, gradually consume shared content/types/tokens where compatibility allows.
- `backend`: keep FastAPI as production API authority; add migrations and OpenAPI/contract discipline before route switches.
- `packages/design-tokens`: expand into CSS variables, subject themes, role themes, approved reference tokens and reduced-motion tokens.
- `packages/ui`: keep generic UI primitives only: shell, sidebar, topbar, card, table, badge, modal, tabs, form controls, progress, charts wrapper, chat primitives and responsive layout.
- `packages/ai-assistant`: reusable assistant state machine, widget, bubble, chat panel and contextual event API.
- `packages/science-core`: units, sources, verification status, safety, metadata and visualization guardrails.
- `packages/content-core`: modules, lessons, tasks, content blocks, content pack manifests and publication states.
- `packages/content-qa-core`: review queues, transitions, comments, source checks and publish gates.
- `packages/progress-core`: attempts, progress events, skill graph contracts and analytics events.
- `packages/chemistry-core`: molecules, reactions, reagents, hazards, observations and lab scenario data contracts.
- `packages/chemistry-lab-engine`: deterministic reaction/lab timeline state from verified data.
- `packages/molecule-viewer`: browser/mobile-compatible molecule render adapters where possible.
- `packages/physics-core`: formulas, variables, constraints, graph definitions and simulation scenario contracts.
- `packages/physics-sim-engine`: deterministic state update and graph generation.
- `packages/biology-core`: samples, structures, labels, magnification and microscope metadata.
- `packages/microscope-viewer`: microscope viewport state and renderer adapters.

Backend remains the security authority. Shared packages may mirror policy for UI display, but must not decide access or publication security.

## 5. Migration plan without breaking current app

1. Freeze current production behavior.
   Do not change `/api/v1/web`, `/api/v1/admin/web`, backend routes, mobile runtime or legacy static assets while approved UI is being prepared.

2. Formalize the frontend foundation.
   Add npm workspaces or explicit package linking, add root CI gates for `typecheck:*` and `build:*`, and keep Next apps non-production.

3. Create approved UI foundation package work.
   Expand tokens and UI primitives first, then implement screen-specific components as reusable pieces. Do not implement approved screens as static screenshots.

4. Add web auth/session architecture behind non-production routes.
   Use existing `packages/api-client` auth contracts and backend `/auth/*` routes. Build protected shells without switching production traffic.

5. Build one vertical slice first: approved student dashboard.
   Use existing student dashboard design contracts/artifacts, wire it to typed demo/adapters, and verify with screenshot comparison.

6. Add AI assistant shared state machine and widget.
   Implement approved states with CSS/reduced-motion first, connect to current module/task context through typed props, and wire to `/ai-mentor/*` later.

7. Extract science engines from mobile logic into shared packages gradually.
   Start with pure data/state functions, then renderer adapters. Avoid touching mobile behavior until package parity tests exist.

8. Normalize content contracts before adding complex labs/sims.
   Define content/source/science/core contracts and map current backend/mobile JSON to them. Keep existing endpoints stable.

9. Add CI and visual gates.
   Run Next typecheck/build, API-client tests, UI foundation smoke, Playwright screenshot capture and reference comparisons before any production route switch.

10. Switch route-by-route only with rollback.
   Production routing should be changed only after explicit approval, parity reports, monitoring and rollback instructions.

## 6. Required packages/dependencies

Already present and useful:

- `next`, `react`, `react-dom`, `typescript` for web/admin foundation.
- `fastapi`, `uvicorn`, `SQLAlchemy`, `psycopg`, `alembic`, `redis`, `httpx`, `bcrypt` for backend.
- `expo`, `react-native`, `expo-sqlite`, `expo-gl`, `expo-three`, `three`, React Navigation, NetInfo and AsyncStorage for mobile.
- `vitest` in `packages/api-client`.
- `playwright` in `tools`.

Recommended next additions after approval:

- Root npm workspaces configuration, or an explicit monorepo tool decision.
- A package-level test runner strategy for `packages/ui`, `packages/design-tokens`, `packages/api-client` and future engines.
- `@testing-library/react` / DOM test environment for shared React UI components.
- Playwright project config for `apps/web` and `apps/admin` screenshots.
- A visual comparison tool or hardened existing `tools/check-visual-parity.mjs` workflow for all approved references.
- Accessibility tooling such as axe integration for key web/admin flows.
- A charting/rendering decision for admin graphs and physics plots.
- A browser 3D renderer plan for molecule/lab/simulation views, likely based on `three` with lazy loading.
- A migration workflow for backend schema changes: Alembic env/versions and CI migration check.

Do not add Rive/Lottie/heavy animation dependencies in the first milestone. The current AI assistant design lock explicitly allows lightweight CSS/state animation first.

## 7. Risks

- Production risk: switching web routes too early would replace stable FastAPI-served legacy pages with placeholder Next routes.
- Data risk: startup-created/raw SQL tables and JSON state make schema evolution and rollback harder than migration-controlled persistence.
- Security risk: Next protected routes do not exist yet, so admin/user approved UI must not be exposed as production surfaces before auth middleware and backend enforcement are verified.
- Scientific accuracy risk: current visual engines can render educational states, but verified/source-backed simulation contracts are incomplete.
- QA risk: approved references beyond student dashboard do not yet have automated screenshot comparison gates.
- DX risk: React 19 web foundation and React 18 Expo mobile cannot blindly share UI components; shared packages need pure types/tokens/core first, with renderer-specific UI adapters.
- Encoding/localization risk: some Russian web source output appears garbled in terminal; browser/source verification is needed before building approved Russian UI copy.
- Worktree risk: many unrelated modified/untracked files already exist. Future tasks must avoid broad formatting, deletion, renaming or cleanup.

## 8. First implementation milestone

Milestone: Approved UI foundation and student dashboard vertical slice, still non-production.

Goal:

- Keep production routes unchanged.
- Keep backend unchanged except read-only contract usage.
- Convert `approved_web_student_dashboard` and shared approved style into reusable tokens/components.
- Add the AI assistant widget shell/state machine as a reusable non-destructive component.
- Wire the student dashboard through typed mock/adapted data, not screenshot pasting.
- Add screenshot/visual checks against the approved student dashboard assets.

Acceptance criteria:

- `apps/web/design-preview/student-dashboard` and `/dashboard/student` use reusable components rather than one-off static layout blocks.
- `packages/ui` has reusable primitives needed by the dashboard and later admin/lab screens.
- `packages/design-tokens` exposes approved style tokens as CSS variables or typed maps.
- AI assistant component supports all required visual states with reduced-motion support.
- `npm run typecheck:web`, `npm run typecheck:ui`, `npm run typecheck:tokens`, `npm run build:web` pass.
- Existing visual parity tool captures and compares the student dashboard route.
- No production Docker, FastAPI static routes, backend behavior or legacy web/admin files are changed.

## 9. Exact list of files that should be created/edited in the next task

Recommended create:

- `packages/ui/src/components/AppShell.tsx`
- `packages/ui/src/components/Sidebar.tsx`
- `packages/ui/src/components/Topbar.tsx`
- `packages/ui/src/components/Card.tsx`
- `packages/ui/src/components/Badge.tsx`
- `packages/ui/src/components/Progress.tsx`
- `packages/ui/src/components/Table.tsx`
- `packages/ui/src/components/Modal.tsx`
- `packages/ui/src/components/Tabs.tsx`
- `packages/ui/src/components/Controls.tsx`
- `packages/ui/src/components/Chat.tsx`
- `packages/ui/src/components/AiAssistant.tsx`
- `packages/ui/src/components/StudentDashboard.tsx`
- `packages/ui/src/components/index.ts`
- `packages/ui/src/tokens.css`
- `packages/ui/src/approved-theme.css`
- `packages/ai-assistant/package.json`
- `packages/ai-assistant/tsconfig.json`
- `packages/ai-assistant/src/index.ts`
- `packages/ai-assistant/src/state.ts`
- `packages/ai-assistant/src/context.ts`
- `packages/ai-assistant/src/types.ts`
- `apps/web/lib/adapters/student-dashboard.ts`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedAiAssistantWidget.tsx`
- `tools/playwright-approved-ui-smoke.mjs`
- `docs/design/implementation-reports/approved-ui-milestone-1.md`

Recommended edit:

- `package.json`
- `package-lock.json`
- `packages/design-tokens/src/index.ts`
- `packages/ui/src/index.tsx`
- `packages/ui/src/styles.css`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/app/dashboard/student/page.tsx`
- `apps/web/app/design-preview/student-dashboard/page.tsx`
- `apps/web/components/student-dashboard-preview.tsx`
- `apps/web/lib/demo/student-dashboard-demo-data.ts`
- `docs/quality/current-quality-gates.md`

Recommended do not edit in the next UI-only task:

- `backend/app/web_admin/*`
- `backend/app/web_public/*`
- `backend/app/api/v1/*`
- `backend/app/services/*`
- `infra/docker-compose.yml`
- production route/proxy configuration

## Verdict

PARTIALLY READY.

What blocks direct approved UI implementation right now:

- The Next.js web/admin apps are foundation placeholders, not authenticated production-ready apps.
- There is no protected route/session/role shell architecture in Next yet.
- Approved references beyond student dashboard are not decomposed into reusable component contracts.
- Science engines and AI assistant state are not shared packages yet.
- CI/QA does not gate Next builds or visual regression for all approved references.
- Production still serves legacy FastAPI static pages, and route switching is explicitly not approved.

Minimal safe next step:

Build the non-production approved UI foundation milestone around `approved_web_student_dashboard`: expand tokens/components, add reusable AI assistant states, keep all production routes unchanged, and add typecheck/build/visual smoke gates before touching any route switch or backend behavior.
