# PostgreSQL and Migration Gap Report

PostgreSQL 16.13 is healthy. Catalog-only read-only inspection found one application schema (`public`), 22 relations, 58 constraints and indexes on every listed table. SSL is off. Tenant columns exist on school-domain tables but not all user/device/progress data. No RLS evidence was found.

Alembic 1.13.2 is declared, but no authoritative `alembic.ini`, revision environment or versions tree exists. Multiple init SQL generations and runtime initialization create drift risk.

Decision: adopt Alembic as the only schema migration authority. In ALC-008, capture an approved schema-only baseline, create/stamp an initial revision in an isolated clone, prove upgrade/downgrade/drift detection, and never stamp or migrate production until restore evidence and owner approval exist. Use separate DBs/roles/networks for production, preview, test and development; CI uses ephemeral PostgreSQL. Add PgBouncer only after workload measurement. Transaction boundaries must remain request/job scoped with explicit rollback.
