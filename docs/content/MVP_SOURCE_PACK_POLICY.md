# MVP Source Pack Policy

Status: Content-PROD-2 draft policy.
Date: 2026-07-09

## Acceptable Sources

Use sources that are traceable, stable and reviewable:

- official curriculum documents for program mapping;
- official safety guidance for laboratory, chemical, microscope and biological safety;
- open educational resources for scientific reference;
- educational/reference sources from recognized institutions;
- approved textbooks only as reference-only mapping unless a license allows reuse.

Do not treat a source as publication approval. A source can support a draft item, but a methodist and legal/safety reviewer must still approve the final learner-facing material.

## Source Id Rules

Each source id must be stable, lowercase, descriptive and scoped:

- `src-curriculum-...` for official curriculum documents;
- `src-openstax-...` for OpenStax/open educational references;
- `src-acs-...`, `src-osha-...`, `src-niosh-...` for safety references;
- `src-textbook-placeholder-...` for textbook slots that still need methodist selection.

Do not reuse a source id for a different URL or edition. If the edition changes, create a new id.

## Required Metadata

Every source record must store:

- `id`;
- `title`;
- `publisher`;
- `type`;
- `url` when available;
- `accessDate`;
- `usedFor`;
- `reliability`;
- license/copyright notes;
- `status`.

If a URL is unavailable, do not invent one. Create a placeholder with `status: "source_required"`.

## Source Types

- `official_curriculum`: official program/curriculum mapping source.
- `official_safety_reference`: safety authority or public safety guidance.
- `open_educational_reference`: OER/reference material with stated license terms.
- `educational_reference`: institutional educational material without full curriculum authority.
- `textbook_mapping_placeholder`: textbook slot to be filled by a methodist.

## Publication Restrictions

Do not publish without methodist review when:

- the item is mapped only by AI/Codex;
- source-to-objective fit has not been checked;
- textbook mapping is only a placeholder;
- lab, simulation or microscope safety is involved;
- the source is not in the learner's language and needs adaptation;
- licensing terms have not been cleared.

## Textbook Handling

Textbooks are mapping references, not text sources by default.

Allowed:

- record title, publisher, edition and topic mapping;
- record which curriculum objective a section supports;
- write original Allchemist explanations after review.

Not allowed:

- copy textbook prose;
- copy exact tasks or answer keys;
- copy diagrams, tables, captions or lab procedures;
- paraphrase too closely from a protected source;
- publish derived material without license/legal review.
