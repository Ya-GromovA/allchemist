# Data Classification and Lifecycle Map

| Category | Classification | Target | Lifecycle |
|---|---|---|---|
| user state, memberships, progress | restricted/minors | PostgreSQL | purpose-limited retention; export/delete workflow |
| security acknowledgements, go/no-go, handover | confidential audit | append-only audit store + archive | legal/owner-approved retention; immutable |
| backup dry-run status/history | operational confidential | audit/metrics store | retain across RPO/RTO review cycles |
| APK pointer and release manifests | public metadata/integrity critical | immutable release storage | version forever or approved sunset |
| content packs/scientific assets | licensed/public or restricted | object storage + CDN | license-driven versioning and retention |
| uploads/user files | restricted | tenant-separated object storage | malware/type scan; signed access; deletion holds |
| logs/metrics/traces | confidential operational | observability stack | redact PII/secrets; tiered retention |
| generated reports/exports | confidential | object storage | short TTL by default; access audit |
| cache/locks/rate counters | ephemeral | Redis | TTL/eviction; reconstructable |

No migration occurs in ALC-007. Retention periods and lawful basis are **DECISION REQUIRES OWNER/ARCHITECT APPROVAL**.
