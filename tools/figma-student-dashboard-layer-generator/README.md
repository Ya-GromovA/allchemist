# Allchemist Student Dashboard Figma Layer Generator

This is a local Figma development plugin for rebuilding the approved Allchemist student dashboard as editable Figma layers on top of the tracing base.

## What It Does

- Expects the selected frame to be `APPROVED_WEB_STUDENT_DASHBOARD_TRACING_BASE`.
- Creates a new editable frame named `STUDENT_DASHBOARD_EDITABLE_LAYERS_V1` inside the selected tracing base at `x=0`, `y=0`, `1672x941`.
- Removes only the previous `STUDENT_DASHBOARD_EDITABLE_LAYERS_V1` on rerun.
- Enables clipping on the tracing base and generated frame so generated dashboard layers stay inside the approved viewport.
- Leaves the locked reference image `approved_web_student_dashboard_reference_LOCKED` untouched.
- Creates real editable layers for sidebar, topbar, greeting, cards, buttons, labels, status pills, vector/icon placeholders, progress/chart placeholders and AI assistant bubble.
- Uses named image slot rectangles for visual assets that do not yet have clean editable source assets.
- Creates `CODEX_HANDOFF_NOTES_STUDENT_DASHBOARD` outside the tracing frame, not inside the 1672x941 dashboard viewport.

## Files

- `manifest.json` - Figma development plugin manifest.
- `code.js` - zero-build plugin runtime.
- `student-dashboard.layer-spec.json` - coordinates, Russian text, layer names and static/dynamic notes.
- `student-dashboard.tokens.json` - colors, typography, spacing, radius and shadow tokens.
- `README.md` - this handoff guide.

## Exact User Instructions

1. Copy the plugin folder to Windows.
2. Open Figma Desktop if the browser does not show development plugin import.
3. Open the Allchemist Figma file.
4. Go to page `10_SCREEN_ASSEMBLY`.
5. Select frame `APPROVED_WEB_STUDENT_DASHBOARD_TRACING_BASE`.
6. Menu -> Plugins -> Development -> Import plugin from manifest.
7. Choose `manifest.json` from this plugin folder.
8. Run plugin: `Allchemist: Generate Student Dashboard Layers`.
9. Verify generated layers in the Layers panel.
10. Keep reference locked.
11. Do not approve until visually checked.

## Troubleshooting / Диагностика

English:

- The tracing base frame must remain exactly `1672x941`.
- If a previous generated frame appears as `1672x1081`, delete `STUDENT_DASHBOARD_EDITABLE_LAYERS_V1` and rerun this fixed plugin.
- `CODEX_HANDOFF_NOTES_STUDENT_DASHBOARD` should appear outside the tracing frame, to the right.
- Keep `approved_web_student_dashboard_reference_LOCKED` locked.
- Do not approve the generated result until the overlay is visually checked against the reference.

Русский:

- Базовый tracing frame должен оставаться ровно `1672x941`.
- Если старый generated frame стал `1672x1081`, удалите `STUDENT_DASHBOARD_EDITABLE_LAYERS_V1` и запустите исправленный plugin заново.
- `CODEX_HANDOFF_NOTES_STUDENT_DASHBOARD` должен появиться снаружи tracing frame, справа от него.
- Не разблокируйте `approved_web_student_dashboard_reference_LOCKED`.
- Не утверждайте результат, пока визуальный overlay не проверен по референсу.

## Important Limits

- The approved Figma node `APPROVED_WEB_STUDENT_DASHBOARD / 3:12` is a flat raster reference, so this plugin creates deterministic editable approximations aligned to measured coordinates.
- It does not rasterize the whole dashboard.
- It does not create hidden full-screen image layers.
- Text/buttons/cards are editable.
- Image slots need clean assets later:
  - `IMAGE_SLOT_chemistry_hero`
  - `IMAGE_SLOT_live_lesson_newton`
  - `IMAGE_SLOT_popular_chemistry`
  - `IMAGE_SLOT_popular_physics`
  - `IMAGE_SLOT_popular_biology`
  - `IMAGE_SLOT_locked_anatomy`
  - `IMAGE_SLOT_ai_robot`

## No Build Step

The plugin is plain JavaScript. Import `manifest.json` directly in Figma Desktop.

If you change `code.js`, validate syntax with:

```bash
node --check code.js
```
