# MVP Content Readiness Report

Date: 2026-07-09
Task: Content-PROD-2

## Summary

Content-PROD-2 added a reviewed source pack, school curriculum map and stricter backend import readiness rules for the MVP content seed.

School content remains draft-only. No item is approved or publishable.

## Readiness Before And After

- Before Content-PROD-2: 42/100.
- After Content-PROD-2: 62/100.

Score rationale:

- +15: source pack with official curriculum, open educational references and safety references exists.
- +5: curriculum map covers every school MVP topic.
- +5: backend import validation rules and dependencies are explicit.
- -15: methodist review is still pending.
- -10: safety review is still pending for lab/microscope/safety-sensitive items.
- -8: legal/copyright review is still pending.
- -10: no backend importer has run in production.

## Coverage Metrics

- School content items: 14.
- Items with attached source ids: 14.
- Source coverage: 100% for source slots/reference candidates.
- Methodist review pending count: 14.
- Safety review pending count: 7.
- Publishable count: 0.
- Non-publishable count: 14.

Source coverage means each item has source ids in `source-pack-mvp.json`. It does not mean the item is approved.

## Verification Status

All school items moved from `source_required` to `needs_methodist_review`.

This is not approval. It means reference candidates are attached and the next required gate is human methodist review.

## Source Pack

Created `content/mvp/catalog/source-pack-mvp.json` with:

- official curriculum sources for chemistry, physics and biology;
- OpenStax scientific references;
- ACS, NIOSH, OSHA and Canada safety references;
- textbook mapping placeholders with `status: "source_required"`.

## Curriculum Map

Created `content/mvp/catalog/curriculum-map-school-mvp.json` with one entry per school MVP topic.

Every entry has:

- curriculum reference;
- textbook mapping placeholder;
- source ids;
- `verificationStatus: "needs_methodist_review"`;
- `publicationAllowed: false`.

## Items Needing Methodist Review

All school items require review for:

- scientific correctness;
- program alignment;
- age adequacy;
- task correctness;
- source fit;
- copyright posture.

## Safety-Sensitive Items

Priority safety review:

1. `chem-school-acids-intro`
2. `chem-school-zinc-hcl-reaction`
3. `chem-school-lab-safety`
4. `bio-school-cell-structure`
5. `bio-school-plant-cell`
6. `bio-school-onion-epidermis-microscope`
7. `bio-school-plant-cell-structures`

## Import Readiness

The import manifest now defines:

- import order;
- dependencies;
- validation rules;
- fail-import rules;
- draft-only rules.

The importer may ingest this batch only as draft content.

## Next Content Task

Content-PROD-3 should run methodist review against `curriculum-map-school-mvp.json`, resolve textbook placeholders and produce per-item review decisions.
