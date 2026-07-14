# Allchemist Agent Instructions

Allchemist is an interactive AI/STEM learning platform for Chemistry, Physics, and Biology. Treat it as a product platform with scientific content, role-based access, monetization, admin operations, and future web/mobile visualization engines. It is not a static video library, a chemistry-only app, a decorative animation showcase, or a legacy UI reskin.

## Current repository orientation

- Backend: FastAPI application under `backend/app`, with API v1 routes in `backend/app/api/v1`.
- Production static web: `backend/app/web_public` is the current public/cabinet web reference.
- Production static admin: `backend/app/web_admin` is the current admin reference.
- Mobile: `mobile` is an Expo/React Native project. In this checkout `mobile/src` is minimal, while the manifest already carries Expo, TypeScript, SQLite, GL, Three, notifications, and navigation dependencies.
- Content and APK artifacts: `content_packs` contains APK metadata, content packs, and release artifacts.
- Docs and operational notes: `docs/ops`, `docs/qa`, and web admin manuals contain important production history.

Use legacy `web_admin` and `web_public` only to understand existing API endpoints, auth behavior, roles, permissions, data contracts, business flows, and edge cases. Do not copy or preserve their visual design in new UI work.

## Hard rules

1. Do not delete legacy `backend/app/web_admin` or `backend/app/web_public`.
2. Do not break existing backend behavior.
3. Do not change auth, roles, licensing, access, or payment behavior without explicit approval.
4. Do not switch production routes to a new app until the migration plan and verification gates are approved.
5. Do not copy the legacy visual design. Preserve contracts and behavior, not appearance.
6. Build new web, admin, and mobile-compatible architecture in parallel.
7. Prefer TypeScript for all new frontend and shared code.
8. Do not add heavy Three.js, Rive, or Lottie runtime until architecture boundaries, placeholders, lazy-loading, and fallbacks exist.
9. Every implementation task must run verification commands and report results.
10. Every response after changes must list changed files, commands run, test/build results, and remaining risks.
11. Chemistry, Physics, and Biology are first-class modules.
12. Avoid chemistry-only assumptions in shared player, UI, content, access, analytics, or assessment packages.
13. Visualizations must be driven by scientific data contracts, not hardcoded random effects.
14. AI-generated content must not be published without Content QA.

## Scientific product rule

All scientific visualizations must be data-driven and source-backed.

- A real solution color must come from verified content metadata.
- A precipitate must be defined in reaction data.
- Gas release must identify the gas in reaction data.
- Smell must be shown as a text label or safety note, never as a fake visual.
- Process animation must support learning and match the approved educational model.
- Unsupported AI facts must remain draft-only and blocked from publication.

## Target architecture direction

Move gradually toward:

```text
apps/
  api/
  web/
  admin/
  mobile/

packages/
  types/
  api-client/
  ui/
  design-tokens/
  assets/
  science-core/
  chemistry-core/
  physics-core/
  biology-core/
  chemistry-lab-engine/
  physics-sim-engine/
  biology-lab-engine/
  lab-scene/
  lab-effects/
  molecule-viewer/
  physics-scene/
  microscope-viewer/
  anatomy-viewer/
  cell-viewer/
  simulation-player/
  interactive-player/
  live-lesson-core/
  content-core/
  media-core/
  source-core/
  content-qa-core/
  assessment-core/
  ai-tutor-core/
  progress-core/
  access-core/
  monetization-core/
  analytics-core/
```

This is a migration target, not permission to rewrite everything at once.

## Before changing code

- Inspect the relevant existing backend endpoint and service.
- Inspect current static web/admin behavior if the feature already exists there.
- Identify the role/access/licensing impact.
- Identify the content/QA/scientific data impact.
- Decide what contracts must remain stable.
- Add or update tests/checks appropriate to the change.

## Verification baseline

For documentation-only changes, run at least:

- `git diff --check`
- a simple file existence/content check for created docs

For backend/API changes, add relevant pytest coverage and run focused tests before broader checks. For frontend/shared TypeScript changes, run typecheck/build/lint where available. For production-sensitive changes, run `python3 tools/production_monitor_probe.py` when the environment supports it.

## Future verification rule

Every future implementation task must run the relevant verification command and report results. For contract-layer work, run `node tools/verify-contract-layer.mjs`. If UI is changed later, add Playwright visual smoke tests before claiming visual readiness.

## UI verification rule

Any future UI task must run `node tools/verify-contract-layer.mjs` and `node tools/verify-ui-foundation.mjs` when UI foundation files are affected. If UI screenshots or baselines exist later, update them intentionally and document the reason.

## Approved Figma design-lock rule

- Approved Figma references are the visual source of truth for new UI work.
- Current approved source: `https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7`, node `2:7`, page `06_APPROVED_FOR_CODEX`.
- Do not implement product screens from memory, imagination, draft references, legacy screenshots, or pasted static images.
- Do not use draft references when an approved reference is required.
- Do not alter global navigation, logo behavior, or sidebar ordering without explicit approval.
- Any UI task must run `node tools/verify-contract-layer.mjs` and `node tools/verify-ui-foundation.mjs`.
- Future UI implementation must capture screenshots and report deviations from the approved Figma reference.

## Mobile approved-reference design-lock rule

- Current mobile first-viewport source: `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW`, node `10:19`.
- Current mobile loading source: `APPROVED_MOBILE_LOADING_SCREEN`, node `10:20`.
- The old long mobile dashboard, if encountered, is reference-only for below-the-fold content.
- Mobile bottom navigation order is locked: `Главная`, `Модули`, `Задания`, `AI`, `Профиль`.
- Do not add `Live-урок` to mobile bottom navigation; live lesson belongs in dashboard card/quick access and opens on a separate route/screen.
- The AI assistant floating bubble must not overlap mobile bottom navigation.
- Do not implement mobile screens or change mobile app behavior during documentation-only design-lock updates.
