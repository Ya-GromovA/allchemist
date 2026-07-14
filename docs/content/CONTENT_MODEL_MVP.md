# Content Model MVP

Status: draft for Content-PROD-1.
Scope: seed data and contracts for the first Allchemist content MVP.

## Goals

The MVP content model supports two immediate needs:

1. UI cards for school chemistry, physics and biology launch screens.
2. Future backend import into canonical topic, lesson, block and task tables.

The seed is intentionally conservative. It contains original explanatory text, but it does not mark any lesson as publication-ready until a human methodist attaches approved sources and completes review.

## File Layout

- `content/mvp/chemistry/school-chemistry-content.json`
- `content/mvp/physics/school-physics-content.json`
- `content/mvp/biology/school-biology-content.json`
- `content/mvp/catalog/student-sections.json`
- `content/mvp/catalog/ui-cards.json`
- `content/mvp/catalog/backend-import-manifest.json`

Student content is separated from school content. Content-PROD-1 creates only student catalog sections, not student lessons.

## Content Item Contract

Each MVP content item has:

- `id`: stable import id.
- `subject`: `chemistry`, `physics` or `biology`.
- `educationLevel`: `school`, `university_intro` or `advanced_student`.
- `grade` or `course`: school grade or university course marker.
- `topic`: curriculum-facing topic label.
- `title`: UI/display title.
- `summary`: short card/import summary.
- `learningObjectives`: learner-facing objectives.
- `blocks`: ordered original explanatory blocks.
- `tasks`: lightweight checks for understanding.
- `relatedLab`, `relatedSimulation`, `relatedMicroscope`: optional links to future interactive experiences.
- `sourceMetadata`: source ids, candidate source requirements and evidence notes.
- `verificationStatus`: content QA state.
- `copyrightPolicy`: publication safety statement.
- `lastReviewedAt`: last seed review date.

The TypeScript contract is in `packages/content-core/src/mvp-content.ts` and exported from `packages/content-core/src/index.ts`.

## Verification Statuses

- `draft`: author draft exists but source posture is not final.
- `source_required`: no approved source ids are attached; content cannot be published.
- `verified_by_ai`: AI checked internal consistency, but human review is still required.
- `needs_methodist_review`: sources are attached and methodist review is next.
- `approved`: source, science, methodist, safety and copyright gates are complete.

Content-PROD-1 uses `source_required` for every school item because no approved source package was provided during this task.

## Backend Import Mapping

Suggested future mapping:

- item `topic` -> `Topic.titleRu` or topic import key.
- item `title`/`summary` -> `Lesson.titleRu`/`summaryRu`.
- item `blocks[]` -> `ContentBlock` records.
- item `tasks[]` -> `Task` records.
- item `sourceMetadata.sourceIds` -> `ContentSource` references.
- `verificationStatus` and `copyrightPolicy.allowedForPublication` -> publication gate fields.

The importer must reject publication if:

- `verificationStatus` is `source_required`;
- `sourceMetadata.sourceIds` is empty;
- `copyrightPolicy.allowedForPublication` is false;
- a lab/microscope item lacks safety review.

## Methodist QA Checklist

Before publication a methodist/content reviewer must check:

- scientific correctness;
- match to the chosen curriculum/program;
- safety and age-appropriate risk framing;
- age appropriateness of language and tasks;
- copyright and textbook mapping;
- attached source quality and license posture.
