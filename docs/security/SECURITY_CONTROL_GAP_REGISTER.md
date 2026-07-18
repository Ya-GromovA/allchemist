# ALC-007 Unified Security and Architecture Finding Register

Canonical machine-readable register: `ALC_007_FINDINGS_REGISTER.json`. Total: 20. Severity: {'P0': 2, 'P1': 14, 'P2': 4}. Status: {'NEEDS_VERIFICATION': 2, 'OPEN': 13, 'PARTIAL': 5}. No finding is RESOLVED.

| ID | Category | Severity | Status | Title |
|---|---|---|---|---|
| ALC007-INF-001 | INFRASTRUCTURE | P0 | OPEN | Production repository is world-writable |
| ALC007-INF-002 | NETWORK | P0 | OPEN | Backend and PostgreSQL published on all interfaces |
| ALC007-INF-003 | INFRASTRUCTURE | P1 | OPEN | Legacy preview runs as root from production checkout |
| ALC007-DAT-001 | MIGRATIONS | P1 | OPEN | No authoritative Alembic revision tree |
| ALC007-DAT-002 | DATABASE | P1 | OPEN | Environment databases are not separated |
| ALC007-DAT-003 | TENANT_ISOLATION | P1 | PARTIAL | Tenant keys are incomplete and not database-enforced globally |
| ALC007-DAT-004 | RUNTIME_STATE | P1 | OPEN | Mutable JSON state remains on protected filesystem candidates |
| ALC007-CQO-001 | CACHE_QUEUE | P2 | OPEN | No Redis or durable job runtime exists |
| ALC007-OBJ-001 | OBJECT_STORAGE | P1 | OPEN | No managed object-storage boundary |
| ALC007-AUT-001 | AUTH | P1 | PARTIAL | Password baseline exists but complete account defense is unproven |
| ALC007-AUT-002 | SECRETS | P1 | NEEDS_VERIFICATION | Secrets management and rotation are not evidenced |
| ALC007-RBA-001 | RBAC | P1 | PARTIAL | Role catalogue exceeds demonstrated enforcement |
| ALC007-CNT-001 | CONTENT_QA | P1 | PARTIAL | Publication workflow exists but immutability and override controls are incomplete |
| ALC007-AIG-001 | AI_GOVERNANCE | P1 | OPEN | AI data governance is not approved |
| ALC007-OBS-001 | OBSERVABILITY | P1 | OPEN | No end-to-end observability stack is evidenced |
| ALC007-BDR-001 | BACKUP_RESTORE | P1 | OPEN | Backup presence lacks independent restore proof |
| ALC007-PWA-001 | MOBILE_PWA | P2 | PARTIAL | Offline data lifecycle and shared-device controls are incomplete |
| ALC007-NOT-001 | NOTIFICATIONS | P2 | NEEDS_VERIFICATION | Notification preferences and token governance are incomplete |
| ALC007-TLS-001 | TRANSPORT_SECURITY | P1 | OPEN | Database transport encryption is disabled |
| ALC007-DRP-001 | RELEASE_DR | P2 | OPEN | Release and rollback are only partially reproducible |

## Full finding records

### ALC007-INF-001 — Production repository is world-writable

- **Category:** INFRASTRUCTURE
- **Title:** Production repository is world-writable
- **Severity:** P0
- **Status:** OPEN
- **Evidence:** stat mode 777 on /root/synapse
- **Affected Components:** production source and runtime
- **User Business Impact:** Uncontrolled mutation and attribution loss
- **Security Data Impact:** Source/config integrity compromise
- **Production Risk:** Critical
- **Recommended Remediation:** Change ownership and least-privilege mode after path attribution
- **Prerequisites:** owner inventory and maintenance window
- **Migration Gate:** G7
- **Suggested Owner Role:** Platform/SRE
- **Safe Verification Method:** stat and service-account access test
- **Prohibited Unsafe Verification:** chmod in audit
- **Dependencies:** ALC-003 ownership
- **Estimated Implementation Phase:** ALC-008/009
- **Rollback Consideration:** Restore recorded ACL/mode
- **Acceptance Criteria:** No world-writable production tree; services retain required access
- **Source References:** server preflight; FILE_OWNERSHIP_AND_BOUNDARIES.md

### ALC007-INF-002 — Backend and PostgreSQL published on all interfaces

