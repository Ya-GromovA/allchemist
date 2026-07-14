# File Ownership and Boundaries

Task: ALC-002. Owners are required workstreams; named people are not inferred.

## Ownership lanes

| Lane | Owned paths | Owns | Must not own/change alone | Required review |
|---|---|---|---|---|
| Repository governance | root manifests, `.gitignore`, worktree/release policy | tracking, branch and generated-output rules | product behavior or production runtime | all affected lanes |
| Backend/API | `backend/app`, `backend/tests`, `backend/sql` | API, services, schemas, backend tests | live DB, auth/RBAC policy unilaterally | security/data/product |
| Legacy public/admin | `backend/app/web_public`, `web_admin` | current behavior and rollback artifact | target visual language or route switch | product/QA/operations |
| Web | `apps/web` | public/student/teacher target presentation and adapters | backend storage, admin privileges, legacy deletion | design/API/security |
| Admin | `apps/admin` | privileged target presentation/workflows | RBAC rules or direct DB | security/backend/product |
| Shared contracts | `packages/types`, `api-client` | typed DTO/API boundaries and contract tests | app visuals or backend persistence | backend and all consumers |
| UI/design tokens | `packages/ui`, `design-tokens` | primitives/tokens/accessibility | subject facts, API calls, role decisions | design/accessibility |
| AI assistant | `packages/ai-assistant`, backend AI boundary | assistant states/orchestration contract | direct publication of unreviewed content | security/content QA |
| Content | `content`, `content-core`, `content-qa-core` | content model, provenance, QA states | bypass publication gate | scientific QA/backend |
| Science | science/chemistry/physics/biology engine packages | deterministic subject contracts/engines | UI navigation, auth, unsupported facts | scientific reviewer/content QA |
| Progress/assignments | `progress-core`, cabinet/task contracts | progress/assignment domain contracts | tenant/RBAC bypass | backend/product/security |
| Mobile | `mobile` | device UI, offline store/sync, notifications | server source of truth or provider secrets | backend/security/release |
| Infrastructure | `infra`, deployment templates, live ops | desired state, services, release activation | product source or direct unreviewed config apply | operations/security |
| Quality/tooling | `tools`, CI workflows, test artifact policy | checks, builds, tests, evidence | production state through ambiguous commands | affected lane/release |
| Documentation/design provenance | `docs`, approved-reference manifest | decisions, audit evidence, source hashes | secret/runtime payloads | relevant owner |

## Boundary rules

1. Production `/root/synapse` remains an evidence/runtime checkout, not a development worktree.
2. Every implementation task owns an explicit path list and TASK-ID.
3. Cross-lane changes require both owners; auth, RBAC, tenant, payment, and publication boundaries require security/product approval.
4. Runtime state, secrets, logs, backups, and generated output have no source-code owner and must live outside Git.
5. Legacy owners protect current behavior; target owners cannot remove legacy.
6. Infrastructure templates are source, but applying them is a separate operations action.
7. Approved references require design/product provenance; generated screenshots belong to quality tooling.
8. Science data/contracts require scientific review and cannot be replaced by visual approximation.

## Sensitive boundaries

| Boundary | Allowed direction | Prohibited |
|---|---|---|
| App to backend | typed HTTP/API contract | filesystem/DB access from web/admin/mobile |
| UI to domain | render typed view model | domain writes or permission decisions in UI |
| Content to publication | draft → QA → approved backend transition | direct AI/tool publish |
| Tenant data | request identity → policy → scoped query | trusting client-supplied school scope |
| Secrets | runtime secret provider → process memory | Git, build artifact, logs, screenshots |
| Runtime state | service → approved store | mutable JSON in source tree |
| Release | clean commit → CI artifact → ops activation | build in production checkout |

## Change approval matrix

| Change | Minimum owners | Required gate |
|---|---|---|
| Git normalization | repository + affected lane | G1 |
| Tool/CI command | quality + affected lane | G2 |
| Preview service | operations + release | G3 |
| Legacy admin repair | legacy/backend + QA | G4 |
| Schema/runtime data | database + backend + security | G5 |
| Auth/RBAC/tenant/secrets | security + backend + product | G6 |
| Bounded context/dependency rule | architecture + all consumers | G7 |
| Approved reference/asset | design + product + provenance owner | G8 |
| Feature implementation | product lane + QA/security as applicable | G9 |
| Production route/legacy removal | operations + product + security + QA | G10 |

## Worktree policy

- One implementation TASK-ID per worktree.
- Documentation-only ALC-002 remains on the baseline branch.
- Feature worktrees start only after ALC-003 publishes an approved baseline.
- Release verification runs in a clean disposable checkout.
- Staging uses explicit pathspecs; wholesale add/reset/clean is forbidden for production-sensitive work.

## ALC-003 ownership update

- Repository governance owns `.gitignore`, `.gitattributes`, `.editorconfig`, and the read-only hygiene check contract.
- Quality/tooling owns future CI integration of `check:repository-hygiene`; ALC-006 must keep it independent from build, browser, server, deploy, database and infrastructure actions.
- Backend/data/security/operations jointly own the unresolved mutable-state consumers. ALC-003 does not select `ALLCHEMIST_RUNTIME_ROOT` or any competing environment name.
- Design/content/mobile/legacy owners retain their duplicate copies until the group-specific follow-up proves canonical consumer, packaging, provenance and rollback.
- CODEOWNERS remains a proposal because named people/teams are still not approved.
