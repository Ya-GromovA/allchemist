# Target Data Storage Architecture

| Data class | System of record | Secondary/derived store | Rule |
|---|---|---|---|
| identities, schools, roles, grants, progress, assignments, exams | PostgreSQL per environment | Redis cache only | tenant key and object authorization mandatory |
| sessions/revocations | PostgreSQL durable ledger | Redis TTL lookup | Redis loss must not restore revoked sessions |
| content drafts/reviews/publication metadata | PostgreSQL | search/cache | immutable published version and provenance |
| 3D assets, micrographs, media, uploads, reports, exports | versioned S3-compatible object storage | CDN | signed URLs, validation, lifecycle, tenant prefix |
| release artifacts/content packs | immutable release bucket | CDN | signed manifest/hash and rollback |
| logs/traces/audit | dedicated log/audit storage | observability indexes | redaction, append-only audit, fixed retention |
| backups | encrypted immutable off-site repository | restore sandbox | 3-2-1 and tested restore |

Production, preview, test and development must use distinct endpoints, databases, roles, keys and network policies. CI gets an ephemeral isolated database. PostgreSQL uses HA managed service or an owner-approved equivalent, TLS, PITR and connection pooling. Redis is never authoritative. Exact vendor/topology is **DECISION REQUIRES OWNER/ARCHITECT APPROVAL**.
