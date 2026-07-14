# ALC-000 — Worktree and File Ownership Proposal

This is a proposal only. No worktree, branch, commit, reset, clean, add or push operation was performed.

## Confirmed baseline problem

- Only one worktree exists: `/root/synapse`.
- Production checkout is dirty: initially 34 modified tracked files and 2092 expanded untracked files.
- Feature branch, `main` and local `origin/main` refs have no commit divergence.
- Target `apps/`, `packages/`, approved design manifest and infra preview examples are untracked.
- Ownership/intent of existing dirty files is unknown.
- The running preview currently depends on an already-started process whose build cwd has been deleted; it is not restart-safe.

The production checkout must not be used as a general development worktree.

## Proposed sequence for ALC-001

1. Obtain explicit recovery authorization and restore a complete, restartable `apps/web/.next` artifact without changing public routing.
2. Capture an owner-approved inventory of every pre-existing modified/untracked path; do not use `git add .` or `git add -A`.
3. Decide which current files are product source, generated artifacts, runtime state, backups or disposable build output. This decision must be made by owners; ALC-000 does not infer deletion permission.
4. Create a separate clean architecture-planning worktree from an explicitly chosen commit only after the production baseline is preserved.
5. Keep production checkout read-only for normal development; promotion should use an approved release workflow, not direct edits.

## Proposed worktree model

| Worktree | Purpose | Mutation policy |
|---|---|---|
| `/root/synapse` | production/runtime checkout and evidence source | no development; docs/read-only audit only unless incident recovery explicitly approved |
| separate architecture worktree | ADRs, route migration plan, contract gap planning | docs and contract planning; no deploy |
| separate feature worktrees | scoped implementation tasks after approval | one TASK-ID and ownership lane per worktree |
| release candidate worktree/CI workspace | reproducible verification/build | generated artifacts owned by release workflow, never by production audit |

No concrete directory was created. A path such as `/root/worktrees/alc-001-baseline` is only a naming example and requires approval.

## Proposed ownership lanes

| Lane | Owned paths | Required reviewers / constraints |
|---|---|---|
| Backend/API | `backend/app`, `backend/tests`, `backend/sql` | auth/roles/access/payment and DB contract review |
| Public Next web | `apps/web`, relevant `packages/ui`, design tokens/assets | approved-reference and visual QA gate; no route switch |
| Admin Next | `apps/admin`, admin API client/types | system-admin/school-admin permission review |
| Shared contracts | `packages/types`, `packages/api-client` | backend parity tests and versioned contract decision |
| Science engines | science/chemistry/physics/biology packages | source-backed scientific review and Content QA |
| Content | `content`, content packages, content QA | source provenance and publication gate |
| Mobile | `mobile` | mobile design lock, device migration and release ownership |
| Infrastructure | `infra`, live nginx/systemd/compose | operations owner; explicit production approval mandatory |
| Quality/tooling | `tools`, `.github/workflows`, `artifacts` | commands classified by side effects; generated artifact policy |
| Documentation | `docs/architecture`, `docs/quality`, other docs | TASK-ID and evidence links; no secrets |

## File-class rules

### Source files

Must be individually attributed and staged by explicit path. No wholesale add. Existing dirty source remains untouched until ownership is resolved.

### Runtime state

`backend/data/**`, security status/history JSON and `user_state.json` are runtime-sensitive. They must not be treated as ordinary source or copied into a new worktree without a data-handling decision.

### Generated build artifacts

`.next`, Android build output, caches, screenshots and visual diffs must have an explicit generation/retention policy. The ALC-000 incident proves that `verify-ui-foundation.mjs` is not read-only because it invokes builds.

### Approved references

Canonical golden files belong under the manifest-declared `apps/web/public/design-preview/<id>/` paths. Their hashes and provenance should be reviewed independently from generated screenshots under `artifacts/`.

### Secrets and environment

`.env`, `secrets/`, credentials, signing material and token-bearing configs remain outside audit output, staging and reports.

## Merge and promotion gates proposed

- Clean task worktree and explicit file list.
- Contract verification and no-emission typecheck.
- Focused unit/integration tests in isolated test data, never production state.
- Build in CI or release workspace, not the running production checkout.
- Approved visual references present for the scoped screen.
- Playwright artifacts written only to an owned disposable directory.
- Explicit operations approval for nginx/systemd/compose or route changes.
- Rollback artifact and restart-safety proof before promotion.

## Current blockers

- Unattributed dirty production checkout.
- Target source mostly untracked.
- Preview build artifact incomplete and running cwd deleted.
- Missing golden references and incomplete target screens.
- Existing verification scripts are not classified reliably by side effect.

## Recommended next task

`ALC-001 — PREVIEW ARTIFACT RECOVERY AND REPOSITORY BASELINE STABILIZATION`.

Deliverables should be a restart-safe preview, owner-approved baseline manifest, isolated worktree plan and command side-effect classification. No migration or screen development.
