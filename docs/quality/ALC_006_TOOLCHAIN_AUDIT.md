# ALC-006 Toolchain Audit

## Scope and preflight

- Base commit: `32aef1ecc8f49cc21436954cbd479205450fa1bc`.
- Isolated branch/worktree: `chore/alc-006-safe-toolchain-ci-20260719-000333`, `/root/worktrees/allchemist-safe-toolchain-ci-20260719-000333`.
- Production checkout was inspected read-only and was not used as a working directory.
- Static inventory: 40 npm scripts, 23 top-level JavaScript/shell tools, and 2 pre-existing workflow files; 65 command entry points total.
- Runtime baseline: nginx master PID `2163555`; preview 3011 PID `1273962`; legacy 3010 PID `1603626`; PostgreSQL accepted connections. No service or database mutation was authorized or performed.

## Finding and remediation

`tools/verify-ui-foundation.mjs` was misleadingly named: it invoked two Next builds, Playwright, and snapshot generation. It is now a read-only verifier. Builds remain available only under explicit `build:*` commands. Visual, integration, snapshot, release and deployment commands remain separate and are excluded from safe CI.

The nested `verify-contract-layer.mjs` also runs api-client tests and depends on `mobile/node_modules`; it is therefore not part of the read-only wrapper. Its history is retained and it is classified as an isolated-test command, while CI uses the explicit root safe-unit-test command.

The former `ci.yml` ran backend tests with PostgreSQL and ran operational shell syntax checks. It has been replaced by a pull-request/manual-only quality workflow with read-only permissions and no credentials, backend, database, migration, service, deployment, or production-host access.

## Static-analysis method

Every `scripts` value in every tracked `package.json`, each top-level `tools/*.{mjs,js,sh}`, and each workflow was read. Imports, child-process calls, filesystem writes/deletes, network calls, environment/secrets, build/deploy/migration references, browser/runtime use, and CI context were inspected. UNKNOWN entries were not executed.

Backend tests are explicitly deferred to the future ALC-008 isolated-test-environment gate.