- **Category:** NETWORK
- **Title:** Backend and PostgreSQL published on all interfaces
- **Severity:** P0
- **Status:** OPEN
- **Evidence:** listeners 0.0.0.0:8000 and :5433; UFW inactive
- **Affected Components:** Docker compose, host firewall
- **User Business Impact:** Avoidable public attack surface
- **Security Data Impact:** Direct DB/API exposure
- **Production Risk:** Critical
- **Recommended Remediation:** Bind to loopback/private network and enforce deny-by-default firewall
- **Prerequisites:** approved network map and rollback
- **Migration Gate:** G6
- **Suggested Owner Role:** Platform/Security
- **Safe Verification Method:** external inventory plus local listener check
- **Prohibited Unsafe Verification:** active probing or firewall edits
- **Dependencies:** TLS and service routing
- **Estimated Implementation Phase:** ALC-008
- **Rollback Consideration:** Restore prior bindings from versioned config
- **Acceptance Criteria:** Only approved ingress ports externally reachable
- **Source References:** ss/nft/docker ps evidence

### ALC007-INF-003 — Legacy preview runs as root from production checkout

- **Category:** INFRASTRUCTURE
- **Title:** Legacy preview runs as root from production checkout
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** allchemist-web-preview.service User=root and /root/synapse paths
- **Affected Components:** 3010 legacy preview
- **User Business Impact:** Restart can mutate production build tree
- **Security Data Impact:** Root service expands blast radius
- **Production Risk:** High
- **Recommended Remediation:** Retire 3010 after parity or package immutable non-root release
- **Prerequisites:** ALC-004 approval
- **Migration Gate:** G7
- **Suggested Owner Role:** Platform/SRE
- **Safe Verification Method:** cold-start isolated artifact test
- **Prohibited Unsafe Verification:** restart or shutdown during audit
- **Dependencies:** preview replacement
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** Keep current unit until proven rollback
- **Acceptance Criteria:** No runtime executes from production checkout; rollback tested
- **Source References:** systemd unit metadata

### ALC007-DAT-001 — No authoritative Alembic revision tree

- **Category:** MIGRATIONS
- **Title:** No authoritative Alembic revision tree
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** alembic dependency/wheel exists; no alembic.ini or versions tree
- **Affected Components:** PostgreSQL schema and backend
- **User Business Impact:** Schema changes cannot be ordered or reproduced
- **Security Data Impact:** Drift and unsafe rollback
- **Production Risk:** High
- **Recommended Remediation:** Adopt Alembic with stamped audited baseline and forward/rollback policy
- **Prerequisites:** schema snapshot and owner approval
- **Migration Gate:** G5
- **Suggested Owner Role:** Database Engineering
- **Safe Verification Method:** fresh isolated DB upgrade/downgrade
- **Prohibited Unsafe Verification:** migration against production
- **Dependencies:** database baseline
- **Estimated Implementation Phase:** ALC-008
- **Rollback Consideration:** restore isolated snapshot; production change plan separate
- **Acceptance Criteria:** Clean DB reaches expected schema; drift check and rollback pass
- **Source References:** repository migration inventory

### ALC007-DAT-002 — Environment databases are not separated

- **Category:** DATABASE
- **Title:** Environment databases are not separated
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** compose defines one synapse DB; production host also used by tests historically
- **Affected Components:** production/preview/test/development
- **User Business Impact:** Tests or preview can affect production
- **Security Data Impact:** Cross-environment data exposure
- **Production Risk:** High
- **Recommended Remediation:** Separate clusters or instances, roles, credentials and network policies
- **Prerequisites:** environment ownership
- **Migration Gate:** G5
- **Suggested Owner Role:** Database/SRE
- **Safe Verification Method:** connection target fingerprints without secrets
- **Prohibited Unsafe Verification:** point tests at production
- **Dependencies:** secrets management
- **Estimated Implementation Phase:** ALC-008
- **Rollback Consideration:** independent environment restore
- **Acceptance Criteria:** Each environment has unique endpoint/role/database and CI uses ephemeral DB
- **Source References:** compose and CI history

### ALC007-DAT-003 — Tenant keys are incomplete and not database-enforced globally

