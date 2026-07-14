# Architecture Decision Backlog

Task: ALC-002. These are candidates, not accepted ADRs.

| ADR | Decision needed | Alternatives | Recommendation | Evidence | Consequences | Owner | Blocking milestone |
|---|---|---|---|---|---|---|---|
| ADR-001 | PostgreSQL migration framework | Alembic; ordered SQL; other | evaluate Alembic from verified schema baseline because dependency already exists | no revision tree; SQL bootstraps; 21 tables | introduces migration ownership and CI/rollback requirements | backend + database | G5 / ALC-008 |
| ADR-002 | Redis responsibilities | none; Redis; provider cache | use only if explicit cache/rate/session/job use cases justify it; never durable truth | client/config present, runtime absent | new operations/HA/failure surface | architecture + backend + ops | G7 |
| ADR-003 | Object storage/S3 boundary | protected filesystem; S3-compatible; managed provider | versioned object storage for media/releases/archives after provenance and restore proof | readiness tooling, media/APK/reference needs | URL/CDN, encryption, versioning, cost, retention | ops + content + security | G7/G8 |
| ADR-004 | Queue/background jobs | synchronous; framework tasks; external queue | inventory jobs/idempotency first; choose later | BackgroundTasks/mobile background code, no queue runtime | retry/dead-letter/monitoring complexity | backend + ops | G7 |
| ADR-005 | Error tracking | structured logs only; Sentry-like service; OpenTelemetry backend | choose privacy-aware cross-platform capture or document equivalent | integration not found | SDK, redaction, sampling, alert ownership | SRE + security | G7 |
| ADR-006 | Metrics/traces/logs | current logs; OpenTelemetry; provider agents | define signals/SLOs and redaction before vendor | health routes but no confirmed tracing/error platform | storage/retention/cardinality/PII | SRE | G7 |
| ADR-007 | PWA/offline storage | mobile only; web PWA; shared sync protocol | define server authority and conflict semantics before PWA expansion | mobile SQLite/AsyncStorage, target web | schema/version/device/security burden | mobile + web + backend | G7/G9 |
| ADR-008 | Notification delivery | Expo/provider direct; brokered notification service; in-app only | define consent/token/retry/receipt contract before provider commitment | push adapter and Expo code, E2E unverified | device-token security and operational retries | mobile + backend + security | G6 |
| ADR-009 | Audit storage | PostgreSQL append-only; external immutable sink; hybrid | hybrid durable audit plus immutable export candidate, subject to compliance | audit endpoints/events, retention unknown | cost, query, tamper evidence, access | security + compliance | G6 |
| ADR-010 | Science engine boundaries | one shared engine; subject engines; app-local logic | keep science-core contracts plus independent subject engines/render adapters | existing package split and AGENTS rules | more packages but clearer correctness/testing | science architecture | G7/G9 |
| ADR-011 | AI orchestration boundary | client provider calls; backend adapter; dedicated service | backend-owned provider-neutral orchestration; clients never hold provider keys | active AI backend and partial package | audit/cost/safety/streaming responsibility | AI + backend + security | G6/G7 |
| ADR-012 | Content publication boundary | direct CRUD; workflow service; event-driven pipeline | backend-owned state machine gated by Content QA | active QA tables/endpoints and packages | versioning, audit, reviewer roles | content + QA + backend | G7/G9 |
| ADR-013 | Permanent preview deployment | direct working tree; immutable release + systemd; container | immutable release selected atomically by a service | recovered standalone artifact and deleted cwd incident | service user, health, rollback, retention | operations + release | G3 |
| ADR-014 | Live config source of truth | live-only; repository desired state; config management | operations-owned non-secret desired state plus protected secret injection | live nginx/systemd differ from examples | drift review and change-control requirements | operations + security | G7 |
| ADR-015 | Asset canonicalization | copies per app; shared package; object storage references | separate source/approved/generated classes, then choose per-runtime packaging | 23 duplicate groups and missing provenance | build/offline/CDN implications | design + content + apps | G8 |
| ADR-016 | Future `apps/api` and `apps/mobile` paths | retain backend/mobile; relocate now; gradual adapters | retain current canonical paths until benefits and migration cost are approved | AGENTS target differs from existing layout | import/history/build and deployment churn | architecture + repository | G7 |
| ADR-017 | Feature flag lifecycle | auth entitlements only; DB flags; external service | start with backend-owned audited flags if product requires dynamic rollout | featureFlags fragments, no lifecycle | targeting, expiry, availability, security | backend + product + ops | G6 |
| ADR-018 | Runtime-state destinations | PostgreSQL; protected filesystem; audit/object split | decide per state class using durability/security table | mutable JSON and known consumers | migration/dual-write/retention work | data + security + backend | G5/G6 |

## ADR acceptance rule

Each accepted ADR must include:

- decision owner and date;
- facts versus assumptions;
- security/tenant/data implications;
- migration and rollback;
- operational cost and failure modes;
- validation plan;
- superseded decision, if any.

An ADR recommendation above does not authorize installation, provisioning, schema change, or production configuration.
