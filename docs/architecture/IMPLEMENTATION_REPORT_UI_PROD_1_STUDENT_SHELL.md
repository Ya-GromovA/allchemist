# Implementation Report — UI-PROD-1 Student Shell

## Summary

UI-PROD-1 improved the approved student dashboard shell and visual system without switching production routes. The desktop sidebar is now a fixed production-style shell outside document scroll, main content scrolls independently, accordion submenus remain accessible, static dashboard content is typed and mapped for future real data, and UI smoke checks now write `ui-prod-1` screenshots.

## Visual Parity Result

Estimated desktop visual parity: 76%.

Zone results:

| Zone | Result | Notes |
| --- | --- | --- |
| Sidebar | PASS | Fixed shell, deep blue theme, active item, bottom license/control, internal nav scroll |
| Topbar | PARTIAL | Layout and search/profile cluster are close but avatar/media fidelity differs |
| Hero cards | PARTIAL | Correct data and layout, but clean SVG assets are less premium than approved media |
| Quick access | PASS | Dense route-aware grid with icons and badge |
| Main cards | PARTIAL | Density and typography improved; card proportions still not exact |
| Floating assistant | PARTIAL | Dynamic typed bubble/robot retained; not pixel-identical to approved robot asset |
| Responsive | PASS | Smoke passes tablet/mobile no-overflow and submenu access |

Ready to move to next screen: NO, because visual parity target is >=85% and current estimated parity is 76%.

## Shell and Sidebar

- Desktop app root uses fixed-height shell.
- Sidebar uses `position: fixed`, `height: 100dvh`, fixed width, and is not part of document scroll.
- Main content uses `margin-left` and `overflow-y: auto`.
- Playwright smoke checks sidebar bounding box before/after main scroll.
- Local Windows tunnel fragility was mitigated with a keeper script outside the repo, but the production-grade fix is documented separately.

## Accordion

- `Визуализация` and `Справочники` remain button-based accordions.
- Submenus expose child links with indentation and connector lines.
- `aria-expanded`, `aria-controls`, keyboard accessibility, and reduced-motion behavior are preserved.

## Data Contract

- Added route/status/type/reason/license/explanation fields in typed dashboard data where needed.
- Quick access, popular content, weak topics, locked feature, weekly progress, and assistant hints are better prepared for real data.
- Full mapping is documented in `docs/design/STUDENT_DASHBOARD_DATA_CONTRACT.md`.

## Smoke and Screenshots

Updated `tools/playwright-approved-ui-smoke.mjs`:

- Output path: `artifacts/ui-snapshots/ui-prod-1/student-dashboard`
- Desktop viewport: `1672x941` to match approved reference dimensions.
- Checks:
  - HTTP 200 for `/design-preview/student-dashboard` and `/dashboard/student`
  - no mojibake/question mark runs
  - no horizontal overflow
  - active `Главная`
  - floating assistant visible
  - quick access visible
  - desktop first viewport density
  - sidebar fixed before/after main scroll
  - `Визуализация` submenu visible
  - `Справочники` submenu visible

Screenshots:

- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/desktop-top.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/desktop-scrolled.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/visualization-open.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/reference-open.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/tablet.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/mobile.png`

## Commands

- `npm run typecheck:tokens` — PASS
- `npm run typecheck:ui` — PASS
- `npm run typecheck:ai-assistant` — PASS
- `npm run typecheck:web` — PASS
- `npm run build:web` — PASS
- `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` — PASS

## Files Changed

- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `apps/web/lib/adapters/student-dashboard.ts`
- `tools/playwright-approved-ui-smoke.mjs`
- `docs/architecture/UI_PROD_1_BASELINE_BEFORE_WORK.md`
- `docs/design/STUDENT_DASHBOARD_DATA_CONTRACT.md`
- `docs/quality/PROJECT_READINESS_SCORECARD.md`
- `docs/architecture/PROJECT_CLEANUP_INSPECTION.md`
- `docs/infra/PERSISTENT_PREVIEW_DEPLOYMENT_PLAN.md`
- `infra/systemd/allchemist-web-preview.service.example`
- `infra/nginx/allchemist-web-preview.conf.example`
- `docs/architecture/IMPLEMENTATION_REPORT_UI_PROD_1_STUDENT_SHELL.md`
- `docs/architecture/CODEX_HANDOFF_UI_PROD_1_STUDENT_SHELL.md`

## Remaining Blockers

- Need clean approved-quality per-card media assets, not cropped UI screenshots.
- Need visual diff/zone parity tooling with numeric threshold against the approved reference.
- Need final shared shell extraction after the student dashboard is accepted.
- Need real backend data contracts and loading/empty/error states.

## Verdict

Ready for next milestone: NO.

Minimum safe next step: create/approve clean per-zone media assets and continue student dashboard visual parity until desktop score reaches >=85%.
