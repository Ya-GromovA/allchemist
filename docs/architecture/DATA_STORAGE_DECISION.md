# Data Storage Decision

Date: 2026-07-08
Scope: Milestone 1 foundation. No backend schema migration is created in this step.

## Decision

PostgreSQL remains the primary database for Allchemist. The platform needs strong relational integrity for users, roles, schools, licenses, content lifecycle, QA events, progress events, attempts and payments. PostgreSQL also gives us JSONB for flexible scientific payloads and pgvector for future AI retrieval without introducing a second primary database.

MongoDB is not selected as the primary database. The current backend, production Docker and operational tests already use PostgreSQL, and the domain has many relationships that benefit from constraints, indexes, transactions and migrations. Adding MongoDB as primary would increase operational and consistency risk without solving a current blocker.

## PostgreSQL Relational Tables

Use relational tables for entities with identity, ownership, permissions, audit and joins:

- users, sessions, roles, scopes and access grants;
- organizations, schools, sites, classes, memberships and invite codes;
- subscriptions, payments, invoices and webhook audit;
- content sources, content items, content versions, content reviews and QA events;
- media asset metadata;
- attempts, progress events and analytics facts.

## PostgreSQL JSONB

Use JSONB for versioned payloads that need schema evolution while retaining relational ownership:

- content block body payloads;
- lab scenario step payloads;
- reaction observations and safety metadata;
- physics simulation parameter constraints and graph definitions;
- biology specimen labels and microscope annotations;
- localized metadata and source snapshots;
- client/device sync payloads.

JSONB fields should still have typed TypeScript contracts and validation. They should not become unbounded bags of UI state.

## pgvector

Use pgvector later for AI retrieval and semantic search:

- `ai_knowledge_chunks`;
- source-backed lesson snippets;
- verified content summaries;
- task explanations and misconception tags.

Vectors should point back to immutable content/source/version rows. AI-generated durable content must pass Content QA before publication.

## Redis

Use Redis for ephemeral and operational data:

- rate limits;
- OTP/session throttling;
- short-lived queues;
- cache for expensive dashboard aggregates;
- live lesson presence and transient notifications.

Redis must not be the source of truth for content, payments, licenses or attempts.

## Object Storage / S3-Compatible

Use object storage for large immutable or versioned blobs:

- videos;
- generated images;
- 3D assets such as GLB/glTF;
- microscope tiles and large media packs;
- APK/content-pack artifacts;
- screenshot artifacts and visual QA reports.

PostgreSQL stores metadata, ownership, source, license, checksums and publication state. Object storage stores bytes.

## Mobile SQLite

Use SQLite on mobile for offline-first runtime:

- downloaded immutable content packs;
- local lesson/task/molecule/reaction/scenario data;
- local AI docs for offline fallback;
- local attempts and progress awaiting sync;
- content metadata and cache validation.

SQLite schemas should be compatible with published content-pack contracts, not with arbitrary React component state.

## Immutable Content Packs

Publish content packs as immutable versioned artifacts with:

- pack id;
- version;
- generated/updated timestamps;
- content hash;
- source manifest;
- license manifest;
- QA status summary;
- media references;
- backward-compatible payloads.

Clients install by pack id/version/hash and sync progress separately from content.

## School Content Without Copying Textbooks

Store textbook and curriculum maps as references:

- author names;
- grade/program;
- section/topic mapping;
- permitted usage policy;
- page/paragraph reference where legally allowed;
- Allchemist-authored explanations, tasks and summaries as separate owned content.

Do not store copied textbook prose unless a license explicitly allows it.

## Advanced Student Content

Extended student/university-intro content should use the same source, authorship, license and QA workflow as school content. It can add higher difficulty tags, prerequisite graphs and advanced topic maps, but it should not bypass scientific verification.
