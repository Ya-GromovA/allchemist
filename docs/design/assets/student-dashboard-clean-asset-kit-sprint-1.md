# Student Dashboard Clean Asset Kit Sprint 1

Date: 2026-07-07

## Status

- Target: `APPROVED_WEB_STUDENT_DASHBOARD`
- Route: `/design-preview/student-dashboard`
- Scope: reusable clean SVG assets for Student Dashboard and future student web screens
- Engineering scaffold: `ENGINEERING_SCAFFOLD_READY`
- Visual approval: blocked
- Production ready: false

This sprint does not approve the final visual design. It replaces weak generic vector placeholders with controlled reusable SVG assets that still need visual approval.

## Created Shared Asset Folders

- `apps/web/public/design-assets/shared/logo/`
- `apps/web/public/design-assets/shared/icons/`
- `apps/web/public/design-assets/shared/assistant/`
- `apps/web/public/design-assets/shared/decor/`

## Created Student Dashboard Clean Asset Folders

- `apps/web/public/design-assets/student-dashboard/clean/icons/`
- `apps/web/public/design-assets/student-dashboard/clean/illustrations/`
- `apps/web/public/design-assets/student-dashboard/clean/thumbnails/`
- `apps/web/public/design-assets/student-dashboard/clean/assistant/`

## Assets Created

Logo:

- `allchemist-mark.svg`
- `allchemist-logo-lockup.svg`

Sidebar navigation icons:

- `nav-home.svg`
- `nav-courses.svg`
- `nav-theory.svg`
- `nav-tasks.svg`
- `nav-labs.svg`
- `nav-visualization.svg`
- `nav-references.svg`
- `nav-exams.svg`
- `nav-diagnostics.svg`
- `nav-ai-mentor.svg`
- `nav-progress.svg`
- `nav-messages.svg`
- `nav-settings.svg`

Quick access icons:

- `quick-theory.svg`
- `quick-tasks.svg`
- `quick-labs.svg`
- `quick-3d-molecules.svg`
- `quick-periodic-table.svg`
- `quick-simulators.svg`
- `quick-microscope.svg`
- `quick-exams.svg`
- `quick-ai-mentor.svg`

Topbar and status icons:

- `search.svg`
- `bell.svg`
- `calendar.svg`
- `profile-placeholder.svg`
- `repeat.svg`
- `lock.svg`
- `close.svg`

## What Replaces Previous Generic Placeholders

- Sidebar nav now uses individual clean SVG icon files instead of the temporary sprite.
- Quick access buttons now use clean SVG icon files.
- Topbar notification and calendar use clean SVG icon files.
- Search uses a real SVG icon instead of CSS-drawn pseudo-elements.
- Weak topic repeat controls use the clean repeat SVG.
- Assistant close control uses the clean close SVG.
- Sidebar logo mark uses the shared clean SVG mark.

## Still Missing

- Final approved logo source.
- Final AI assistant character source, preferably Rive/Lottie later.
- Final sidebar license decorative art.
- Clean illustration exports for chemistry hero, Newton live lesson, popular thumbnails, anatomy card.
- Final approved icon audit against the source design.

## Approval Notes

All SVG assets in this sprint are marked as `generated-clean-svg` and `needs-approval` in the asset manifest. They are reusable engineering assets, not final brand or visual approval.

## Shared Across Future Screens

- `shared/logo/allchemist-mark.svg`
- `shared/logo/allchemist-logo-lockup.svg`
- `shared/icons/search.svg`
- `shared/icons/bell.svg`
- `shared/icons/calendar.svg`
- `shared/icons/profile-placeholder.svg`
- `shared/icons/repeat.svg`
- `shared/icons/lock.svg`
- `shared/icons/close.svg`

## Next Asset Sprint

The next asset sprint should focus on clean illustration exports or generated art for:

- AI assistant widget character and bubble composition;
- sidebar license decorative art;
- chemistry hero illustration;
- live lesson Newton illustration;
- popular content thumbnails;
- locked anatomy visual.
