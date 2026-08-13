# Database migrations (Alembic)

Migration authority for this project is the **real production schema**, not the
SQLAlchemy model layer. Only one table (`user_progress_server`) has a
declarative model; the live database has 22 tables plus 5 trigger functions and
9 triggers. Anything generated from the models would be wrong.

## Rules

1. **`--autogenerate` is blocked** in `alembic/env.py`. It raises. Do not remove
   the guard.
2. Revisions are written **by hand**.
3. No connection string in `alembic.ini`. `env.py` resolves it from
   `app.core.config.resolve_database_url()`, or from `ALEMBIC_DATABASE_URL`
   when verifying against a throwaway database.
4. The version table is `public.alembic_version`, set explicitly.
5. Every revision is verified on a **clone**, never first on production.

## Verifying a revision

Never test a revision on production first. `tools/db/verify_migration.sh` does
the whole thing against a throwaway postgres:16 container and tears it down
afterwards:

```bash
/root/synapse/tools/db/verify_migration.sh [dump_file]   # defaults to newest /root/backups dump
```

Gates, all of which must pass:

1. `alembic upgrade head` applies cleanly to an empty database.
2. `pg_dump` structural diff between a restored production clone and the
   migrated database is empty (`tools/db/schema_diff.sh`).
3. The DDL in `app/db/init_db.py` is a no-op on the migrated schema. That file
   is no longer executed at start-up (since 2026-08-13); the gate keeps proving
   that the retained code and the baseline agree.
4. `downgrade base` then `upgrade head` round-trips back to an empty diff.
5. Offline mode (`--sql`) emits a complete script.
6. `--autogenerate` is refused and writes no file.

## Talking to production

`tools/db/alembic_prod.sh <alembic args>` builds the URL from `infra/db.env`
and runs alembic against production.

`infra/db.env` is the single source of truth for `POSTGRES_*` since 2026-08-13.
The same file feeds `infra/docker-compose.yml` (`env_file`) and
`backend/app/core/config.py` (second `env_file`, so it wins over
`backend/.env`), which is why the host suite, the ops scripts and the container
now reach the same database with the same credentials. The file holds the host
view (`127.0.0.1:5433`); the container overrides only `POSTGRES_HOST` and
`POSTGRES_PORT` with `synapse-db:5432`. Neither `infra/.env` nor `backend/.env`
may redefine those keys -- `tools/stage15-production-hardening-check.sh` fails
if they do.

```bash
/root/synapse/tools/db/alembic_prod.sh current
/root/synapse/tools/db/alembic_prod.sh stamp head
```

## Baselining an existing database

`alembic stamp head` records the version without touching data or schema. Only
do this after `verify_migration.sh` passed every gate.

## Current state

- `0001_20260813_baseline_production_schema.py` — baseline transcribed from
  `pg_dump --schema-only` of production on 2026-08-13. Production was stamped
  with it on 2026-08-13 after every gate above passed, including an empty diff
  against the **live** database, not just against the dump.

`app/db/init_db.py` still creates part of the schema at runtime. Removing that
runtime DDL is a separate, separately verified step; until it is removed,
Alembic and `init_db.py` must not be allowed to disagree — which is what gate 3
checks on every run.

Note that the backend image bakes the source in (only `/app/data` is mounted),
so `backend/alembic/` reaches the container on the next image build. Until then
migrations run from the host via `tools/db/alembic_prod.sh`.

## How the schema is applied at start-up

`backend/docker-entrypoint.sh` runs `python -m app.db.migrate` before uvicorn:

* it waits for the database, then takes the PostgreSQL advisory lock
  `0x414C4348`, so two containers starting at once cannot migrate in parallel;
* it runs `alembic upgrade head` and prints the revision before and after;
* on any failure it exits non-zero, so the container stops instead of serving
  against an unmigrated database;
* every line it prints goes through `app.core.redaction`, so a connection
  failure cannot leak credentials into the container log.

`app/db/init_db.py` is retained for `backend/run_once.py` and for gate 3 of
`tools/db/verify_migration.sh`, but it is not part of the start-up path.
