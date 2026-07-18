# Cache, Queue and Object Storage Decision

Redis is recommended for rate-limit counters, short-lived session/cache lookups, distributed locks and queue coordination. It must not be the sole store for sessions, revocations, progress, assignments, audit events or job intent. Choose persistence/HA/eviction only after capacity and failure analysis.

A durable background queue is required for push delivery, content ingestion/validation, exports/reports, media processing, scheduled retention and backup verification. PostgreSQL stores job intent/idempotency/audit; workers use retries/dead-letter queues and metrics. Technology choice (Celery/RQ/Dramatiq or equivalent) requires owner approval.

Use S3-compatible versioned storage separated by environment and data class for science media, 3D models, micrographs, uploads, content packages, reports, exports, releases and backups. Require encryption, tenant prefixes, signed URLs, validation/quarantine, object lock for backups/releases, lifecycle policies and CDN only for approved public objects. Vendor and regions require approval.
