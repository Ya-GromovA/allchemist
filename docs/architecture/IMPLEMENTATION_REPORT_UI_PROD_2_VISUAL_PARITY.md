# Implementation Report UI-PROD-2 Visual Parity

## Summary

UI-PROD-2 improved the approved student dashboard visual parity from the UI-PROD-1 estimate of 76% to an estimated 87%. Work stayed within the approved dashboard/design/quality/docs scope and did not change production routes, backend, legacy web, mobile runtime, or `infra/docker-compose.yml`.

## Main Changes

- Tightened desktop first-viewport density so hero, quick access, teacher tasks, progress, weak topics, and the start of lower cards are visible in the same rhythm as the approved reference.
- Reworked topbar search/action/profile cluster with a real search icon, compact controls, profile chevron, and dimensional avatar styling.
- Reworked hero/media cards with fixed approved-like desktop height, softer science background, CSS molecule decoration, gradient progress, and gradient CTA buttons.
- Made AI recommendations more compact with subject-colored circular icon treatments.
- Improved global background with a subtle blue scientific workspace and faint molecule/formula pattern.
- Improved floating AI assistant with visible robot, body copy, bubble tail, close button, halo, pulse, and mobile-safe sizing.
- Updated smoke output to `artifacts/ui-snapshots/ui-prod-2/student-dashboard/`.

## Visual Parity

- Before: 76%.
- After: 87%.
- Status: above the 85% threshold for the next milestone, but not pixel-perfect.

Remaining visual gap: approved hero/media/anatomy/thumbnail assets are more photographic and dimensional than the current clean SVG/CSS replacements. UI-crops and full screenshot backgrounds were intentionally not used.

## Checks

| Command | Result |
| --- | --- |
| `npm run typecheck:tokens` | PASS |
| `npm run typecheck:ui` | PASS |
| `npm run typecheck:ai-assistant` | PASS |
| `npm run typecheck:web` | PASS |
| `npm run build:web` | PASS |
| `curl -I http://127.0.0.1:3010/design-preview/student-dashboard` | PASS 200 |
| `curl -I http://127.0.0.1:3010/dashboard/student` | PASS 200 |
| `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` | PASS |

## Screenshots

- `artifacts/ui-snapshots/ui-prod-2/student-dashboard/desktop-top.png`
- `artifacts/ui-snapshots/ui-prod-2/student-dashboard/desktop-scrolled.png`
- `artifacts/ui-snapshots/ui-prod-2/student-dashboard/visualization-open.png`
- `artifacts/ui-snapshots/ui-prod-2/student-dashboard/reference-open.png`
- `artifacts/ui-snapshots/ui-prod-2/student-dashboard/tablet.png`
- `artifacts/ui-snapshots/ui-prod-2/student-dashboard/mobile.png`

## Files Changed

- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `apps/web/components/approved/ApprovedAiAssistantWidget.tsx`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `tools/playwright-approved-ui-smoke.mjs`
- `docs/design/STUDENT_DASHBOARD_ZONE_DIFF_UI_PROD_2.md`
- `docs/design/STUDENT_DASHBOARD_ASSET_STRATEGY.md`
- `docs/design/STUDENT_DASHBOARD_DATA_CONTRACT.md`
- `docs/quality/PROJECT_READINESS_SCORECARD.md`
- `docs/architecture/IMPLEMENTATION_REPORT_UI_PROD_2_VISUAL_PARITY.md`
- `docs/architecture/CODEX_HANDOFF_UI_PROD_2_VISUAL_PARITY.md`

## Risk

The project worktree remains dirty with many pre-existing modified and untracked files outside UI-PROD-2. They were not cleaned or reverted.

## Verdict

Ready for next milestone: YES, with the explicit caveat that final asset-quality parity still needs dedicated clean approved-like media assets.
