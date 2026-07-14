# Copyright Policy For Textbook Mapping

Status: draft policy for Content-PROD-1.

## Rule

Do not copy textbook prose, task wording, diagrams, tables, captions or lab instructions into Allchemist seed data unless a license explicitly allows it and the usage is recorded.

Textbook mapping is allowed as reference-only metadata:

- which topic a textbook covers;
- which curriculum objective it supports;
- which source should be consulted by a reviewer;
- which lesson sequence it suggests at a high level.

Reference-only mapping must not reproduce expressive textbook text.

## Original Explanations

All Content-PROD-1 school items use original draft explanations. The drafts are designed to be short, curriculum-adjacent and UI-friendly. They still require source review before publication because original wording does not remove the need for factual and program verification.

## Prohibited Without License

Do not import:

- paragraphs from textbooks;
- scans or photos of textbook pages;
- textbook illustrations or diagrams;
- exact exercise sets;
- answer keys;
- proprietary lab procedure text;
- teacher manual guidance.

## Allowed With Review

The content team may create:

- original summaries;
- original examples with simple numbers;
- original UI labels;
- high-level topic maps;
- source references and bibliographic metadata;
- links to licensed or open resources when license terms allow.

## Required Metadata

Every content item must record:

- text origin;
- source ids or source requirement;
- textbook mapping policy;
- whether publication is allowed;
- reviewer notes for unresolved copyright questions.

In Content-PROD-1, `allowedForPublication` is `false` for all school content because approved sources and legal review are not attached yet.

## Review Gate

Before an item can become `approved`, legal/content QA must confirm:

- no copied expressive text;
- no unlicensed images or diagrams;
- no derivative task wording from a protected source;
- all source metadata is complete;
- all external assets have license records;
- textbook references remain reference-only unless a license says otherwise.
