# Backend Schema Roadmap

Date: 2026-07-08
Scope: roadmap only. No Alembic migration is created in this milestone.

## Migration Principles

- Keep current production routes stable until explicit route-switch approval.
- Convert startup raw SQL and JSON state into Alembic-managed tables incrementally.
- Add tables behind existing API behavior first, then migrate readers/writers.
- Every migration needs rollback notes, backfill plan and production smoke checks.
- JSONB is allowed for versioned science payloads, but identity, ownership and review state should stay relational.

## Tables

### content_sources

Purpose: canonical source and license registry.
Important columns: id, title_ru, organization_ru, url, license_status, usage_ru, trust_level, accessed_at, created_at, updated_at.
Indexes: license_status, trust_level, updated_at.
Relations: referenced by content blocks, scientific facts, media assets and AI chunks.
Migration risk: existing rows may be duplicated between constants, JSON packs and PostgreSQL.

### content_items

Purpose: stable identity for lessons, tasks, labs, simulations and articles.
Important columns: id, subject, module_id, title_ru, content_type, owner_id, current_version_id, publication_status.
Indexes: subject/content_type, module_id, publication_status.
Relations: one-to-many content_versions, content_blocks and content_relations.
Migration risk: needs careful mapping from mobile pack ids and backend content endpoints.

### content_versions

Purpose: immutable version records.
Important columns: id, content_item_id, version, content_hash, payload_jsonb, created_by, created_at.
Indexes: content_item_id/version unique, content_hash.
Relations: parent content_items, reviews, QA events.
Migration risk: current mutable content must be snapshotted.

### content_blocks

Purpose: structured theory/task/source blocks inside versions.
Important columns: id, content_version_id, block_type, order_index, body_ru, payload_jsonb, source_ids.
Indexes: content_version_id/order_index, block_type.
Relations: content_versions, content_sources.
Migration risk: existing `content_blocks` table must be reconciled with versioned model.

### content_relations

Purpose: prerequisites, topic links, task-to-lesson links and media references.
Important columns: id, from_content_id, to_content_id, relation_type, payload_jsonb.
Indexes: from_content_id, to_content_id, relation_type.
Relations: content_items.
Migration risk: relation types must be constrained before UI depends on them.

### curriculum_maps

Purpose: school/exam/program topic mapping.
Important columns: id, subject, level, grade, program_type, section, topic_ids, source_ids.
Indexes: subject/grade/program_type.
Relations: topics/content_items and sources.
Migration risk: avoid copying protected curriculum text beyond references.

### textbook_maps

Purpose: author/textbook-to-topic mapping without copying textbook prose.
Important columns: id, subject, title_ru, authors_jsonb, grade, publisher, usage_policy, topic_ids.
Indexes: subject/grade, usage_policy.
Relations: curriculum maps, sources, content items.
Migration risk: legal/license review required.

### content_reviews

Purpose: current review assignments and decisions.
Important columns: id, content_version_id, reviewer_id, review_area, status, comment, decided_at.
Indexes: content_version_id, reviewer_id/status, review_area/status.
Relations: content_versions, users.
Migration risk: must align with existing Content QA routes.

### content_qa_events

Purpose: append-only QA audit trail.
Important columns: id, content_id, from_status, to_status, actor_id, comment, payload_jsonb, created_at.
Indexes: content_id/created_at, actor_id/created_at.
Relations: content_items/content_versions, users.
Migration risk: preserve existing audit semantics.

### media_assets

Purpose: metadata for images, video, 3D and generated assets.
Important columns: id, storage_key, mime_type, checksum, title_ru, source_ids, license_status, width, height, duration_sec, created_at.
Indexes: checksum, mime_type, license_status.
Relations: content items, sources.
Migration risk: existing static assets need checksums and ownership classification.

### reactions

Purpose: verified chemistry reaction registry.
Important columns: id, equation, title_ru, verification_status, safety_status, source_ids, payload_jsonb.
Indexes: verification_status, safety_status.
Relations: substances, molecules, lab_scenarios.
Migration risk: current demo/draft reactions must not be marked publishable.

