# Current Quality Gates

## Contract layer gate

Command:

```bash
node tools/verify-contract-layer.mjs
```

This gate must pass after changes to:

- `packages/types`;
- `packages/api-client`;
- contract fixtures;
- contract docs;
- verification scripts.

## API-client runtime tests

Vitest runs mocked-fetch tests only. These tests cover:

- base request success;
- JSON parsing;
- empty response handling;
- auth header injection;
- token refresh retry path;
- error mapping for 401, 403, 404 and 500;
- access helper behavior;
- Content QA fixture parsing;
- chemistry molecule/reaction fixture parsing;
- contract fixture validation;
- scientific visualization guardrails.

## Scientific guardrails

The current guardrails assert:

- unverified chemistry reactions are not publishable visualizations;
- solution color metadata must be source-aware or explicitly unverified;
- precipitate, gas and pH metadata must be verification-aware;
- odor is text/safety metadata only, never a visual effect;
- AI-generated content is not publishable without Content QA status;
- physics and biology visual endpoints remain marked as future-required until backend endpoints exist.

## Future gates

When `apps/web` or `apps/admin` exists, add:

- route smoke tests;
- Playwright visual smoke tests;
- responsive overlap checks;
- API-client mocked/fake-server integration tests;
- accessibility checks for primary flows.

When mobile behavior changes, add:

- Expo/mobile smoke checks;
- offline/sync tests;
- weak-device and heavy-renderer fallback checks.