- **Category:** TENANT_ISOLATION
- **Title:** Tenant keys are incomplete and not database-enforced globally
- **Severity:** P1
- **Status:** PARTIAL
- **Evidence:** school tables have school_id FKs; user_progress, device_registry and content tables lack tenant key; no RLS evidence
- **Affected Components:** schools, progress, devices, grants
- **User Business Impact:** Possible cross-school access
- **Security Data Impact:** Confidentiality breach for minors
- **Production Risk:** High
- **Recommended Remediation:** Tenant-scoped schema, composite keys, RLS or mandatory policy layer with tests
- **Prerequisites:** canonical tenant model
- **Migration Gate:** G6
- **Suggested Owner Role:** Security/Backend/DB
- **Safe Verification Method:** isolated two-tenant authorization matrix
- **Prohibited Unsafe Verification:** adversarial production E2E
- **Dependencies:** RBAC design
- **Estimated Implementation Phase:** ALC-008/009
- **Rollback Consideration:** feature flag and reversible policy rollout
- **Acceptance Criteria:** Every tenant-owned row has enforced tenant scope and cross-tenant tests
- **Source References:** catalog metadata and source queries

### ALC007-DAT-004 — Mutable JSON state remains on protected filesystem candidates

- **Category:** RUNTIME_STATE
- **Title:** Mutable JSON state remains on protected filesystem candidates
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** user_state and security history files exist in production; consumers documented
- **Affected Components:** auth, security acknowledgements, operational history
- **User Business Impact:** Single-host state and concurrency risk
- **Security Data Impact:** Loss/tampering of security records
- **Production Risk:** High
- **Recommended Remediation:** Move transactional identity/state to PostgreSQL and append-only audit events to audit storage
- **Prerequisites:** data classification, import validation, backups
- **Migration Gate:** G5
- **Suggested Owner Role:** Backend/Data
- **Safe Verification Method:** fixture migration in isolated DB with counts/hashes only
- **Prohibited Unsafe Verification:** read or migrate production payload
- **Dependencies:** ALC-008
- **Estimated Implementation Phase:** retain encrypted snapshot and dual-read rollback window
- **Rollback Consideration:** No authoritative mutable JSON; consumers use managed stores
- **Acceptance Criteria:** runtime path metadata; ALC-003 runtime report
- **Source References:** user_state and security history files exist in production; consumers documented

### ALC007-CQO-001 — No Redis or durable job runtime exists

- **Category:** CACHE_QUEUE
- **Title:** No Redis or durable job runtime exists
- **Severity:** P2
- **Status:** OPEN
- **Evidence:** no Redis/queue container; REDIS_URL only configuration name
- **Affected Components:** rate limits, notifications, imports, scheduled tasks
- **User Business Impact:** In-process coordination does not scale
- **Security Data Impact:** Lost jobs and inconsistent limits
- **Production Risk:** Medium
- **Recommended Remediation:** Use Redis only for ephemeral cache/rate limits/locks and durable queue metadata backed by PostgreSQL
- **Prerequisites:** workload and HA decision
- **Migration Gate:** G7
- **Suggested Owner Role:** Platform/Backend
- **Safe Verification Method:** failure/reconstruction tests in isolated stack
- **Prohibited Unsafe Verification:** install/provision during audit
- **Dependencies:** object storage and observability
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** disable workers and replay durable job ledger
- **Acceptance Criteria:** Ephemeral data reconstructs; durable jobs survive Redis loss
- **Source References:** docker and source inventory

### ALC007-OBJ-001 — No managed object-storage boundary

- **Category:** OBJECT_STORAGE
- **Title:** No managed object-storage boundary
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** content packs/assets/releases/backups are filesystem/repository paths; no bucket runtime
- **Affected Components:** media, 3D, micrographs, uploads, reports, releases
- **User Business Impact:** Scaling and distribution blocked
- **Security Data Impact:** Weak tenant/lifecycle controls
- **Production Risk:** High
- **Recommended Remediation:** S3-compatible versioned buckets with per-class lifecycle, signed URLs, validation and CDN
- **Prerequisites:** data classification and provider approval
- **Migration Gate:** G7
- **Suggested Owner Role:** Platform/Data Governance
- **Safe Verification Method:** isolated bucket policy and lifecycle tests
- **Prohibited Unsafe Verification:** create buckets or credentials
- **Dependencies:** CDN/security
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** versioned objects and manifest rollback
- **Acceptance Criteria:** Versioning, encryption, tenant prefixes, malware validation and restore tested
- **Source References:** repository paths and object readiness docs

