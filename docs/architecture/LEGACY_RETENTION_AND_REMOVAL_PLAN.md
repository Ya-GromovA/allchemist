# Legacy Retention and Removal Plan

Task: ALC-002. Every listed component is retained. Nothing is `SAFE_TO_DELETE`.

## Universal removal gate

Legacy removal requires all of:

1. replacement deployed and stable;
2. feature and data parity approved;
3. auth, RBAC, tenant, licensing, access, payment, and audit behavior verified;
4. migration and rollback rehearsed;
5. smoke/E2E and monitoring pass;
6. archive and retention complete;
7. explicit product and operations approval;
8. G10 PASS.

## Components

| Legacy component | Route/domain and consumer | Replacement target | Required parity/data/auth | Smoke and rollback | Deprecation/removal gate |
|---|---|---|---|---|---|
| `backend/app/web_public` | `allchemist.ru/` via FastAPI `/api/v1/web`; current public/cabinet users | `apps/web` | login/session, roles, cabinets, content, progress, assignments, licensing/access, error states | current artifact retained; external route and API contract E2E | deprecate after target shadow/staging; remove only G10 + product approval |
| `backend/app/web_admin` | `admin.allchemist.ru/` via `/api/v1/admin/web`; system/school administrators | `apps/admin` | every privileged workflow, scopes, tenant boundaries, audit, payments/licenses/content QA | syntax/regression repair first; retain legacy release and route rollback | deprecate only after G4/G6/G9; remove at G10 |
| live legacy nginx routing | exact public/admin roots to FastAPI; API domains to backend | approved target route map | TLS/redirects/API paths/caching/security headers and health | config backup, validation, atomic rollback, domain smoke | no change before explicit G10 cutover |
| mobile `WebFallbackShell` and old fallback screens | device users when native/remote flow falls back | approved mobile/PWA screens | offline, auth, content/progress sync, deep links, update compatibility | device matrix and version rollback | retain until supported app versions age out and product approves |
| duplicated legacy/mobile visual assets | legacy and mobile bundles | canonical asset package or per-runtime copies | pixel/content parity, provenance, packaging, offline availability | build both bundles and compare hashes/render | group-specific G1/G8 proof; no bulk deletion |
| old tools and operational scripts | operators, CI, manuals, release checks | classified toolchain/runbooks | same checks, safe outputs, no production state writes | run only in disposable environment; retain prior scripts during transition | deprecate after G2 and operations approval |
| SQL bootstrap files | installation/manual schema reference | migration revision chain and schema baseline | production schema equivalence and fresh-install behavior | isolated install/migrate/restore | archive only after G5; do not delete by default |

## Public web parity checklist

- anonymous landing and public content;
- login, invite/activation, refresh/logout/session expiry;
- student, teacher, parent, school-admin role behavior;
- tenant-scoped cabinets and progress;
- assignments/homework states;
- content/science modules and access/licensing;
- AI assistant failure/permission states;
- accessibility, responsive behavior, error/loading/empty states;
- API version and browser compatibility.

## Admin parity checklist

- current admin JavaScript parses and critical legacy workflows are characterized;
- system-admin versus school-admin scope;
- users, schools, roles/access;
- content, Content QA, media, reaction/science packs;
- analytics, audit, licenses/payments;
- export/import and destructive-action confirmations;
- negative permission and cross-tenant tests;
- durable audit evidence.

## Route migration pattern

1. Characterize legacy behavior with contract tests.
2. Implement target behind non-production access.
3. Run parity, security, visual, performance, and rollback tests.
4. Shadow or canary only with explicit authorization.
5. Switch a bounded route group, not the entire platform blindly.
6. Observe and retain instant route rollback.
7. Deprecate legacy after a defined stability window.
8. Archive before any later deletion.

Legacy is a behavioral and rollback asset, not a visual design source.
