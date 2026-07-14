# Student Dashboard Production Implementation Plan

Date: 2026-07-07

## Source of Truth

- Figma file: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=20-25&m=dev
- Figma page: `10_SCREEN_ASSEMBLY`
- Base frame: `APPROVED_WEB_STUDENT_DASHBOARD_TRACING_BASE`
- Base frame size: `1672 x 941`
- Current preview route: `/design-preview/student-dashboard`

## Current Figma Scaffold Status

- The locked reference layer exists as `approved_web_student_dashboard_reference_LOCKED`.
- The generated editable scaffold exists inside the base frame as `STUDENT_DASHBOARD_EDITABLE_LAYERS_V1`.
- `CODEX_HANDOFF_NOTES` is outside the base frame and does not stretch the approved frame.
- The base frame has the correct `1672 x 941` desktop viewport dimensions and clip content enabled.
- Visual doubling when the locked reference is visible is expected.
- With the reference hidden, the scaffold is expected to show editable components plus placeholder image slots.

## Current Limitation

The approved reference is still a flat raster source for many fidelity-sensitive visuals. The code must not use a full-page screenshot as the UI. The implementation can use the current temporary image slots only for:

- chemistry hero illustration;
- live lesson Newton illustration;
- popular content thumbnails;
- locked anatomy visual;
- AI robot visual.

Clean source assets are still required before final visual approval.

## Current Readiness Terminology

- Engineering scaffold: can be ready when component structure, demo data, interactions, layout contract and viewport fit checks pass.
- Visual approval: blocked while visual parity is `FAIL`.
- Production ready: `false`.

The current screen must not be described as visual-review-ready while the visual parity report is failing.

## What Can Be Implemented Now

- Real React component structure for every major dashboard zone.
- Stable `data-testid` contract for layout, interaction, screenshot and future API-bound checks.
- Demo-data-driven content in `apps/web/lib/demo/student-dashboard-demo-data.ts`.
- Keyboard-accessible buttons and links with hover, focus and active states.
- Temporary asset-backed visual slots through `apps/web/public/design-assets/student-dashboard/manifest.json`.
- CSS token mirroring from `tools/figma-student-dashboard-layer-generator/student-dashboard.tokens.json`.
- Quality checks that distinguish engineering scaffold readiness from visual approval.

## What Remains Approximate

- Exact illustration fidelity for hero, lesson, popular cards, anatomy and AI assistant.
- Micro-shadow and blur matching where the Figma reference depends on flattened raster effects.
- Final image color/contrast parity until clean exported assets replace temporary slots.

## Current Approval State

- Engineering scaffold: ready only when the latest automated report returns `ENGINEERING_SCAFFOLD_READY`.
- Visual approval: blocked.
- Reason: visual parity is `FAIL` and clean assets are missing.
- Production ready: `false`.

## Implementation Contract

The non-production preview must expose the following major zones:

- `student-dashboard-page`
- `student-sidebar`
- `student-topbar`
- `student-greeting`
- `continue-learning-card`
- `live-lesson-card`
- `ai-recommendations-card`
- `quick-access-strip`
- `assignments-card`
- `subject-progress-card`
- `weak-topics-card`
- `popular-now-card`
- `weekly-progress-card`
- `locked-feature-card`
- `ai-assistant-widget`

The route remains non-production only and must not replace any production route until a separate approval step.