### ALC007-AUT-001 — Password baseline exists but complete account defense is unproven

- **Category:** AUTH
- **Title:** Password baseline exists but complete account defense is unproven
- **Severity:** P1
- **Status:** PARTIAL
- **Evidence:** UI states minimum 8; auth code has token rotation/revocation and OTP limits; compromised-password, MFA and robust lockout evidence absent
- **Affected Components:** public/admin authentication
- **User Business Impact:** Account takeover risk
- **Security Data Impact:** Credential stuffing/brute force
- **Production Risk:** High
- **Recommended Remediation:** Argon2id/bcrypt policy, breached-password screening, progressive delay, MFA for privileged roles and recovery controls
- **Prerequisites:** identity owner and privacy review
- **Migration Gate:** G6
- **Suggested Owner Role:** Security/Identity
- **Safe Verification Method:** isolated auth tests and code review
- **Prohibited Unsafe Verification:** credential stuffing in production
- **Dependencies:** rate-limit Redis
- **Estimated Implementation Phase:** ALC-008/009
- **Rollback Consideration:** support break-glass and session revocation
- **Acceptance Criteria:** Policy enforced server-side; privileged MFA; rotation/recovery tests pass
- **Source References:** auth schemas/config names/source

### ALC007-AUT-002 — Secrets management and rotation are not evidenced

- **Category:** SECRETS
- **Title:** Secrets management and rotation are not evidenced
- **Severity:** P1
- **Status:** NEEDS_VERIFICATION
- **Evidence:** many provider secret variable names; env values intentionally not read; no vault/rotation evidence
- **Affected Components:** DB, JWT, AI, payment, push, admin credentials
- **User Business Impact:** Outage and compromise recovery uncertain
- **Security Data Impact:** Credential compromise blast radius
- **Production Risk:** High
- **Recommended Remediation:** Managed secret store, workload identity where possible, rotation inventory and audited break-glass
- **Prerequisites:** owner/provider approvals
- **Migration Gate:** G6
- **Suggested Owner Role:** Security/Platform
- **Safe Verification Method:** rotation drill using non-production secrets
- **Prohibited Unsafe Verification:** print or rotate production secrets in audit
- **Dependencies:** environment separation
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** dual-key overlap and documented rollback
- **Acceptance Criteria:** All secrets inventoried by name/owner/expiry; rotations tested without disclosure
- **Source References:** config variable-name inventory only

### ALC007-RBA-001 — Role catalogue exceeds demonstrated enforcement

- **Category:** RBAC
- **Title:** Role catalogue exceeds demonstrated enforcement
- **Severity:** P1
- **Status:** PARTIAL
- **Evidence:** UI and contracts mention many roles; selected admin permissions exist; full endpoint/object matrix absent
- **Affected Components:** student, parent, teacher, school admin, QA, support, finance, sysadmin, owner
- **User Business Impact:** Unauthorized functions or data may be exposed
- **Security Data Impact:** Privilege escalation
- **Production Risk:** High
- **Recommended Remediation:** Central policy service with deny-by-default permission and object predicates; separation of duties
- **Prerequisites:** approved role matrix
- **Migration Gate:** G6
- **Suggested Owner Role:** Security/Product
- **Safe Verification Method:** isolated role-object-tenant matrix tests
- **Prohibited Unsafe Verification:** production adversarial testing
- **Dependencies:** tenant model
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** policy version rollback
- **Acceptance Criteria:** All roles have explicit permissions and negative tests; impersonation audited
- **Source References:** source RBAC inventory

### ALC007-CNT-001 — Publication workflow exists but immutability and override controls are incomplete

