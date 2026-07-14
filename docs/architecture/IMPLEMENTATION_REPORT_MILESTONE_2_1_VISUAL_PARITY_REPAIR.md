# Implementation Report — Milestone 2.1 Visual Parity Repair

## Summary

Milestone 2.1 repaired the `approved_web_student_dashboard` vertical slice toward the approved golden reference without switching production routes and without touching backend, legacy web, mobile runtime, or `infra/docker-compose.yml`.

The dashboard now uses approved zones: full sidebar, greeting/search/profile topbar, hero row, AI recommendations, quick access strip, teacher tasks, progress rings, weak topics, popular content, weekly progress, locked license feature, and floating AI assistant.

## Baseline visual problems

Baseline recorded in:

- `docs/architecture/MILESTONE_2_1_VISUAL_PARITY_BASELINE.md`

Main baseline gaps:

- simplified sidebar and missing approved navigation density;
- missing approved topbar search/profile/actions;
- missing quick access strip;
- missing weak topics, popular content, weekly progress, locked license card;
- inline assistant instead of approved floating assistant;
- desktop too sparse compared to reference.

## Approved zone map used

- `docs/design/STUDENT_DASHBOARD_APPROVED_ZONE_MAP.md`

## Files changed

- `apps/web/components/approved/ApprovedStudentDashboard.tsx`
- `apps/web/components/approved/ApprovedStudentDashboard.module.css`
- `apps/web/components/approved/ApprovedAiAssistantWidget.tsx`
- `apps/web/lib/demo/approved-student-dashboard.ts`
- `apps/web/lib/adapters/student-dashboard.ts`
- `tools/playwright-approved-ui-smoke.mjs`
- `docs/architecture/MILESTONE_2_1_VISUAL_PARITY_BASELINE.md`
- `docs/design/STUDENT_DASHBOARD_APPROVED_ZONE_MAP.md`

## Assets found/missing

Found and used:

- `apps/web/public/design-assets/student-dashboard/logo/allchemist-mark.svg`
- `apps/web/public/design-assets/student-dashboard/clean/illustrations/chemistry-hero-flask.svg`
- `apps/web/public/design-assets/student-dashboard/clean/illustrations/live-lesson-newton-cradle.svg`
- `apps/web/public/design-assets/student-dashboard/clean/illustrations/locked-anatomy-human.svg`
- `apps/web/public/design-assets/student-dashboard/clean/assistant/assistant-robot-dashboard.svg`
- `apps/web/public/design-assets/student-dashboard/clean/thumbnails/popular-neutralization.svg`
- `apps/web/public/design-assets/student-dashboard/clean/thumbnails/popular-free-fall.svg`
- `apps/web/public/design-assets/student-dashboard/clean/thumbnails/popular-plant-cell.svg`
- `apps/web/public/design-assets/student-dashboard/clean/icons/*.svg`

Missing:

- none for this repair pass.

## Layout changes

- Replaced simplified two-column dashboard with approved zone composition.
- Added full approved sidebar navigation with active state, message badge, license card, and collapse affordance.
- Added topbar greeting, subtitle, search, notifications, calendar, and profile.
- Added hero row with continue learning, live lesson, and AI recommendations.
- Added quick access strip.
- Added middle and bottom dashboard grids matching the approved information hierarchy.

## AI assistant changes

- Reworked AI assistant into a floating bottom-right assistant.
- Kept local state through `packages/ai-assistant`.
- Added reduced-motion-safe CSS animation.
- On mobile, assistant becomes a compact robot button to avoid covering text.

## Responsive changes

- Desktop keeps the approved dense multi-zone composition.
- Tablet wraps hero/middle/bottom cards without horizontal overflow.
- Mobile stacks cards vertically and uses compact sidebar navigation.
- Smoke script checks hidden wide elements in addition to document scroll width.

## Screenshot artifacts

Previous screenshots:

- `artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-preview.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/desktop-dashboard.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/tablet-dashboard.png`
- `artifacts/ui-snapshots/milestone-2/student-dashboard/mobile-dashboard.png`

New screenshots:

- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/desktop-preview.png`
- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/tablet-preview.png`
- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/mobile-preview.png`
- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/desktop-dashboard.png`
- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/tablet-dashboard.png`
- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/mobile-dashboard.png`

## Visual self-review checklist

| Zone | Result | Notes |
| --- | --- | --- |
| Sidebar | PASS | Deep-blue sidebar, logo, full nav, active item, badge, license card. |
| Topbar | PASS | Greeting/search/actions/profile present. |
| Hero row | PASS | Continue learning, live lesson, AI recommendations present. |
| AI recommendations | PASS | Dedicated right hero card with typed recommendations. |
| Quick access strip | PASS | Full approved quick access set present. |
| Teacher tasks | PASS | Teacher task card with statuses. |
| Progress rings | PASS | Three circular progress rings. |
| Weak topics | PASS | Weak topics card with repeat actions. |
| Popular content | PASS | Image-backed popular cards. |
| Weekly progress | PASS | Mini SVG line chart. |
| Locked feature card | PASS | License/anatomy card present. |
| Floating assistant | PARTIAL | Present and responsive; still not pixel-identical to golden robot/bubble. |
| Colors | PASS | Light canvas, deep-blue sidebar, cyan/blue accents. |
| Typography | PARTIAL | Hierarchy close; exact Figma sizing still approximate. |
| Spacing | PARTIAL | Much denser than baseline; not pixel-perfect. |
| Responsive behavior | PASS | Smoke passed desktop/tablet/mobile without horizontal overflow. |

## Commands and results

| command | result |
| --- | --- |
| `npm run typecheck:tokens` | PASS |
| `npm run typecheck:ui` | PASS |
| `npm run typecheck:ai-assistant` | PASS |
| `npm run typecheck:web` | PASS |
| `npm run build:web` | PASS |
| `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` | PASS |

Final smoke captured six screenshots under:

- `artifacts/ui-snapshots/milestone-2-1/student-dashboard/`

## Remaining gaps

- Not a pixel-perfect match to golden reference.
- Scientific illustrations are asset-based SVGs, not identical to the golden rendered imagery.
- Root `/` landing still contains mojibake/question marks; this is outside Milestone 2.1 student dashboard scope.
- Existing repository worktree remains heavily dirty from pre-existing changes.

## Ready for next milestone

YES for proceeding beyond student dashboard visual parity repair.

The student dashboard no longer has key-zone FAIL items in manual review, and automated smoke passes both routes across desktop/tablet/mobile.
