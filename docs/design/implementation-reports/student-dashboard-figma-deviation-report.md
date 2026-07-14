# Student Dashboard Figma Deviation Report

Figma source: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7
Approved page/node: `06_APPROVED_FOR_CODEX` / `2:7`
Approved reference: `3:12`, `APPROVED_WEB_STUDENT_DASHBOARD`
Implemented route: `/design-preview/student-dashboard`

## Current Parity Pass

Pass date: 2026-07-04
Scope: strict desktop visual parity correction only.
Viewport used for parity review: `1672x941`, `deviceScaleFactor: 1`.

Mobile was not implemented and no responsive-mobile deliverable was created in this pass.

## Golden Reference

- Golden reference path: `/root/synapse/apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`
- Golden reference dimensions: `1672x941`
- Source: Figma screenshot for node `3:12`, `APPROVED_WEB_STUDENT_DASHBOARD`

## Screenshot Outputs

- Implementation screenshot: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-desktop-parity-1672x941.png`
- Implementation screenshot dimensions: `1672x941`
- Side-by-side screenshot: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-side-by-side.png`
- Side-by-side dimensions: `3344x941`
- Visual diff screenshot: `/root/synapse/artifacts/ui-snapshots/web/student-dashboard-visual-diff.png`
- Visual diff dimensions: `1672x941`
- Zip: `/root/synapse/artifacts/ui-snapshots/student-dashboard-desktop-parity.zip`

## Exact Changes Made

- Updated `tools/capture-ui-snapshots.mjs` so the main desktop parity screenshot uses the approved `1672x941` viewport instead of the earlier `1366` desktop capture.
- Removed responsive mobile screenshot capture from the parity deliverable.
- Added generated side-by-side and visual-diff artifacts for manual review.
- Added zip packaging for golden reference, implementation screenshot, side-by-side, visual diff and this report.
- Saved the approved Figma screenshot as the golden local reference.
- Moved the dashboard greeting into the topbar area to match the approved desktop composition more closely.
- Replaced text/letter placeholder icons in sidebar, quick access, status rows, topbar actions and cards with a consistent inline SVG outline icon system.
- Restored the locked user sidebar order and active `Главная` state.
- Adjusted desktop grid sizing for the `1672x941` reference: sidebar width, topbar rhythm, first-row card height, quick access strip height, dashboard row heights and lower-card fit.
- Tightened card shadows, borders, icon sizing, progress ring sizing, quick-access density and AI assistant scale/placement.
- Kept major illustration areas as component-backed UI with temporary approved-reference crops only inside image/illustration zones.

## What Now Matches Better

- The parity screenshot now has the same `1672x941` dimensions as the approved Figma frame.
- The entire desktop dashboard composition fits inside the target viewport.
- Sidebar width, color atmosphere, active item and menu order are closer to the design lock.
- Topbar composition is closer: greeting, search, notifications, calendar and profile now share the approved first-row rhythm.
- Quick access no longer uses letters as icons.
- The lower dashboard grid is visible within the desktop viewport rather than falling below the screenshot.
- AI assistant placement and scale are closer to the approved lower-right floating treatment.

## Remaining Deviations

- This is still a real React/CSS implementation, not a Figma export, so exact pixel metrics, shadows and font rendering are not fully one-to-one.
- The top hero illustration crops are temporary and still need cleaner layer-level asset exports for exact alignment.
- Some chart paths and weekly progress graphics are structural approximations rather than exact approved SVG paths.
- Progress rings are closer in size and color but not yet exact Figma vector/ring geometry.
- Popular-card thumbnails and locked anatomy preview are temporary crop-backed assets.
- The AI robot/avatar uses a temporary crop asset and still needs a final approved standalone asset.
- The locked feature card still differs in internal content balance and anatomy placement.
- No mobile implementation is included; `APPROVED_MOBILE_STUDENT_DASHBOARD_FIRST_VIEW` must be implemented later as a dedicated mobile route/screen.

## Temporary Assets Still Used

Temporary local crop assets in `apps/web/public/design-preview/student-dashboard/`:

- `continue-visual.png`
- `lesson-visual.png`
- `popular-chemistry.png`
- `popular-physics.png`
- `popular-biology.png`
- `anatomy-preview.png`
- `assistant-robot.png`

These are allowed only as interim fidelity assets for illustration/photo/avatar zones. They must not become the long-term asset pipeline.

## Review Readiness

The desktop screen is ready for manual visual review against the approved Figma reference.

It is not production-ready and should not be switched to production routes.