- **Category:** CONTENT_QA
- **Title:** Publication workflow exists but immutability and override controls are incomplete
- **Severity:** P1
- **Status:** PARTIAL
- **Evidence:** content_blocks and content_qa_events exist with statuses/events; no immutable release/version enforcement evidence
- **Affected Components:** scientific content and QA
- **User Business Impact:** Unsafe or unreviewed content publication
- **Security Data Impact:** Scientific/safety harm
- **Production Risk:** High
- **Recommended Remediation:** Versioned drafts, two-person approval for blocking/safety findings, immutable release manifests and signed rollback
- **Prerequisites:** content owner and safety taxonomy
- **Migration Gate:** G7
- **Suggested Owner Role:** Content QA/Safety
- **Safe Verification Method:** fixture workflow and immutable-version tests
- **Prohibited Unsafe Verification:** publish production content
- **Dependencies:** object storage/provenance
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** rollback by prior immutable manifest
- **Acceptance Criteria:** No mutable published version; overrides require reason and second approver
- **Source References:** DB catalog and content endpoint source

### ALC007-AIG-001 — AI data governance is not approved

- **Category:** AI_GOVERNANCE
- **Title:** AI data governance is not approved
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** provider abstraction/config exists; no complete PII/minor retention, prompt audit or model provenance policy
- **Affected Components:** AI mentor and provider calls
- **User Business Impact:** Uncontrolled minor data use and unreliable answers
- **Security Data Impact:** Privacy, prompt injection, scientific safety
- **Production Risk:** High
- **Recommended Remediation:** Redaction gateway, minimal retention, provider allowlist, model/version provenance, safety classifiers, uncertainty and human handoff
- **Prerequisites:** DPIA/legal/product approval
- **Migration Gate:** G7
- **Suggested Owner Role:** AI Governance/Security
- **Safe Verification Method:** synthetic prompts and policy tests only
- **Prohibited Unsafe Verification:** send real minors data or adversarial production prompts
- **Dependencies:** observability and content safety
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** provider kill switch and offline fallback
- **Acceptance Criteria:** Approved DPIA; no prohibited PII; outputs traceable and safety-tested
- **Source References:** AI source/config and docs

### ALC007-OBS-001 — No end-to-end observability stack is evidenced

- **Category:** OBSERVABILITY
- **Title:** No end-to-end observability stack is evidenced
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** health endpoints and operational docs exist; no Prometheus/OTel/error-tracker runtime
- **Affected Components:** frontend, backend, DB, jobs, security
- **User Business Impact:** Slow detection and diagnosis
- **Security Data Impact:** Security incidents may go unnoticed
- **Production Risk:** High
- **Recommended Remediation:** OpenTelemetry instrumentation, Prometheus/Grafana, Loki, Sentry, Alertmanager and synthetic probes
- **Prerequisites:** data redaction and SLO approval
- **Migration Gate:** G7
- **Suggested Owner Role:** SRE/Observability
- **Safe Verification Method:** synthetic event in isolated environment
- **Prohibited Unsafe Verification:** induce production failures
- **Dependencies:** audit log architecture
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** disable exporters and preserve local logs
- **Acceptance Criteria:** SLO dashboards, alerts, traces and redaction tests pass
- **Source References:** runtime/source observability inventory

### ALC007-BDR-001 — Backup presence lacks independent restore proof

- **Category:** BACKUP_RESTORE
- **Title:** Backup presence lacks independent restore proof
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** backup scripts/status/history exist; no verified current full restore evidence
- **Affected Components:** DB, runtime state, assets, repository
- **User Business Impact:** Recovery time and completeness unknown
- **Security Data Impact:** Permanent data loss/ransomware risk
- **Production Risk:** High
- **Recommended Remediation:** Encrypted immutable off-site 3-2-1 backups and scheduled isolated restore drills
- **Prerequisites:** asset inventory and recovery owners
- **Migration Gate:** G5
- **Suggested Owner Role:** SRE/Database
- **Safe Verification Method:** restore into isolated network and verify schema/manifests
- **Prohibited Unsafe Verification:** restore over production
- **Dependencies:** object storage and secrets
- **Estimated Implementation Phase:** ALC-008
- **Rollback Consideration:** retain multiple immutable generations
- **Acceptance Criteria:** RPO/RTO met in timestamped restore drill without production access
- **Source References:** backup manifests/scripts/docs

### ALC007-PWA-001 — Offline data lifecycle and shared-device controls are incomplete

