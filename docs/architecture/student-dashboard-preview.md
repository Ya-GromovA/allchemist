# Student Dashboard Preview

Route: `/design-preview/student-dashboard`
Figma reference: `APPROVED_WEB_STUDENT_DASHBOARD`, node `3:12`.

## Purpose

This route is a non-production design preview for the first approved Allchemist student dashboard reference. It does not replace `/dashboard/student` and does not switch production routes.

## Implementation

- Components live in `apps/web/components/student-dashboard-preview.tsx`.
- Route entry lives in `apps/web/app/design-preview/student-dashboard/page.tsx`.
- Styling lives in `apps/web/app/globals.css` under the `APPROVED_WEB_STUDENT_DASHBOARD` section.
- Shared semantic direction comes from `packages/design-tokens` and `packages/ui` CSS variables.

## Demo Data

All data on the preview is static demo data:

- student greeting/profile;
- continue-learning topic;
- live lesson;
- quick access tools;
- teacher assignments;
- subject progress;
- weak topics;
- AI recommendations;
- locked feature state.

No production endpoints are called. No backend actions are performed.

## Not Production Ready

- Real dashboard data is not connected.
- Real AI chat is not connected.
- License and payment actions are local preview states only.
- Illustrations and icons are CSS approximations until an approved asset pipeline exists.
- The screen still needs manual visual review against screenshots.

## Later API Connections

Future iterations should connect through `packages/api-client` only after visual approval:

- user profile and role;
- active courses and progress;
- assignments;
- live lesson schedule;
- recommendations;
- license entitlements;
- AI assistant state.
