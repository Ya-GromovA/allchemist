# Student Dashboard Layout Blueprint

Figma source: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7
Approved target: `APPROVED_WEB_STUDENT_DASHBOARD`, node `3:12`
Preview route: `/design-preview/student-dashboard`

This blueprint exists to support pixel-level visual parity checks. It is not a production layout spec and must not be used to implement mobile.

## Viewport

- Width: `1672px`
- Height: `941px`
- Device scale factor: `1`
- Golden reference: `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png`
- Implementation screenshot: `artifacts/ui-snapshots/web/student-dashboard-desktop-parity-1672x941.png`

## Page Background

- Workspace is a light blue-white STEM dashboard surface.
- Sidebar is deep science blue, not black.
- Main content starts immediately after the sidebar and uses soft card surfaces with blue borders/shadows.

## Primary Layout Anchors

| Area | Approximate box | Required contents |
| --- | --- | --- |
| Sidebar | `x=0 y=0 w=236 h=941` | Allchemist logo, locked user navigation order, active `Главная`, license card, collapse control. |
| Main content start | `x=236` | All dashboard content and topbar start after the sidebar. |
| Topbar | `x=236 y=0 w=1436 h=88` | Greeting/header, search, notifications, calendar, profile. |
| Greeting/header | `x=268 y=16 w=360 h=56` | `Здравствуйте, Алина!`, continuation subtitle. |
| First row cards | `x=268 y=92 w=1368 h=260` | Continue learning, live lesson, AI recommendations. |
| Quick access strip | `x=268 y=366 w=1368 h=112` | Theory, assignments, labs, 3D molecules, periodic table, simulators, microscope, exams, AI mentor. |
| Assignments card | `x=268 y=500 w=390 h=222` | Teacher assignments with subject/status rows. |
| Progress card | `x=674 y=500 w=420 h=222` | Chemistry, Physics, Biology progress rings. |
| Weak topics card | `x=1110 y=500 w=526 h=222` | Weak topics, subject labels, repeat actions. |
| Popular now card | `x=268 y=738 w=390 h=186` | Three popular content thumbnails and captions. |
| Weekly progress card | `x=674 y=738 w=330 h=186` | Weekly progress summary and chart. |
| Locked feature card | `x=1020 y=738 w=430 h=186` | Basic-license locked 3D anatomy feature and CTA. |
| AI assistant widget | `x=1390 y=735 w=260 h=190` | Floating assistant bubble/avatar, non-blocking lower-right placement. |

## Zone Comparison Rules

- The parity tool compares the full screen and each zone above.
- Both source images must be exactly `1672x941`.
- Pixel mismatch threshold is a max RGB delta greater than `24`.
- Reports include mismatch percentage and mean delta per zone.
- A zone above the provisional threshold must be treated as failing until corrected or the threshold is explicitly revised.

## Non-Goals

- Do not use this blueprint for mobile.
- Do not implement other approved screens from this blueprint.
- Do not paste the full golden screenshot as UI.
- Do not use draft or Figma Make generated references.
