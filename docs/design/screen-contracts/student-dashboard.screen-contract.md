# Student Dashboard Screen Contract

## A. Screen Identity

- Screen id: `student-dashboard`
- Role: `student`
- Platform: web desktop
- Approved reference: `APPROVED_WEB_STUDENT_DASHBOARD`
- Figma source: https://www.figma.com/design/OnwtlxHKp361n66TfjBOKL/Untitled?node-id=2-7
- Figma node: `3:12`
- Viewport: `1672x941`
- Preview route: `/design-preview/student-dashboard`
- Production route status: not switched; preview only.

## B. Static Visual Zones

These zones are visual/design-system structure and must not be invented from scratch:

- App background: light blue-white desktop workspace with soft STEM atmosphere.
- Sidebar: fixed deep science-blue surface, approved Allchemist identity, locked user navigation order.
- Topbar structure: greeting/header, centered search field, notifications, calendar and profile cluster.
- Card grid: first row hero cards, quick-access strip, three-column lower summary grid.
- Quick access strip: compact tool buttons with one outline icon style.
- AI assistant placement style: floating lower-right assistant/avatar with speech bubble, non-blocking.
- License card style: sidebar card with blue/violet glow, CTA and premium-license meaning.
- Icon style: consistent outline icons; no letter placeholders.
- Card surfaces: light cards, soft border, restrained radius and shadow.

## C. Dynamic Data Zones

These values must be data-driven:

- User name.
- User avatar.
- User grade/class.
- Notification count.
- Current topic.
- Progress percent.
- Live lesson status.
- Assignments.
- Subject progress.
- Weak topics.
- AI recommendations.
- Popular content.
- License/entitlement state.
- AI assistant bubble text.

Current source is demo-only data in `apps/web/lib/demo/student-dashboard-demo-data.ts`. Do not connect real backend in this task.

## D. Hybrid Zones

These blocks have a static approved component shape but dynamic content:

- Continue learning card.
- Live lesson card.
- AI recommendations card.
- Quick access card list.
- Assignments card.
- Subject progress card.
- Weak topics card.
- Popular now card.
- Weekly progress card.
- Locked feature card.
- AI assistant widget.

## E. Interaction Requirements

Required interactions:

- Continue button click.
- Join live lesson click.
- Quick access item click.
- Repeat weak topic click.
- See all links.
- AI assistant bubble open/close.
- AI assistant open chat.
- Locked feature CTA.
- Hover, focus and active states for clickable controls.

Implementation smoke checks must keep these elements present and keyboard-reachable where applicable.

## F. Acceptance Criteria

- Visual parity must not be `FAIL`.
- Layout contract must pass.
- Interaction smoke must pass.
- No mobile deliverable in this task.
- No production route switch.
- Backend, FastAPI routes, legacy `web_admin` and legacy `web_public` must remain unchanged.

If visual parity or layout contract is `FAIL`, do not call this screen ready.
