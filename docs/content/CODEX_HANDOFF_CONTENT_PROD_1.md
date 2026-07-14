# CODEX HANDOFF CONTENT-PROD-1

Date: 2026-07-09
Scope: Content/Data only.

## Summary

Prepared the first MVP content seed and data contracts for Allchemist without touching frontend UI, backend API/services or git staging.

Created:

- school chemistry, physics and biology seed content;
- student catalog-only sections;
- UI card seed data;
- backend import manifest;
- MVP content TypeScript contract in `packages/content-core`;
- content model, source policy, copyright policy and readiness docs.

## Created Content

School chemistry:

- `chem-school-reactions-types-signs`
- `chem-school-acids-intro`
- `chem-school-metals-intro`
- `chem-school-zinc-hcl-reaction`
- `chem-school-lab-safety`

School physics:

- `phys-school-uniform-acceleration`
- `phys-school-speed-acceleration-distance`
- `phys-school-formula-v-equals-v0-plus-at`
- `phys-school-formula-s-equals-v0t-plus-at2-half`
- `phys-school-newton-laws-next-topic`

School biology:

- `bio-school-cell-structure`
- `bio-school-plant-cell`
- `bio-school-onion-epidermis-microscope`
- `bio-school-plant-cell-structures`

Student catalog:

- общая химия
- неорганическая химия
- органическая химия
- аналитическая химия
- физическая химия
- биохимия
- механика
- электродинамика
- оптика
- квантовая физика
- цитология
- генетика
- анатомия
- физиология
- микробиология

## Source And Verification Status

All school content items are `source_required`.

No item was marked as `verified_by_ai`, `needs_methodist_review` or `approved`, because no approved source pack was provided. This is intentional and conservative.

## Copyright Policy

All lesson text is original draft wording. No textbook text, task wording, diagrams, scans or lab procedures were copied.

All school items have `copyrightPolicy.allowedForPublication=false` until source and legal review are complete.

## Content Readiness Score

42/100.

Ready for: source attachment, methodist review, importer planning, UI-card prototyping with draft badges.

Not ready for: production publication to learners.

## Files Changed

- `packages/content-core/src/mvp-content.ts`
- `packages/content-core/src/index.ts`
- `content/mvp/chemistry/school-chemistry-content.json`
- `content/mvp/physics/school-physics-content.json`
- `content/mvp/biology/school-biology-content.json`
- `content/mvp/catalog/student-sections.json`
- `content/mvp/catalog/ui-cards.json`
- `content/mvp/catalog/backend-import-manifest.json`
- `docs/content/CONTENT_MODEL_MVP.md`
- `docs/content/SOURCES_AND_VERIFICATION_POLICY.md`
- `docs/content/COPYRIGHT_POLICY_FOR_TEXTBOOK_MAPPING.md`
- `docs/content/MVP_CONTENT_READINESS_REPORT.md`
- `docs/content/CODEX_HANDOFF_CONTENT_PROD_1.md`

## Blockers

- Approved source ids are missing.
- Methodist review is missing.
- Safety review is missing for chemistry lab and microscope-related content.
- Copyright review is missing.
- Backend importer has not been implemented or run.

## Next Recommended Content Task

Content-PROD-2: create a reviewed source pack and curriculum map for the MVP topics, then move eligible items from `source_required` to `needs_methodist_review`.
