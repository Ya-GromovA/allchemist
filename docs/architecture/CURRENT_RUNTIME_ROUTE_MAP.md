# ALC-000 — Current Runtime and Route Map

Observed 2026-07-14 on production host `100.67.164.12`. No service was restarted and no routing configuration was changed.

## Active services and ports

| Runtime | State | Bind / port | Evidence |
|---|---|---|---|
| nginx | active/running | `0.0.0.0` and `[::]` on 80/443 | systemd and `ss -ltnp` |
| SSH | listening | 22 | `ss -ltnp` |
| `synapse-backend` | healthy, up 13 days at audit | 8000 on IPv4/IPv6 | `docker compose ps` |
| `synapse-db` PostgreSQL 16 | healthy, up 6 weeks at audit | host 5433 -> container 5432 | `docker compose ps` |
| Allchemist Next preview | systemd active/running since 2026-07-10 | loopback `127.0.0.1:3010` | systemd, process cwd, HTTP probes |

No Redis or object-storage container/service was found in compose or active Docker containers.

## Domain routing

```text
allchemist.ru / www.allchemist.ru
  HTTP 80 -> 301 HTTPS
  HTTPS exact / -> 127.0.0.1:8000/api/v1/web (legacy public static shell)
  HTTPS /api/v1/* -> 127.0.0.1:8000 (FastAPI)
  HTTPS /docs -> 127.0.0.1:8000
  HTTPS /openapi.json -> 127.0.0.1:8000
  no catch-all to Next

admin.allchemist.ru
  HTTPS exact / -> 127.0.0.1:8000/api/v1/admin/web (legacy admin static shell)
  HTTPS /api/v1/* -> 127.0.0.1:8000
  HTTPS /docs and /openapi.json -> 127.0.0.1:8000

api.allchemist.ru
  HTTP 80 -> 301 HTTPS
  HTTPS exact / -> 302 /docs
  HTTPS /* -> 127.0.0.1:8000

127.0.0.1:3010
  Next web preview only; no enabled nginx server block points to it
```

## Confirmed HTTP probes

| URL | Result | Meaning |
|---|---:|---|
| `https://allchemist.ru/` | 200 | legacy public shell active |
| `https://allchemist.ru/api/v1/health` | 200 | FastAPI healthy through nginx |
| `https://allchemist.ru/api/v1/ai-mentor/health` | 200 | AI health route responds; upstream quality was not inspected |
| `https://allchemist.ru/dashboard` | 404 | main domain is not routed to Next dashboard |
| `https://allchemist.ru/design-preview/student-dashboard` | 404 | no public design-preview route |
| `https://admin.allchemist.ru/` | 200 | legacy admin active |
| `https://admin.allchemist.ru/api/v1/health` | 200 | backend reachable from admin domain |
| `https://api.allchemist.ru/` | 302 | redirect to API docs |
| `https://preview.allchemist.ru/` | DNS resolution failed | preview hostname not confirmed |
| `http://127.0.0.1:3010/` | 200 | internal Next route responds |
| `http://127.0.0.1:3010/dashboard/student` | 200 | internal Next student dashboard responds |
| `http://127.0.0.1:3010/design-preview/student-dashboard` | 200 | internal design preview responds |
| `http://127.0.0.1:3010/modules/chemistry/lab/zinc-hcl` | 200 | internal chemistry demo responds |
| `http://127.0.0.1:3010/modules/physics` | 200 | internal physics placeholder responds |
| `http://127.0.0.1:3010/modules/biology` | 200 | internal biology placeholder responds |

Safe unauthenticated GET probes returned 401 for `/api/v1/auth/me`, teacher cabinet and admin dashboard summary, confirming an auth boundary at those endpoints. Public content QA summary and platform catalog returned 200.

## Legacy and Next route ownership

- Legacy public: exact external `/` is served from `backend/app/web_public` through FastAPI route `/api/v1/web`.
- Legacy admin: exact external admin subdomain `/` is served from `backend/app/web_admin` through `/api/v1/admin/web`.
- API: `/api/v1/*` is FastAPI in `backend/app/api/v1`.
- Next web: source routes exist under `apps/web/app`, but only loopback port 3010 serves them.
- Next admin: routes exist under `apps/admin/app`; no active service or nginx mapping was found.
- `/admin` on `allchemist.ru` returned 404; admin is a separate subdomain.
- No staging route was confirmed. `infra/nginx/allchemist-web-preview.conf.example` proposes `preview.allchemist.ru -> 127.0.0.1:3010`, but it is untracked and not enabled in `/etc/nginx/sites-enabled`.

## Configuration ownership

| Concern | Live source | Repository source |
|---|---|---|
| Public/admin/API routing | `/etc/nginx/sites-enabled/allchemist.ru.conf`, `/etc/nginx/sites-enabled/admin.allchemist.ru.conf` | no matching active production config; preview example only |
| Preview process | `/etc/systemd/system/allchemist-web-preview.service` | `infra/systemd/allchemist-web-preview.service.example` |
| Backend/Postgres | Docker runtime | `infra/docker-compose.yml`, `backend/Dockerfile` |
| FastAPI route registration | running backend image | `backend/app/main.py`, `backend/app/api/v1/routes.py` working tree |

## Restart-safety incident discovered by audit

The existing `tools/verify-ui-foundation.mjs` invokes `next build apps/web`. Audit stopped it by timeout at the build stage. Afterward:

- systemd remained active and was not restarted;
- port 3010 continued returning 200 from the already running process;
- `/proc/<pid>/cwd` resolved to `/root/synapse/apps/web/.next/standalone/apps/web (deleted)`;
- `apps/web/.next/BUILD_ID` was absent;
- only partial cache/diagnostic/type files remained in the build tree.

Therefore current preview availability is process-memory continuity, not a restartable deployment. Public legacy routes and backend remained 200. Do not restart `allchemist-web-preview.service` until an approved recovery task restores a complete artifact.

## Unknowns

- DNS and certificate ownership for a future preview hostname.
- Whether external monitoring depends on port 3010 directly.
- Exact deployed backend source-to-working-tree parity; container image was not rebuilt or diffed internally.
- Upstream AI provider readiness beyond health HTTP 200.

## Recommended next task

`ALC-001 — PREVIEW ARTIFACT RECOVERY AND REPOSITORY BASELINE STABILIZATION`. Routing changes are explicitly out of scope.
