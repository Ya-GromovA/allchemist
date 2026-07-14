# ALC-003 Runtime Separation Report

## Safety statement

No runtime JSON, security state, user data, credential, database payload or environment value was printed, copied, moved, deleted or modified. Inspection was limited to tracked source code, path names, Git attribution and configuration names.

## Confirmed mutable-state consumers

| State/path | Confirmed source consumers | Current path behavior | ALC-003 disposition |
|---|---|---|---|
| `backend/data/user_state.json` | `backend/app/services/user_state_store.py`; `admin_panel_service.py`; API endpoints/tests | source-relative `backend/data` | untracked/ignored; consumer migration blocked ALC-007/008 |
| `backend/data/security/alerts_ack.json` | `admin_panel_service.py`; admin API/tests | source-relative `_DATA_ROOT/security` | untracked/ignored; security/audit store decision required |
| backup dry-run status/history | `admin_panel_service.py`; admin security endpoints/tests | source-relative security JSON | preserve; G5 operations/data migration required |
| go/no-go history | `admin_panel_service.py`; admin endpoints/export | source-relative security JSON; writer records snapshots | preserve; append-only/audit semantics require G6 decision |
| handover archive | `admin_panel_service.py`; admin endpoints/CSV export/tests | source-relative security JSON | preserve; restricted archive/retention decision required |
| mobile onboarding smoke status | `admin_panel_service.py`; admin endpoint/tests | source-relative security JSON | preserve; CI/runtime status ownership required |
| `content_packs/allchemist-apk-latest.json` | `content_readonly.py`; `admin_panel_service.py`; readiness/release tools/tests | `CONTENT_PACKS_DIR` in some consumers plus `/root/synapse/content_packs` fallbacks | ignored mutable pointer; object/runtime-store ADR required |
| `synapse.db`/content DB fallback | `admin_panel_service.py` | `SYNAPSE_CONTENT_DB` with `/root/synapse/synapse.db` fallback | untracked DB class; ALC-008 migration/test boundary |
| other `/root/synapse` operational paths | admin service and operations tools | hard-coded mobile, workflow, script, docs and content locations | no change; ALC-007 ownership/desired-state audit |

## Git representation

- Tracked runtime/user/security files removed by ALC-003: **0**. The recovered baseline had already excluded them.
- Current tracked violations for runtime-state patterns: **0**.
- `.gitignore` explicitly covers `backend/data/`, `backend/data_host_backup/`, the mutable APK pointer, DB files/dumps, secrets and logs.
- Test fixture or example files created: **0**. Inventing a schema/template without approved semantics would risk encoding production behavior incorrectly.

## Why no runtime source refactor was made

ALC-002 did not define a canonical environment variable. The consumers span user state, privileged security acknowledgement, audit/history, backup/restore, release decisions and production-only operational paths. A single provisional path substitution would not prove atomicity, concurrency, permissions, retention, restore or tenant/security behavior. It would also create an unapproved competing contract.

Accordingly:

- no `ALLCHEMIST_RUNTIME_ROOT` or alternative name was introduced;
- no default was silently switched to `/var/lib/allchemist`;
- no test was pointed at production or source-tree state;
- no state file was removed or converted to an example;
- no claim of complete runtime separation is made.

## Closing follow-ups

- `ALC-007-RUNTIME-01`: approve one runtime-root/config contract, store ownership, ACL, retention and observability boundaries.
- `ALC-007-SECURITY-02`: decide append-only handling for acknowledgements, go/no-go and handover/audit records.
- `ALC-007-RELEASE-03`: decide versioned storage/current-pointer semantics for APK metadata.
- `ALC-008-DATA-01`: create isolated state/DB fixtures, forward migration, rollback and restore proof before consumer changes.
- `ALC-008-TEST-02`: guard backend tests with temporary runtime directories and an isolated database.

Status: **PARTIAL**. Source contamination is prevented at Git/ignore level, while runtime consumer migration remains explicitly blocked by G5/G6.
