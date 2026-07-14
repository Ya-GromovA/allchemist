# Codex Handoff — Milestone 2.3 Shell Behavior Fix

## 1. Executive Summary

Milestone 2.3 fixed the approved student dashboard shell behavior. The desktop sidebar is pinned, the main panel scrolls independently, `Визуализация` and `Справочники` have accessible accordion submenus, active route metadata is now part of the typed sidebar model, and visual smoke checks cover the behavior.

No production routes were switched. No backend, legacy web admin/public, infra, or mobile runtime files were intentionally edited. No commit was created.

## 2. Fixed Behavior

- Desktop sidebar remains visible and stable while main content scrolls.
- Sidebar footer content stays inside the sidebar.
- Nav area can scroll internally.
- Accordion submenus are clickable, keyboard accessible, animated, and reduced-motion aware.
- Russian dashboard text renders as UTF-8 instead of mojibake/question marks.
- Smoke checks now fail on mojibake, horizontal overflow, sidebar movement, and missing submenu links.

## 3. Sidebar Behavior

- Root shell uses `height: 100dvh` and `overflow: hidden` on desktop.
- Main content is the scroll container.
- Sidebar uses full viewport height and remains in the left app-shell column.
- Tablet/mobile reset shell height and overflow to normal document flow for accessibility.

## 4. Accordion Behavior

`Визуализация` children:

- `3D-молекулы`
- `Симуляторы`
- `Микроскоп`
- `3D-клетка`
- `Анатомия`

`Справочники` children:

- `Таблица элементов`
- `Формулы`
- `Законы и константы`
- `Реакции`

Implementation uses typed sidebar config, buttons, `aria-expanded`, `aria-controls`, chevron state, and CSS submenu transitions.

## 5. Active Route Behavior

- `/design-preview/student-dashboard` -> `Главная`
- `/dashboard/student` -> `Главная`
- `/modules/visualization/molecules` -> `Визуализация` / `3D-молекулы`
- `/modules/physics` -> `Визуализация` / `Симуляторы`
- `/modules/biology` -> `Визуализация` / `Микроскоп`
- `/reference/periodic-table` -> `Справочники` / `Таблица элементов`

The component accepts `currentPath`; the preview defaults to `/design-preview/student-dashboard`.

## 6. New Screenshots

- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-preview-top.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-preview-scrolled.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-visualization-open.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/desktop-reference-open.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/tablet-preview.png`
- `artifacts/ui-snapshots/milestone-2-3/student-dashboard/mobile-preview.png`

## 7. Commands and Results

- `npm run typecheck:tokens` — PASS
- `npm run typecheck:ui` — PASS
- `npm run typecheck:ai-assistant` — PASS
- `npm run typecheck:web` — PASS
- `npm run build:web` — PASS
- `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` — PASS

Intermediate result:

- First updated smoke run failed on mobile horizontal overflow from submenu links. CSS was fixed and the command was rerun with PASS.

## 8. Files Changed

- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `apps/web/lib/adapters/student-dashboard.ts`
- `tools/playwright-approved-ui-smoke.mjs`
- `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_2_3_SHELL_BEHAVIOR_FIX.md`
- `docs/architecture/CODEX_HANDOFF_MILESTONE_2_3_SHELL_BEHAVIOR_FIX.md`

`git diff --name-only` does not list the app files because the `apps/` tree is currently untracked in the dirty worktree.

## 9. Current Git Status

```text
 M assistant_log.md
 M backend/app/api/v1/endpoints/admin_panel.py
 M backend/app/api/v1/endpoints/public_web.py
 M backend/app/api/v1/endpoints/system.py
 M backend/app/services/admin_panel_service.py
 M backend/app/web_admin/app.js
 M backend/app/web_admin/index.html
 M backend/app/web_admin/styles.css
 M backend/app/web_public/app.js
 M backend/app/web_public/index.html
 M backend/app/web_public/styles.css
 M backend/data/security/alerts_ack.json
 M backend/data/security/backup_dry_run_history.json
 M backend/data/security/backup_dry_run_status.json
 M backend/data/security/go_no_go_history.json
 M backend/data/security/handover_archive.json
 M backend/data/security/mobile_onboarding_smoke_status.json
 M backend/data/user_state.json
 M backend/tests/test_admin_panel.py
 M backend/tests/test_admin_web.py
 M backend/tests/test_public_web.py
 M content_packs/allchemist-apk-latest.json
 M docs/qa/stage-ledger.md
 M mobile/App.tsx
 M mobile/android/app/build.gradle
 M mobile/app/components/AppBackground.tsx
 M mobile/app/screens/OnboardingRoleScreen.tsx
 M mobile/app/screens/PeriodicTableScreen.tsx
 M mobile/app/screens/WebFallbackShell.tsx
 M mobile/assets/content/chemistry_pack_v1.json
 M mobile/assets/content/physics_pack_v1.json
 M tools/playwright-admin-auth-roles-smoke.mjs
 M tools/playwright-authenticated-roles-smoke.mjs
 M tools/playwright-visual-smoke.mjs
?? AGENTS.md
?? apps/
?? artifacts/
?? backend/app/web_public/alchemist-hero.png
?? backend/app/web_public/alchemist-hero.webp
?? backend/app/web_public/fon-2.png
?? backend/app/web_public/fon-2.webp
?? backend/app/web_public/main-bg-science.png
?? backend/app/web_public/main-bg-science.webp
?? backend/app/web_public/periodic-table-reference.png
?? backend/app/web_public/periodic-table-reference.webp
?? backend/app/web_public_react/
?? docs/architecture/
?? docs/codex/
?? docs/contracts/
?? docs/design/
?? docs/infra/
?? docs/migration/
?? docs/product/
?? docs/quality/
?? mobile/assets/backgrounds/
?? mobile/assets/brand/
?? mobile/assets/periodic-table/
?? package-lock.json
?? package.json
?? packages/
?? tools/capture-ui-snapshots.mjs
?? tools/check-layout-contract.mjs
?? tools/check-student-dashboard-assets.mjs
?? tools/check-student-dashboard-production-readiness.mjs
?? tools/check-student-dashboard-quality.mjs
?? tools/check-student-dashboard-zone-parity.mjs
?? tools/check-visual-parity.mjs
?? tools/extract-student-dashboard-zones.mjs
?? tools/figma-student-dashboard-layer-generator/
?? tools/playwright-approved-ui-smoke.mjs
?? tools/profile-server.mjs
?? tools/ui-foundation-smoke.mjs
?? tools/verify-contract-layer.mjs
?? tools/verify-ui-foundation.mjs
```

## 10. Remaining Gaps

- Root `/` landing remains outside scope and may still show mojibake.
- The shell should later be extracted from `ApprovedStudentDashboard.tsx` into a shared route shell after another approved screen reuses it.
- Mobile should later move from compact inline sidebar to a proper drawer/top-nav shell.

## 11. Ready for Next Milestone

YES.

Recommended next milestone: build the next approved vertical slice using the same shell without switching production routes.

## 12. Reports

- `docs/architecture/IMPLEMENTATION_REPORT_MILESTONE_2_3_SHELL_BEHAVIOR_FIX.md`
- `docs/architecture/CODEX_HANDOFF_MILESTONE_2_3_SHELL_BEHAVIOR_FIX.md`
