# Content QA Contracts

## Current persisted tables

| Table | Fields visible in code |
| --- | --- |
| `content_sources` | `id`, `title_ru`, `organization_ru`, `url`, `license_status`, `usage_ru`, `trust_level`, `accessed_at`, `created_at`, `updated_at` |
| `content_blocks` | `id`, `subject`, `level`, `grade`, `program_type`, `textbook_reference_type`, `section`, `topic`, `content_type`, `difficulty`, `title_ru`, `body_ru`, `source_list`, `license_status`, `legal_status`, `verified_by`, `reviewed_by`, `created_by`, `publish_status`, `version`, `content_hash`, `created_at`, `updated_at` |
| `content_qa_events` | `id`, `content_id`, `from_status`, `to_status`, `actor`, `comment`, `created_at` |

## Current endpoints

| Endpoint | Contract |
| --- | --- |
| `GET /api/v1/content/qa/summary` | Public summary of workflow, required metadata, status counts and latest blocks |
| `GET /api/v1/content/qa/sources` | Content manager; filters by `q`, `licenseStatus`, pagination |
| `POST /api/v1/content/qa/sources` | Content manager; upserts source, duplicate checks |
| `GET /api/v1/content/qa/blocks` | Content manager; filters by `q`, `subject`, `publishStatus`, pagination |
| `POST /api/v1/content/qa/blocks` | Content manager; upserts content block, duplicate hash checks |
| `GET /api/v1/content/qa/blocks/{contentId}/events` | Content manager; event history |
| `POST /api/v1/content/qa/blocks/{contentId}/transition` | Content manager; workflow transition |
| `GET /api/v1/content/qa/queues` | Content manager; grouped queues by status |

## Current workflow/statuses

The code accepts these `publish_status` values:

```text
draft -> author_review -> scientific_review -> methodist_review -> content_qa -> legal_review -> published
                                                             \-> archived
```

Publication has a hard gate: a block can move to `published` only from `legal_review`, and required metadata/source checks must pass.

## Required metadata already declared

`subject`, `level`, `grade`, `program_type`, `textbook_reference_type`, `section`, `topic`, `content_type`, `difficulty`, `source_list`, `license_status`, `verified_by`, `reviewed_by`, `updated_at`, `version`, `content_hash`, and `publication_status`.

## Source fields already visible

`titleRu`, `organizationRu`, `url`, `licenseStatus`, `usageRu`, `trustLevel`, `accessedAt/updatedAt` in output-normalized form.

## Author/reviewer fields already visible

`created_by`, `verified_by`, `reviewed_by`, and event `actor`.

## Gaps for scientific verification

- No explicit field for `scientificReviewerId` separate from `verified_by`.
- No explicit `methodistReviewerId` separate from `reviewed_by`.
- No source-level citation anchors per fact or per visualization effect.
- No typed `visualMetadata` contract on content blocks.
- No explicit `aiGenerated`, `aiAssisted`, or `aiSourcePrompt` fields.
- No per-subject validation schema for chemistry reactions, physics models, or biology observations.
- QA endpoints mostly accept/return raw `dict`, not Pydantic models.
