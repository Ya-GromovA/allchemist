# CODEX HANDOFF CONTENT-PROD-2

Date: 2026-07-09
Scope: Content/Data only.

## Summary

Prepared a reviewed source pack and curriculum map for the MVP school topics. Updated school content items from `source_required` to `needs_methodist_review` because traceable source candidates are now attached.

No item was marked `approved`. Publication remains disabled.

## Source Pack

Created `content/mvp/catalog/source-pack-mvp.json`.

Source categories:

- official curriculum: EDSOO/Минпросвещения chemistry, physics, biology PDFs;
- open educational reference: OpenStax chemistry, physics and biology pages;
- safety reference: ACS, NIOSH, OSHA and Public Health Agency of Canada;
- textbook placeholders: one per school subject, still `source_required`.

## Curriculum Map

Created `content/mvp/catalog/curriculum-map-school-mvp.json`.

It contains one map entry per school MVP content item with learning objectives, curriculum reference, textbook mapping placeholder, source ids and `publicationAllowed: false`.

## Status Changes

- 14 school items changed from `source_required` to `needs_methodist_review`.
- 14 school UI cards changed to `needs_methodist_review`.
- 0 items changed to `approved`.
- All `copyrightPolicy.allowedForPublication` values remain `false`.
- All top-level school item `publicationAllowed` values are `false`.

## Readiness Score

- Before: 42/100.
- After: 62/100.

## Publishable Items

Publishable count: 0.

Reason: methodist, safety and copyright/legal reviews are still pending.

## Files Changed

- `packages/content-core/src/mvp-content.ts`
- `content/mvp/chemistry/school-chemistry-content.json`
- `content/mvp/physics/school-physics-content.json`
- `content/mvp/biology/school-biology-content.json`
- `content/mvp/catalog/ui-cards.json`
- `content/mvp/catalog/backend-import-manifest.json`
- `content/mvp/catalog/source-pack-mvp.json`
- `content/mvp/catalog/curriculum-map-school-mvp.json`
- `docs/content/MVP_SOURCE_PACK_POLICY.md`
- `docs/content/METHODIST_REVIEW_CHECKLIST_MVP.md`
- `docs/content/MVP_CONTENT_READINESS_REPORT.md`
- `docs/content/CODEX_HANDOFF_CONTENT_PROD_2.md`

## Blockers

- Textbook mapping placeholders are unresolved.
- Methodist review is pending for all 14 school items.
- Safety review is pending for 7 safety-sensitive/lab/microscope-related items.
- Copyright/legal review is pending.
- Backend importer has not been implemented or run against this batch.

## Next Recommended Content Task

Content-PROD-3: methodist review and textbook mapping resolution for each MVP school item, with per-item decisions to keep draft, revise, or move toward content QA.
