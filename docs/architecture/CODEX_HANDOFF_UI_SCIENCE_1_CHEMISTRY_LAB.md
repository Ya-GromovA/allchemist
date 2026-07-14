# Codex Handoff UI-SCIENCE-1 Chemistry Lab

## 1. Executive Summary

UI-SCIENCE-1 adds a draft, production-grade interactive Chemistry Lab vertical slice for `Zn + 2HCl -> ZnCl2 + H2`. It uses a reusable StudentShell, a configurable lab-engine scenario, and a targeted Playwright flow.

## 2. Route

- `/modules/chemistry/lab/zinc-hcl`
- `/modules/chemistry` now links to the lab.

## 3. Lab Engine

- Package: `packages/chemistry-lab-engine`.
- Scenario: `zincHydrochloricAcidLabScenario`.
- Safety/content flags:
  - `safetyStatus: needs_safety_review`
  - `publicationAllowed: false`

## 4. UI Zones

- StudentShell/sidebar/topbar.
- Breadcrumb.
- Central lab scene.
- Reactants/safety panel.
- Steps/progress/AI panel.
- Control panel.
- Observations card.
- Molecular explanation card.
- Content QA status card.

## 5. Interactions

- Start lab.
- Add Zn.
- Add HCl.
- Observe bubbles/temperature.
- Check pH.
- Complete conclusion.
- Reset lab.

## 6. Safety/Content Status

Draft only. Needs safety review. Publication is blocked in scenario data and visible in UI.

## 7. Screenshots

Expected after smoke:

- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/desktop-initial.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/desktop-reacting.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/desktop-completed.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/tablet.png`
- `artifacts/ui-snapshots/ui-science-1/chemistry-lab/mobile.png`

## 8. Commands And Results

| Command | Result |
| --- | --- |
| `npm run typecheck:tokens` | PASS |
| `npm run typecheck:ui` | PASS |
| `npm run typecheck:ai-assistant` | PASS |
| `npm run typecheck:chemistry-core` | PASS |
| `npm run typecheck:chemistry-lab-engine` | PASS |
| `npm run typecheck:science-core` | PASS |
| `npm run typecheck:web` | PASS |
| `npm run build:web` | PASS |
| `systemctl restart allchemist-web-preview` | PASS |
| `curl -I http://127.0.0.1:3010/modules/chemistry/lab/zinc-hcl` | PASS 200 |
| `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` | PASS |

Note: an earlier smoke run failed on mobile horizontal overflow in the new lab topbar; the UI-SCIENCE-1 CSS fix was applied and the final smoke passed.

## 9. Files Changed

- `packages/chemistry-lab-engine/src/types.ts`
- `packages/chemistry-lab-engine/src/scenario.ts`
- `packages/chemistry-lab-engine/src/reducer.ts`
- `apps/web/components/student-shell/StudentShell.tsx`
- `apps/web/components/chemistry-lab/ChemistryLabScreen.tsx`
- `apps/web/components/chemistry-lab/ChemistryLabScreen.module.css`
- `apps/web/lib/demo/chemistry-lab-zinc-hcl.ts`
- `apps/web/lib/adapters/chemistry-lab.ts`
- `apps/web/app/modules/chemistry/page.tsx`
- `apps/web/app/modules/chemistry/lab/zinc-hcl/page.tsx`
- `tools/playwright-approved-ui-smoke.mjs`
- `docs/architecture/UI_SCIENCE_1_CHEMISTRY_LAB_BASELINE.md`
- `docs/design/CHEMISTRY_LAB_DATA_CONTRACT.md`
- `docs/quality/PROJECT_READINESS_SCORECARD.md`
- `docs/architecture/IMPLEMENTATION_REPORT_UI_SCIENCE_1_CHEMISTRY_LAB.md`
- `docs/architecture/CODEX_HANDOFF_UI_SCIENCE_1_CHEMISTRY_LAB.md`

## 10. Remaining Blockers

- Approved chemistry lab reference exists in docs/Figma metadata, but no local golden PNG export exists.
- No backend/content QA/progress integration.
- Safety and content review are not complete.

## 11. Git Status

The worktree remains dirty with many pre-existing modified/untracked files outside this task. No cleanup, reset, staging, or commit was performed.

## 12. Recommended Next Step

Export or capture the approved chemistry lab reference, run zone-based parity, then connect the lab scenario to content QA/progress APIs after safety review.
