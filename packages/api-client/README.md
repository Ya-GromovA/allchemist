# @allchemist/api-client

Framework-agnostic typed API client for current Allchemist backend contracts.

The package does not depend on React, Next.js, Expo or browser globals. It requires an injected `fetch` implementation and imports DTOs from `packages/types`.

## Initialization

```ts
import { createAllchemistApiClient } from "@allchemist/api-client";

const client = createAllchemistApiClient({
  baseUrl: "https://api.allchemist.ru/api/v1",
  fetch: globalThis.fetch,
  getAuthToken: () => tokenStore.accessToken,
  refreshSession: async () => refreshTokenStore(),
});
```

## Auth example

```ts
const session = await client.auth.login({ login: "teacher@example.test", password: "secret" });
const me = await client.auth.me();
```

## Admin dashboard example

```ts
const summary = await client.admin.getDashboardSummary();
```

## Chemistry example

```ts
const reactions = await client.chemistry.listReactions(100);
```

## Rules for adding API methods

- Add methods only for real backend endpoints.
- Do not invent future target routes as active methods.
- Keep destructive operations out of tests and use mocked fetch only.
- Preserve legacy auth refresh and error behavior.
- Use DTOs from `packages/types`.
- Use `Record<string, unknown>` for raw dict endpoints until backend response models exist.
- Document unstable response shapes in `docs/contracts/api-client-layer.md`.
