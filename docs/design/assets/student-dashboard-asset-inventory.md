# Student Dashboard Asset Inventory

Source: `APPROVED_WEB_STUDENT_DASHBOARD`, Figma node `3:12`
Preview route: `/design-preview/student-dashboard`
Target viewport: `1672x941`

## Figma Layer Availability

Figma inspection result: node `3:12` is exposed as a single `rounded-rectangle` named `APPROVED_WEB_STUDENT_DASHBOARD`.
`get_design_context` returns one raster image for the whole approved screen and no editable child layers.

This means clean layer export is not currently possible from the approved node. Temporary crops may be used only for illustration/image areas. Text, navigation, buttons, cards, charts and controls must remain real React/HTML/CSS components and must not be replaced by full-zone raster crops as final UI.

## Current Asset Problem

Layout contract is currently passing, while visual parity is failing. The largest mismatches are caused by missing or approximate assets and visual-language gaps rather than by gross layout position:

- AI assistant widget is still very far from the approved robot/bubble composition.
- Popular cards need approved thumbnail artwork and tighter image treatment.
- Sidebar logo, icon weight, license illustration and density are not asset-locked.
- Greeting/header and first-row cards need exact approved illustration surfaces.
- Locked anatomy feature needs approved anatomy art instead of approximate replacement.

## Inventory

