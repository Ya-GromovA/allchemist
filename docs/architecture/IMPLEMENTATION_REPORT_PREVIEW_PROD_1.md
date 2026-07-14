# Implementation Report — PREVIEW-PROD-1

## Summary

Persistent production-mode preview for `apps/web` was enabled as a dedicated systemd service on the production server.

The service is private by default: it binds to `127.0.0.1:3010` and does not modify nginx or primary production routes.

No commit, no `git add`, no `git reset`, no `git clean`.

## Diagnostics

- Project path: `/root/synapse`
- Node.js: `v20.20.2`
- npm: `10.8.2`
- systemd: available, version `249`
- nginx: available, version `1.18.0`
- nginx config test: PASS
- Existing preview process before service: manual `next-server` on `*:3010`
- Service before work: not installed
- `apps/web/next.config.mjs`: `output: "standalone"`

Root package scripts include:

- `build:web`: `next build apps/web`
- `typecheck:web`: `tsc -p apps/web/tsconfig.json --pretty false`

`apps/web/package.json` has `start: next start`, but the persistent service uses the standalone server because the app is configured with `output: "standalone"`.

## Service

Installed:

`/etc/systemd/system/allchemist-web-preview.service`

Repository example:

`infra/systemd/allchemist-web-preview.service.example`

Final service behavior:

- `WorkingDirectory=/root/synapse`
- `PORT=3010`
- `HOSTNAME=127.0.0.1`
- `ExecStart=/usr/bin/node /root/synapse/apps/web/.next/standalone/apps/web/server.js`
- `Restart=always`
- `enabled`
- `active`

Because Next standalone output requires static/public assets near the standalone server, the service copies:

- `apps/web/public` -> `apps/web/.next/standalone/apps/web/public`
- `apps/web/.next/static` -> `apps/web/.next/standalone/apps/web/.next/static`

before start.

## Nginx / Domain

Nginx was not changed or reloaded.

Prepared only:

- `infra/nginx/allchemist-web-preview.conf.example`
- recommended preview domain: `preview.allchemist.ru`
- DNS, HTTPS, and rollback instructions in `docs/infra/PERSISTENT_PREVIEW_DEPLOYMENT_PLAN.md`

## Checks

- `npm run build:web` — PASS
- `systemctl daemon-reload` — PASS
- `systemctl enable allchemist-web-preview` — PASS
- `systemctl restart allchemist-web-preview` — PASS
- `systemctl status allchemist-web-preview --no-pager` — PASS, active/running
- `curl -I http://127.0.0.1:3010/design-preview/student-dashboard` — PASS, HTTP 200
- `curl -I http://127.0.0.1:3010/dashboard/student` — PASS, HTTP 200
- `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` — PASS

Local Windows tunnel:

- `http://127.0.0.1:3010/design-preview/student-dashboard` — PASS, HTTP 200 after service start.

## Files Changed

- `infra/systemd/allchemist-web-preview.service.example`
- `infra/nginx/allchemist-web-preview.conf.example`
- `docs/infra/PERSISTENT_PREVIEW_DEPLOYMENT_PLAN.md`
- `docs/architecture/IMPLEMENTATION_REPORT_PREVIEW_PROD_1.md`
- `docs/architecture/CODEX_HANDOFF_PREVIEW_PROD_1.md`

External server file installed:

- `/etc/systemd/system/allchemist-web-preview.service`

## Remaining Blockers

- Preview domain is not enabled yet.
- DNS A record for `preview.allchemist.ru` is not configured here.
- HTTPS/certbot not run.
- Nginx reverse proxy not enabled pending explicit approval.

## Approval Needed

Separate approval is needed before:

- enabling nginx config;
- adding/using `preview.allchemist.ru`;
- running certbot;
- exposing preview publicly.
