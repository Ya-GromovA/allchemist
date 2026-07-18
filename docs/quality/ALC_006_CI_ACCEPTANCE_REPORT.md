# ALC-006 CI Acceptance Report

## Workflow contract

`.github/workflows/ci.yml` triggers only on `pull_request` and `workflow_dispatch`, grants `contents: read`, uses Node 20 and locked installs with `npm ci --ignore-scripts --no-audit --no-fund`, and has no deploy job or production credentials.

The ten jobs are:

1. repository-hygiene;
2. secret-pattern-scan;
3. design-tokens-typecheck;
4. ui-typecheck;
5. ai-assistant-typecheck;
6. web-typecheck;
7. safe-unit-tests;
8. explicit-isolated-web-build;
9. generated-artifact-verification;
10. utf8-cyrillic-regression-check.

Generated-artifact verification accepts only the artifact uploaded by the explicit build job and requires both `apps/web/.next/BUILD_ID` and `apps/web/.next/standalone/apps/web/server.js`. It also rejects tracked build output.

The UTF-8 gate records one inherited replacement character in `tools/playwright-approved-ui-smoke.mjs` as an exact baseline because visual tooling is outside ALC-006 scope. Any new file, invalid UTF-8 sequence, or count other than exactly one fails the gate.

## Acceptance evidence

Isolated-worktree validation passed: locked install added 91 packages; repository hygiene, secret scan, JSON parsing, `git diff --check`, four required typechecks, 32 safe unit tests, explicit web build, generated-output verification, standalone `BUILD_ID` and server-entry assertions all passed. The clean-checkout reproduction is recorded in the handoff report. Required invariants are: unchanged lockfile, no tracked generated output, ignored build output removed before final clean-status assertion, and no contact with production services or database.
