# ALC-001 Preview Recovery Report

Date: 2026-07-14 (Europe/Moscow)

## Result

A restart-safe Next preview artifact was recovered from the isolated baseline and validated by cold start on the temporary local port 3011. It was not activated for production.

## Source and build

| Field | Value |
|---|---|
| Source branch | `baseline/allchemist-recovery-20260714-112717` |
| Source commit | `c18b3d89c38e28b47f46816326981720fb30e253` |
| Source worktree | `/root/worktrees/allchemist-recovery-20260714-112717` |
| Node | `v20.20.2` |
| npm | `10.8.2` |
| Next | `16.2.10` |
| Build command | `npm run build:web` |
| Build exit | 0 |

Typechecks for design tokens, UI, AI assistant, and web all exited 0 before build. The build compiled successfully and generated 11 static pages.

## Artifact

- Path: `/root/allchemist-runtime/preview/releases/20260714-112717`
- Size: 60 MiB
- Directory mode: `0750`
- Files: `0640`
- BUILD_ID: `foMZhxf6qk1kQrn7k-Y4I`
- Startup entry: `/root/allchemist-runtime/preview/releases/20260714-112717/apps/web/server.js`
- Static tree: `/root/allchemist-runtime/preview/releases/20260714-112717/apps/web/.next/static`
- Public tree: `/root/allchemist-runtime/preview/releases/20260714-112717/apps/web/public`
- Manifest: `/root/allchemist-runtime/preview/releases/20260714-112717/ARTIFACT_MANIFEST.md`
- SHA manifest: `/root/allchemist-runtime/preview/releases/20260714-112717/sha256sum.txt`
- Final verification: 1399/1399 files OK.

The root BUILD_ID and application BUILD_ID match. Required startup environment variable names are recorded without values: `HOSTNAME` and `PORT`. No application-specific required environment variable was found during packaging.

Expected temporary startup:

`HOSTNAME=127.0.0.1 PORT=3011 node /root/allchemist-runtime/preview/releases/20260714-112717/apps/web/server.js`

## Final cold-start smoke

Final evidence: `/root/backups/allchemist/ALC-001/20260714-112717/preview-3011-smoke-artifact-final.tsv` and `preview-3011-artifact-final.log`, both mode `0600`.

| Route | HTTP |
|---|---:|
| `/` | 200 |
| `/dashboard/student` | 200 |
| `/modules` | 200 |
| `/modules/chemistry` | 200 |
| `/modules/chemistry/lab/zinc-hcl` | 200 |
| `/modules/physics` | 200 |
| `/modules/biology` | 200 |
| `/design-preview/student-dashboard` | 200 |
| `/design-preview/platform-structure` | 200 |

Static evidence:

- referenced assets checked: 12/12 HTTP 200 and non-empty;
- JavaScript assets: 9;
- CSS assets: 3;
- missing required referenced JS/CSS: 0;
- HTTP 500 responses: 0;
- strict UTF-8 decode errors: 0;
- detected repeated mojibake sequences: 0.

The final temporary PID was `3657490`. It was terminated after testing, `/proc/3657490` no longer exists, and port 3011 is free.

## Harness history

Several earlier smoke-harness attempts failed because PowerShell-to-SSH transport altered CRLF, backslash, or Unicode regex literals. Each attempt installed a shell `trap` that stopped only its temporary PID. The retained logs show these harness failures honestly. After switching to Base64 transport, the final artifact smoke completed with all checks passing.

These failures were not application failures and did not change the artifact source, production checkout, or production services.

## Existing preview and production

- Existing preview PID before and after: `1603626`.
- Existing preview start time: 2026-07-10 01:22:38 server time.
- Existing cwd remains `/root/synapse/apps/web/.next/standalone/apps/web (deleted)`.
- Existing `http://127.0.0.1:3010/`: HTTP 200.
- Production `/root/synapse/apps/web/.next/BUILD_ID`: absent.
- Production nginx: unchanged and active.
- Docker backend/PostgreSQL: unchanged and healthy.
- `allchemist.ru/`, `admin.allchemist.ru/`, and `api.allchemist.ru/docs`: HTTP 200.

No symlink, systemd unit, nginx file, DNS record, Compose file, or active service was changed. The current preview was not restarted or stopped.

## Operational conclusion

Artifact restart readiness: **YES**.
Production preview restart readiness in its current configuration: **NO**.
Ready for preview service switch: **NO** until a separately approved task defines the service owner, environment source, rollback, port/symlink strategy, and post-switch health checks.