| # | Asset id | Where it appears | Kind | Data mode | Current implementation file | Current quality | Recommended final format | Export from Figma? | Generate separately? | Temporary crop allowed? |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `app-logo-mark` | Sidebar header | Real UI brand mark | Static | `apps/web/components/student-dashboard-preview.tsx` | Placeholder/vector approximation | SVG React component | Not from node `3:12`; approved node is flat | Yes, if no editable brand source exists | No, do not crop final logo from screenshot |
| 2 | `app-logo-wordmark` | Sidebar header | Real UI wordmark | Static | `apps/web/components/student-dashboard-preview.tsx` | Real text, not asset-locked | HTML text or SVG wordmark | Not from node `3:12` | Yes, if exact wordmark is required | No, keep text real unless final SVG wordmark is supplied |
| 3 | `sidebar-nav-icons` | Sidebar navigation list | Icon set | Static/hybrid active state | `apps/web/components/student-dashboard-preview.tsx` | Lucide/approximate | SVG sprite or React icon components | Not from node `3:12` | Yes | No, nav icons must stay real vector/UI |
| 4 | `sidebar-license-decorative-art` | Sidebar extended license card | Decorative illustration | Hybrid by entitlement state | `apps/web/components/student-dashboard-preview.tsx` | CSS/approximate | WebP/PNG plus optional SVG glow | Not from node `3:12` as clean layer | Yes or export from a separate editable source | Only a tight illustration-only crop if created; not full sidebar/card crop |
| 5 | `topbar-search-icon` | Search input | UI icon | Static | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icon | Not from node `3:12` | Yes as part of icon system | No |
| 6 | `notification-icon` | Topbar notification button | UI icon | Dynamic badge count | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icon | Not from node `3:12` | Yes as part of icon system | No |
| 7 | `calendar-icon` | Topbar calendar button | UI icon | Static/dynamic date state | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icon | Not from node `3:12` | Yes as part of icon system | No |
| 8 | `user-avatar` | Topbar profile cluster | Avatar | Dynamic by user | `apps/web/lib/demo/student-dashboard-demo-data.ts` and component | Placeholder/demo | WebP/PNG avatar with fallback initials | Not from node `3:12` as reusable layer | Yes for demo/avatar set | A temporary crop is possible only for demo, not final user data |
| 9 | `continue-learning-chemistry-hero-art` | Continue learning card | Illustration | Hybrid: fixed subject art plus dynamic topic/progress | `apps/web/public/design-preview/student-dashboard/continue-visual.png` | Temporary crop | WebP/PNG, later editable source or generated illustration | Not cleanly from node `3:12` | Prefer separate generation/export | Yes, image area only |
| 10 | `live-lesson-physics-newton-art` | Live lesson card | Illustration | Hybrid: fixed lesson visual plus dynamic status/time | `apps/web/public/design-preview/student-dashboard/lesson-visual.png` | Temporary crop | WebP/PNG, later editable source or generated illustration | Not cleanly from node `3:12` | Prefer separate generation/export | Yes, image area only |
| 11 | `ai-recommendation-icons` | AI recommendations card rows | Icon set | Dynamic by recommendation type | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icon components | Not from node `3:12` | Yes | No |
| 12a | `quick-access-theory-icon` | Quick access strip | UI icon | Static | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12b | `quick-access-tasks-icon` | Quick access strip | UI icon | Dynamic badge count | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12c | `quick-access-labs-icon` | Quick access strip | UI icon | Static | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12d | `quick-access-3d-molecules-icon` | Quick access strip | UI icon | Static/entitlement gated | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12e | `quick-access-periodic-table-icon` | Quick access strip | UI icon | Static | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12f | `quick-access-simulators-icon` | Quick access strip | UI icon | Static/entitlement gated | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12g | `quick-access-microscope-icon` | Quick access strip | UI icon | Static/entitlement gated | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12h | `quick-access-exams-icon` | Quick access strip | UI icon | Static | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 12i | `quick-access-ai-mentor-icon` | Quick access strip | UI icon | AI entitlement/status | Same | Approximate | SVG/React icon | Not from node `3:12` | Yes | No |
| 13 | `assignment-status-icons` | Assignments card rows | Status icons | Dynamic by assignment state | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React status icon components | Not from node `3:12` | Yes | No |
| 14 | `progress-rings` | My progress card | Chart | Dynamic by subject progress | `apps/web/components/student-dashboard-preview.tsx` | CSS/SVG approximation | React SVG chart component | Not from node `3:12` | No image needed; implement component exactly | No |
| 15 | `weak-topic-icons` | Weak topics card | Icon set | Dynamic by topic/subject | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icons | Not from node `3:12` | Yes | No |
| 16a | `popular-thumbnail-chemistry-neutralization` | Popular now card | Thumbnail illustration | Hybrid content thumbnail | `apps/web/public/design-preview/student-dashboard/popular-chemistry.png` | Temporary crop | WebP/PNG | Not cleanly from node `3:12` | Prefer separate generation/export | Yes, thumbnail only |
| 16b | `popular-thumbnail-physics-free-fall` | Popular now card | Thumbnail illustration | Hybrid content thumbnail | `apps/web/public/design-preview/student-dashboard/popular-physics.png` | Temporary crop | WebP/PNG | Not cleanly from node `3:12` | Prefer separate generation/export | Yes, thumbnail only |
| 16c | `popular-thumbnail-biology-plant-cell` | Popular now card | Thumbnail illustration | Hybrid content thumbnail | `apps/web/public/design-preview/student-dashboard/popular-biology.png` | Temporary crop | WebP/PNG | Not cleanly from node `3:12` | Prefer separate generation/export | Yes, thumbnail only |
| 17 | `weekly-progress-chart` | Weekly progress card | Chart | Dynamic progress history | `apps/web/components/student-dashboard-preview.tsx` | Approximate | React SVG/chart component | Not from node `3:12` | No raster generation; implement as component | No |
| 18 | `locked-feature-anatomy-visual` | Locked feature card | Illustration | Hybrid by license/feature gate | `apps/web/public/design-preview/student-dashboard/anatomy-preview.png` | Temporary crop | WebP/PNG, later generated/exported illustration | Not cleanly from node `3:12` | Prefer separate generation/export | Yes, image area only |
| 19 | `ai-assistant-robot` | Floating AI assistant | Character illustration/animation | Hybrid by AI assistant state | `apps/web/public/design-preview/student-dashboard/assistant-robot.png` | Temporary crop | Rive/Lottie later; WebP/PNG fallback now | Not cleanly from node `3:12` | Yes, final assistant should be generated/exported separately | Yes, robot-only crop |
| 20 | `ai-assistant-speech-bubble` | Floating AI assistant | Real UI bubble | Dynamic text/state | `apps/web/components/student-dashboard-preview.tsx` | CSS approximation | React/CSS component, not raster | Not from node `3:12` | No image needed | No |
| 21 | `ai-assistant-close-button` | Floating AI assistant | UI control | Static/interactive | `apps/web/components/student-dashboard-preview.tsx` | Approximate | SVG/React icon button | Not from node `3:12` | Yes as icon system | No |
| 22 | `background-science-decoration` | Page/card decorative atmosphere if present | Decorative background | Static by screen/subject | CSS/backgrounds in component/styles | Approximate | CSS gradients plus optional SVG/WebP decor | Not from node `3:12` as clean layers | Yes only for decorative motifs | Only local decorative fragments, not full zones |

## Final Asset Rules

- UI text, buttons, navigation, chart values and card shells remain real components.
- Temporary crops must be isolated to illustration or thumbnail regions.
- Approved full-screen and zone crops are allowed as measurement/reference only.
- Final SVG icon system should be shared with future web/admin/mobile foundations.
- Dynamic charts should be implemented as React/SVG components using design-locked geometry, not screenshots.
