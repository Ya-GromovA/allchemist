"""Alembic environment for the Allchemist backend.

Rules enforced here:

* The connection string comes from the application settings
  (``app.core.config.resolve_database_url``), or from ``ALEMBIC_DATABASE_URL``
  when a revision must be verified against a throwaway database. It is never
  written into ``alembic.ini`` and no secret is ever printed.
* ``--autogenerate`` is refused. The migration authority for this project is the
  real production schema, not the (deliberately incomplete) SQLAlchemy model
  layer. Revisions are authored by hand and verified by a structural schema diff
  against a restored production clone.
* The version table lives explicitly in the ``public`` schema.
* Both offline (``--sql``) and online modes are supported.
"""

from __future__ import annotations

import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# backend/ must be importable so that `app.core.config` resolves regardless of
# the working directory alembic was invoked from.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import resolve_database_url  # noqa: E402

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

VERSION_TABLE = "alembic_version"
VERSION_TABLE_SCHEMA = "public"

# Autogenerate is forbidden for this project, so there is no metadata to
# compare against. Pointing this at Base.metadata would be actively misleading:
# only one table (user_progress_server) has a declarative model, while the real
# schema has 22 tables plus functions and triggers.
target_metadata = None


def _refuse_autogenerate() -> None:
    """Hard-block `alembic revision --autogenerate`.

    Autogenerate would diff the empty model layer against production and
    propose dropping the entire database. Revisions are written by hand.
    """
    cmd_opts = getattr(config, "cmd_opts", None)
    if getattr(cmd_opts, "autogenerate", False):
        raise RuntimeError(
            "alembic --autogenerate is disabled for this project. "
            "The SQLAlchemy model layer is not the migration authority; the "
            "production schema is. Write the revision by hand and verify it "
            "with a structural schema diff against a restored production clone."
        )


def _database_url() -> str:
    """Resolve the target URL without ever placing a secret in a config file."""
    override = (os.getenv("ALEMBIC_DATABASE_URL") or "").strip()
    if override:
        return override

    url = (resolve_database_url() or "").strip()
    if not url:
        raise RuntimeError(
            "Database URL is empty. Set DATABASE_URL (or POSTGRES_*) in the "
            "backend environment, or ALEMBIC_DATABASE_URL for a throwaway "
            "verification database."
        )
    return url


def run_migrations_offline() -> None:
    """Emit SQL to stdout instead of talking to a database (`alembic --sql`)."""
    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table=VERSION_TABLE,
        version_table_schema=VERSION_TABLE_SCHEMA,
        include_schemas=False,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live connection."""
    configuration = dict(config.get_section(config.config_ini_section) or {})
    configuration["sqlalchemy.url"] = _database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                version_table=VERSION_TABLE,
                version_table_schema=VERSION_TABLE_SCHEMA,
                include_schemas=False,
                compare_type=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


_refuse_autogenerate()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
