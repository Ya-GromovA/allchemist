# Verification Strategy

## What is verified now

The current harness verifies the contract layer before any redesigned web/admin apps are created:

- TypeScript typecheck for `packages/types`.
- TypeScript typecheck for `packages/api-client`.
- Runtime API-client tests with mocked fetch through Vitest.
- Contract fixture validation for P0/P1 examples.
- Scientific guardrails for source-backed visualization contracts.
- `git diff --check` for relevant contract/docs/tool files.

Run:

```bash
node tools/verify-contract-layer.mjs
```

## What is not verified yet

- No Playwright visual tests yet, because `apps/web` and `apps/admin` do not exist.
- No mobile visual tests yet, because this task does not modify mobile behavior.
- No backend tests are included in this harness, because backend code is not changed by contract-layer work.
- No production probe is included by default; run it only for production-sensitive backend/deployment changes.

## When to add Playwright

Add Playwright visual smoke tests when a real `apps/web` or `apps/admin` shell exists. The first visual gate should check:

- app loads without blank screens;
- critical routes render;
- auth-required routes show correct unauthenticated state;
- dashboard/layout does not overlap at desktop/tablet/mobile widths;
- science visual placeholders are visible and marked as placeholders until data-backed renderers exist.

## When to add mobile visual tests

Add mobile visual checks when mobile behavior changes or when shared client/types are wired into the mobile app. Until then, mobile verification remains out of scope for this contract harness.

## Done rule for future Codex tasks

A future implementation task is not done until the relevant verification command has been run and the result is reported. UI readiness cannot be claimed without visual smoke tests once UI code exists.