### substances

Purpose: chemical substances and hazards.
Important columns: id, formula, name_ru, state, hazard_jsonb, source_ids, verification_status.
Indexes: formula, verification_status.
Relations: reactions, lab scenarios.
Migration risk: deduplicate formulas and aliases.

### molecules

Purpose: molecule metadata and model references.
Important columns: id, formula, name, branch, model_asset_id, data_jsonb, source_ids, verification_status.
Indexes: formula, branch, verification_status.
Relations: substances, media_assets.
Migration risk: existing PubChem/imported molecules need source/license clarity.

### lab_scenarios

Purpose: stable lab scenario identity.
Important columns: id, subject, title_ru, reaction_id, current_version_id, publication_status.
Indexes: subject, reaction_id, publication_status.
Relations: lab_scenario_versions, reactions.
Migration risk: UI must consume versioned scenario payloads only.

### lab_scenario_versions

Purpose: immutable scenario steps, safety and observation payload.
Important columns: id, lab_scenario_id, version, payload_jsonb, content_hash, created_at.
Indexes: lab_scenario_id/version unique.
Relations: lab_scenarios.
Migration risk: backfill from packs without changing mobile runtime.

### lab_attempts

Purpose: learner attempts in labs.
Important columns: id, user_id, scenario_id, scenario_version_id, completed, score, started_at, completed_at, payload_jsonb.
Indexes: user_id/started_at, scenario_id, completed.
Relations: users, lab_scenarios, progress_events.
Migration risk: reconcile with existing generic progress sync.

### physics_laws

Purpose: verified formulas/laws.
Important columns: id, title_ru, formula_jsonb, variables_jsonb, source_ids, verification_status.
Indexes: verification_status.
Relations: physics_simulations.
Migration risk: formula validation required before publication.

### physics_simulations

Purpose: versioned simulation scenarios.
Important columns: id, law_id, title_ru, payload_jsonb, verification_status, publication_status.
Indexes: law_id, publication_status.
Relations: physics_laws, simulation_attempts.
Migration risk: deterministic engine version must be tracked.

### simulation_attempts

Purpose: learner attempts in simulations.
Important columns: id, user_id, simulation_id, input_jsonb, output_jsonb, validation_ok, score, created_at.
Indexes: user_id/created_at, simulation_id.
Relations: users, physics_simulations, progress_events.
Migration risk: payloads may be large; keep summaries indexed.

### biology_specimens

Purpose: biology specimen registry.
Important columns: id, title_ru, preparation_ru, structures_jsonb, source_ids, verification_status.
Indexes: verification_status.
Relations: microscope_scenarios.
Migration risk: image/tile assets must be separated from metadata.

### microscope_scenarios

Purpose: microscope interaction scenarios.
Important columns: id, specimen_id, title_ru, magnifications_jsonb, labels_jsonb, task_jsonb, publication_status.
Indexes: specimen_id, publication_status.
Relations: biology_specimens, media_assets.
Migration risk: label coordinates need renderer-independent contracts.

### ai_knowledge_chunks

Purpose: source-backed AI retrieval chunks.
Important columns: id, content_version_id, source_ids, subject, body, metadata_jsonb, created_at.
Indexes: subject, content_version_id.
Relations: content_versions, content_sources, ai_embeddings.
Migration risk: generated text must be separated from verified source text.

### ai_embeddings

Purpose: vector embeddings for AI retrieval.
Important columns: id, chunk_id, embedding vector, model, dimensions, created_at.
Indexes: vector index, chunk_id.
Relations: ai_knowledge_chunks.
Migration risk: model changes require re-embedding strategy.

### progress_events

Purpose: append-only learning event stream.
Important columns: id, user_id, subject, module_id, content_id, activity_type, result, score, duration_sec, device_id, created_at, payload_jsonb.
Indexes: user_id/created_at, subject/activity_type, content_id.
Relations: users, content_items, attempts.
Migration risk: high volume; partitioning or retention policy may be needed later.