- **Category:** MOBILE_PWA
- **Title:** Offline data lifecycle and shared-device controls are incomplete
- **Severity:** P2
- **Status:** PARTIAL
- **Evidence:** AsyncStorage/SQLite/offline queues and logout cleanup exist; encryption, conflict policy and corrupt-cache recovery not fully evidenced; no web service worker
- **Affected Components:** mobile/PWA local data
- **User Business Impact:** Lost progress or data left on shared devices
- **Security Data Impact:** Minor data disclosure
- **Production Risk:** Medium
- **Recommended Remediation:** Classify local fields, encrypt sensitive storage, user-scoped cache, deterministic conflict/version policy and logout wipe
- **Prerequisites:** mobile threat model
- **Migration Gate:** G7
- **Suggested Owner Role:** Mobile/Security
- **Safe Verification Method:** emulator tests with synthetic accounts
- **Prohibited Unsafe Verification:** inspect real device data
- **Dependencies:** sync API and notifications
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** cache reset and server-authoritative resync
- **Acceptance Criteria:** Logout wipes sensitive state; conflict/corruption/shared-device tests pass
- **Source References:** mobile storage source inventory

### ALC007-NOT-001 — Notification preferences and token governance are incomplete

- **Category:** NOTIFICATIONS
- **Title:** Notification preferences and token governance are incomplete
- **Severity:** P2
- **Status:** NEEDS_VERIFICATION
- **Evidence:** push registration and sound/haptic preferences exist; token retention, consent, tenant audience and revocation evidence incomplete
- **Affected Components:** push/in-app/sound/haptics
- **User Business Impact:** Unwanted or misdirected notifications
- **Security Data Impact:** Device token and minor privacy risk
- **Production Risk:** Medium
- **Recommended Remediation:** Per-user/device consent, tenant-scoped audiences, token expiry/revocation and server preference source of truth
- **Prerequisites:** product/privacy approval
- **Migration Gate:** G6
- **Suggested Owner Role:** Mobile/Backend
- **Safe Verification Method:** synthetic device-token lifecycle tests
- **Prohibited Unsafe Verification:** send production notifications
- **Dependencies:** queue and secrets
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** provider disable switch
- **Acceptance Criteria:** Consent/preferences honored across devices; revoked tokens unusable
- **Source References:** mobile and push provider source

### ALC007-TLS-001 — Database transport encryption is disabled

- **Category:** TRANSPORT_SECURITY
- **Title:** Database transport encryption is disabled
- **Severity:** P1
- **Status:** OPEN
- **Evidence:** PostgreSQL SHOW ssl = off; port 5433 exposed
- **Affected Components:** database connections
- **User Business Impact:** Credentials/data travel unencrypted outside container network
- **Security Data Impact:** Interception risk
- **Production Risk:** High
- **Recommended Remediation:** Private network binding plus TLS verification for any cross-host DB traffic
- **Prerequisites:** PKI and client compatibility
- **Migration Gate:** G6
- **Suggested Owner Role:** Platform/Database
- **Safe Verification Method:** isolated TLS connection verification
- **Prohibited Unsafe Verification:** change production TLS
- **Dependencies:** network remediation
- **Estimated Implementation Phase:** ALC-008
- **Rollback Consideration:** parallel endpoint and rollback certificate
- **Acceptance Criteria:** No public DB listener; TLS required and verified where traffic leaves host namespace
- **Source References:** read-only SHOW ssl and listener metadata

### ALC007-DRP-001 — Release and rollback are only partially reproducible

- **Category:** RELEASE_DR
- **Title:** Release and rollback are only partially reproducible
- **Severity:** P2
- **Status:** OPEN
- **Evidence:** canonical preview immutable layout exists; production backend/legacy release is compose/checkout coupled and rollback evidence incomplete
- **Affected Components:** backend and web releases
- **User Business Impact:** Long outage or inconsistent rollback
- **Security Data Impact:** Rollback can restore vulnerable state
- **Production Risk:** Medium
- **Recommended Remediation:** Immutable versioned releases, manifests, health gates and one-command reviewed rollback
- **Prerequisites:** artifact registry and ownership
- **Migration Gate:** G7
- **Suggested Owner Role:** Release Engineering
- **Safe Verification Method:** isolated deploy/rollback rehearsal
- **Prohibited Unsafe Verification:** deploy during audit
- **Dependencies:** CI/object storage
- **Estimated Implementation Phase:** ALC-009
- **Rollback Consideration:** retain N signed prior releases
- **Acceptance Criteria:** Cold deploy and rollback reproduce without production checkout
- **Source References:** systemd/docker/release documentation
