# Approved UI Visual QA Plan

Date: 2026-07-08
Scope: foundation plan plus a safe smoke script. This does not block production routes.

## Approved References Requiring Screenshot Comparison

- `approved_web_landing`
- `approved_web_student_dashboard`
- `approved_web_chemistry_lab`
- `approved_web_physics_simulation`
- `approved_web_biology_microscope`
- `approved_admin_dashboard`
- `approved_admin_content_qa`
- `approved_ai_assistant`
- `approved_mobile_student_dashboard`

## Planned Routes

Initial non-production web/admin routes:

- `apps/web`: `/`, `/dashboard/student`, `/design-preview/student-dashboard`, `/modules/chemistry`, `/modules/physics`, `/modules/biology`.
- `apps/admin`: `/dashboard`, `/content-qa`, `/reaction-packs`, `/physics-simulations`, `/biology-microscope-packs`.

Future approved lab/simulation/microscope routes should be added behind non-production paths or feature flags before production switch.

## Visual Smoke Process

1. Start the relevant Next app on a non-production port.
2. Capture desktop and mobile screenshots.
3. Compare against approved reference crops or golden images.
4. Save screenshots, visual diffs and JSON reports under `artifacts/ui-snapshots`.
5. Record deviations in `docs/design/implementation-reports`.

## Non-Blocking Production Rule

Visual QA must not change FastAPI production routes, Docker routing, proxy settings or legacy static pages. A failed visual check blocks the new approved UI milestone, not the current production service.

## Initial Diff Tolerance

For foundation milestones:

- fail on blank pages, broken assets, horizontal overflow, overlapping primary UI, missing sidebar/topbar/card structure or missing assistant state;
- warn on small spacing/typography deviations while components are still being extracted;
- fail when screenshot is a pasted static reference rather than real UI.

For production route switch:

- use tighter per-zone thresholds;
- require desktop and mobile comparisons;
- require documented accepted deviations.

## Codex Reports

Codex should save:

- command output summary;
- screenshot paths;
- JSON diff reports;
- route list;
- viewport list;
- known deviations and next actions.

## Skeleton Script

`tools/playwright-approved-ui-smoke.mjs` is a safe skeleton. It validates configuration and prints the intended routes. It exits successfully when no live target is provided, so it can be added before the full Playwright pipeline is wired.
