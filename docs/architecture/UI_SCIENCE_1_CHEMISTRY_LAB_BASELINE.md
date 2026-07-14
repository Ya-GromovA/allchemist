# UI-SCIENCE-1 Chemistry Lab Baseline

## Current Routes

- `/`
- `/dashboard/student`
- `/design-preview/student-dashboard`
- `/modules`
- `/modules/biology`
- `/modules/chemistry`
- `/modules/physics`

Planned in this milestone:

- `/modules/chemistry/lab/zinc-hcl`

## Current Chemistry-Related Files

- `apps/web/app/modules/chemistry/page.tsx`
- `packages/chemistry-core/src/types.ts`
- `packages/chemistry-core/src/demo.ts`
- `packages/chemistry-core/src/reactions.ts`
- `packages/chemistry-core/src/substances.ts`
- `packages/chemistry-lab-engine/src/types.ts`
- `packages/chemistry-lab-engine/src/scenario.ts`
- `packages/chemistry-lab-engine/src/reducer.ts`
- `packages/chemistry-lab-engine/src/index.ts`
- `packages/science-core/src/safety.ts`
- `packages/science-core/src/verification.ts`
- `docs/design/figma-approved-references.md`
- `docs/design/allchemist-design-lock.md`
- `docs/quality/APPROVED_UI_VISUAL_QA_PLAN.md`

## Approved Reference Path

Found in docs, not as a local golden PNG:

- `docs/design/figma-approved-references.md`
- Approved reference: `APPROVED_WEB_CHEMISTRY_LAB`
- Figma node: `3:10`
- Locked observations: chemistry module shell with deep-blue sidebar, module tabs, realistic lab canvas, reaction data panels, pH/temperature indicators, safety and explanation panels, and AI hint bubble.

No local `golden-approved-web-chemistry-lab.png` file was found under `apps/web/public`, `docs`, or `artifacts`.

## Existing Lab Engine Contracts

Before UI-SCIENCE-1, `packages/chemistry-lab-engine` had:

- `LabActionType`: lowercase `add_reagent`, `observe`, `check_ph`, `record_conclusion`, `reset`.
- `LabScenario`: reaction, safety strings, ordered steps.
- `LabState`: current step, completed steps, observations, warnings, conclusion flag.
- Reducer validation: expected action and reagent matching.

UI-SCIENCE-1 extends this toward a production-grade state machine with uppercase actions, explicit phases, safety review metadata, publication blocking, observations, and configurable explanations.

## Git Status Short

Baseline worktree was already dirty before this task. Relevant observed status included many pre-existing modified backend/mobile/legacy files and untracked frontend foundation directories:

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
M mobile/App.tsx
M mobile/app/screens/WebFallbackShell.tsx
?? apps/
?? artifacts/
?? docs/architecture/
?? docs/design/
?? docs/quality/
?? packages/
?? tools/playwright-approved-ui-smoke.mjs
```

No cleanup, reset, staging, or commit was performed.
