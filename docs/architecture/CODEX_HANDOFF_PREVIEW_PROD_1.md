# Codex Handoff — PREVIEW-PROD-1

## 1. Summary

Persistent production-mode preview for `apps/web` is enabled through systemd.

The preview service is private and binds to `127.0.0.1:3010`. No nginx/domain/production route switch was applied.

## 2. Diagnostics

- `pwd`: `/root/synapse`
- `node -v`: `v20.20.2`
- `npm -v`: `10.8.2`
- systemd: available
- nginx: available, config syntax OK
- port `3010`: now owned by `allchemist-web-preview.service`
- `apps/web` uses Next standalone output

## 3. Service Status

- installed: yes
- enabled: yes
- active: yes
- service file: `/etc/systemd/system/allchemist-web-preview.service`
- process binds: `127.0.0.1:3010`

## 4. Preview URLs

Server-local:

- `http://127.0.0.1:3010/design-preview/student-dashboard` — HTTP 200
- `http://127.0.0.1:3010/dashboard/student` — HTTP 200

Local browser through SSH tunnel:

- `http://127.0.0.1:3010/design-preview/student-dashboard` — HTTP 200

## 5. Nginx / Domain

Not enabled.

Prepared:

- `infra/nginx/allchemist-web-preview.conf.example`
- recommended domain: `preview.allchemist.ru`
- DNS/HTTPS/rollback plan: `docs/infra/PERSISTENT_PREVIEW_DEPLOYMENT_PLAN.md`

## 6. Commands and Results

- `npm run build:web` — PASS
- `systemctl daemon-reload` — PASS
- `systemctl enable allchemist-web-preview` — PASS
- `systemctl restart allchemist-web-preview` — PASS
- `systemctl status allchemist-web-preview --no-pager` — PASS
- `curl -I http://127.0.0.1:3010/design-preview/student-dashboard` — PASS
- `curl -I http://127.0.0.1:3010/dashboard/student` — PASS
- `ALLCHEMIST_WEB_BASE_URL=http://127.0.0.1:3010 node tools/playwright-approved-ui-smoke.mjs` — PASS

## 7. Files Changed

- `infra/systemd/allchemist-web-preview.service.example`
- `infra/nginx/allchemist-web-preview.conf.example`
- `docs/infra/PERSISTENT_PREVIEW_DEPLOYMENT_PLAN.md`
- `docs/architecture/IMPLEMENTATION_REPORT_PREVIEW_PROD_1.md`
- `docs/architecture/CODEX_HANDOFF_PREVIEW_PROD_1.md`

External installed file:

- `/etc/systemd/system/allchemist-web-preview.service`

## 8. Remaining Blockers

- Preview domain not configured.
- Nginx preview config not enabled.
- HTTPS/certbot not run.
- Main production route intentionally unchanged.

## 9. Approval Needed

Need explicit approval before applying nginx config, DNS/domain work, certbot, or public exposure.
