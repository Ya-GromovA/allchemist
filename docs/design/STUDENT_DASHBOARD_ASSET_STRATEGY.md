# Student Dashboard Asset Strategy

## Assets Found

- Approved full reference: `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`.
- Design-preview cropped media: `continue-visual.png`, `lesson-visual.png`, `anatomy-preview.png`, `popular-*.png`, `assistant-robot.png`.
- Clean production-safe assets: `apps/web/public/design-assets/student-dashboard/clean/**`.
- Temporary generated PNGs: `apps/web/public/design-assets/student-dashboard/illustrations/*-temporary.png`, `thumbnails/*-temporary.png`, and `assistant/robot-temporary.png`.

## Assets Used In UI-PROD-2

- Dashboard continues to use clean SVG assets from `apps/web/public/design-assets/student-dashboard/clean`.
- Hero/media depth is improved with CSS gradients, glow, molecule-line decoration, gradient buttons, and gradient progress bars.
- AI recommendations use clean icons with subject-colored circular treatments.
- Floating assistant uses the clean assistant robot SVG with CSS bubble, close control, halo, and pulse.

## Assets Not Used

- The full approved screenshot is not used as a UI background.
- The cropped `design-preview/student-dashboard/*.png` assets are not used as production card backgrounds because they include UI edge artifacts and would make the implementation non-componentized.
- No random external imagery was introduced.

## Assets Needed For Pixel-Level Parity

- Clean rendered chemistry hero art matching the flask/molecule composition without card-edge artifacts.
- Clean Newton/live-lesson art matching the approved lighting and crop.
- Clean 3D-anatomy art without screenshot context.
- Clean popular-content thumbnails with approved-like media quality.
- A polished profile/avatar illustration or real profile image placeholder consistent with the approved cluster.

## Later Generation Plan

Generate or source isolated transparent/background-safe PNG/WebP assets for each media zone, store them under `apps/web/public/design-assets/student-dashboard/approved-like/`, and keep paths in typed demo/content data. Do not paste screenshots into CSS or JSX.
