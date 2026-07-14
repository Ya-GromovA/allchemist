# Codex Handoff — UI-PROD-1 Student Shell

## 1. Summary

UI-PROD-1 improved the student dashboard shell and validation coverage. Sidebar behavior is now production-style fixed on desktop, main content scrolls independently, accordion behavior is preserved, typed data readiness improved, and required reports/plans were created.

No commit, no `git add`, no route switch, no systemd/nginx enablement.

## 2. Visual Parity Result

Estimated visual parity: 76%.

- Sidebar: PASS
- Topbar: PARTIAL
- Hero: PARTIAL
- Quick access: PASS
- Main grid/cards: PARTIAL
- Floating assistant: PARTIAL
- Responsive: PASS

Not ready to move to the next screen because target is >=85%.

## 3. Sidebar Fixed Result

PASS. Sidebar is fixed with `height: 100dvh`, main content scrolls independently, and smoke verifies the sidebar bounding box before/after main scroll.

## 4. Accordion Result

PASS. `Визуализация` and `Справочники` open/close with submenus, chevrons, `aria-expanded`, and keyboard-accessible buttons.

## 5. Data Contract

Created `docs/design/STUDENT_DASHBOARD_DATA_CONTRACT.md`.

Static typed data now includes route/status/type/reason/license/explanation fields for current dashboard zones.

## 6. Quality Scorecard

Created `docs/quality/PROJECT_READINESS_SCORECARD.md`.

Headline scores:

- Approved UI visual parity: 76%
- Student shell UX behavior: 93%
- Responsive behavior: 86%
- Static data mapping: 82%
- Real backend integration: 25%
- Production deployment readiness: 45%

## 7. Cleanup Inspection

Created `docs/architecture/PROJECT_CLEANUP_INSPECTION.md`.

No cleanup was performed. Dirty/untracked worktree is documented and should not be cleaned without checkpoint/commit approval.

## 8. Persistent Preview Plan

Created `docs/infra/PERSISTENT_PREVIEW_DEPLOYMENT_PLAN.md`.

Example configs created but not enabled:

- `infra/systemd/allchemist-web-preview.service.example`
- `infra/nginx/allchemist-web-preview.conf.example`

## 9. Screenshots

- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/desktop-top.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/desktop-scrolled.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/visualization-open.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/reference-open.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/tablet.png`
- `artifacts/ui-snapshots/ui-prod-1/student-dashboard/mobile.png`

## 10. Commands and Results

- `npm run typecheck:tokens` — PASS
- `npm run typecheck:ui` — PASS
- `npm run typecheck:ai-assistant` — PASS
- `npm run typecheck:web` — PASS
- `npm run build:web` — PASS
- `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` — PASS

## 11. Files Changed

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

## 12. Remaining Blockers

- Clean approved-quality hero/popular/anatomy/assistant assets are needed. Existing PNGs under `design-preview/student-dashboard` contain UI crop artifacts and should not be used as production card images.
- Pixel/zone visual diff should be added before claiming >=85%.
- Loading/empty/error states remain documented but not implemented.
- Real backend/dashboard APIs are not wired.

## 13. Ready for Next Milestone

NO.

Recommended next step: continue student dashboard parity with clean approved media assets and zone-based visual diff until parity reaches >=85%.
