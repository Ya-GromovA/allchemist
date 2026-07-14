# @allchemist/types

Contract-first TypeScript DTOs for Allchemist.

This package describes existing backend contracts and future-required product contracts without changing backend behavior or production routes. It is intentionally dependency-free.

## Import examples

```ts
import type { AuthContext, ContentQaBlock, Reaction } from "@allchemist/types";
```

Until workspace aliases are introduced, import by relative path from experiments or future packages.

## Rules for adding types

- Keep DTOs serializable and API-oriented.
- Do not add runtime logic here.
- Prefer current backend field names when a backend contract already exists.
- Mark missing backend fields as optional and add `TODO: future-required`.
- Do not claim a field is implemented unless it exists in current backend contracts.
- Chemistry, Physics and Biology must stay first-class.
- Shared types must not assume chemistry-only behavior.

## Scientific rule

No science data without source and verification metadata. Visual effects such as real solution colors, precipitates, gases, pH, heating/cooling and biology/physics observations must be source-backed before they are rendered as factual learning content.

Odor is text/safety metadata only; it must not become a fake visual effect.
