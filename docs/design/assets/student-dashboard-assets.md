# Student Dashboard Assets

Figma target: `APPROVED_WEB_STUDENT_DASHBOARD`, node `3:12`
Preview route: `/design-preview/student-dashboard`

## Asset Manifest

| Asset | Path | Source | Status | Used in | Replace later |
| --- | --- | --- | --- | --- | --- |
| Golden approved screenshot | `apps/web/public/design-preview/student-dashboard/golden-approved-web-student-dashboard.png` | Figma screenshot for node `3:12` | approved reference | parity checks, overlay | No, but refresh if approved Figma changes. |
| Legacy approved screenshot copy | `apps/web/public/design-preview/student-dashboard/approved-student-dashboard.png` | Earlier Figma screenshot export | temporary/reference | older CSS fallbacks | Yes, remove once all crops are clean. |
| Continue visual | `apps/web/public/design-preview/student-dashboard/continue-visual.png` | Local crop from approved reference | temporary crop | `ContinueLearningCard` image area | Yes, replace with clean exported layer asset. |
| Live lesson visual | `apps/web/public/design-preview/student-dashboard/lesson-visual.png` | Local crop from approved reference | temporary crop | `LiveLessonCard` image area | Yes, replace with clean exported layer asset. |
| Popular chemistry thumbnail | `apps/web/public/design-preview/student-dashboard/popular-chemistry.png` | Local crop from approved reference | temporary crop | `PopularNowCard` first thumbnail | Yes. |
| Popular physics thumbnail | `apps/web/public/design-preview/student-dashboard/popular-physics.png` | Local crop from approved reference | temporary crop | `PopularNowCard` second thumbnail | Yes. |
| Popular biology thumbnail | `apps/web/public/design-preview/student-dashboard/popular-biology.png` | Local crop from approved reference | temporary crop | `PopularNowCard` third thumbnail | Yes. |
| Anatomy preview | `apps/web/public/design-preview/student-dashboard/anatomy-preview.png` | Local crop from approved reference | temporary crop | `LockedFeatureCard` visual | Yes. |
| AI assistant robot | `apps/web/public/design-preview/student-dashboard/assistant-robot.png` | Local crop from approved reference | temporary crop | `AIAssistantWidget` avatar | Yes. |
| Logo mark | CSS crop from `golden-approved-web-student-dashboard.png` | Golden reference crop | temporary crop | `StudentSidebar` logo | Yes, replace with approved standalone logo asset. |
| Profile avatar | CSS crop/fallback from golden reference | Golden reference crop | temporary crop | `StudentTopbar` profile | Yes, replace with approved avatar or demo user asset. |
| Inline SVG icons | `apps/web/components/student-dashboard-preview.tsx` | Hand-authored outline icon system | placeholder/design-system seed | sidebar, quick access, cards, topbar | Yes, replace with approved icon library/assets. |
| Approved zone crops | `apps/web/public/design-preview/student-dashboard/zones/*.png` | Crops generated from golden approved screenshot | temporary reference crops | asset parity pass, zone parity reports, selected illustration/avatar/decorative zones | Yes, replace with clean exported Figma layer assets. |

## Rules

- The full golden screenshot must not be pasted as the product UI.
- Temporary crops are allowed only inside illustration, thumbnail, logo or avatar zones while clean Figma layer exports are not available.
- Text, buttons, cards and layout must remain real React/CSS components.
- Any new asset must be added to this manifest with source and status.
