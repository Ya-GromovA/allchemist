# Sources And Verification Policy

Status: draft policy for Content-PROD-1.

## Principle

Allchemist content can be clear and friendly, but it must not pretend to be verified when sources are missing. If a content item does not have an approved source id, its `verificationStatus` must remain `source_required`.

## Source Metadata Requirements

Every item and task must carry `sourceMetadata`:

- `sourceIds`: approved source identifiers. Empty means not publication-ready.
- `candidates`: possible sources or source categories that need selection.
- `sourceRequirement`: what source must be attached next.
- `evidenceNote`: why the current draft is or is not trusted.

Source candidates are not citations. They are work orders for the next content pass.

## Approved Source Types

A source can become approved only after review of:

- scientific trustworthiness;
- curriculum relevance;
- license/copyright status;
- suitability for the student's age;
- safety authority for lab, chemical, microscope and equipment guidance.

For school content, the preferred source set is:

- approved curriculum/program mapping;
- a methodist-approved textbook or open educational reference used only for reference;
- safety instructions approved for the relevant classroom/lab context;
- internally authored Allchemist explanation reviewed by a subject expert.

## Status Rules

Use `source_required` when:

- no source ids are attached;
- only general knowledge was used;
- a formula/fact is standard but the exact curriculum source is not attached;
- lab or safety guidance lacks institutional safety source.

Use `verified_by_ai` only when:

- source ids exist;
- AI has checked the item against those sources;
- human review is still pending.

Use `needs_methodist_review` when:

- sources are attached;
- the item is internally consistent;
- a human methodist must check program fit, wording and tasks.

Use `approved` only when:

- scientific review is complete;
- methodist review is complete;
- safety review is complete where applicable;
- copyright review is complete;
- publication owner accepts the item.

## Safety-Sensitive Content

Chemistry labs, acids, gases, heating, glassware, microscope slides, stains and biological samples require explicit safety review. Draft content may describe safety posture, but must not become operational instructions until approved.

For Content-PROD-1 this applies especially to:

- reaction `Zn + HCl`;
- laboratory safety onboarding;
- onion epidermis microscope work;
- any future simulation that could be mistaken for a real experiment protocol.

## Methodist Review Checklist

- Scientific accuracy.
- Curriculum/program alignment.
- Safety and risk framing.
- Age appropriateness.
- Copyright/textbook mapping.
- Source quality, license and citation completeness.
