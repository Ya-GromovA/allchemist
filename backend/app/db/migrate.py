"""Apply Alembic migrations at start-up -- once, under a lock, or fail loudly.

Why this module exists
----------------------
Until 2026-08-13 the FastAPI application called ``app.db.init_db.init_db()``
from a startup event: it issued ``CREATE TABLE IF NOT EXISTS`` DDL from the
serving process on every boot. The migration authority is now
``backend/alembic`` (revision 0001 is the baseline taken from the production
schema). This module is the single place where schema changes are applied, it
runs *before* uvicorn is started (see ``backend/docker-entrypoint.sh``), and it
exits non-zero on failure so the container never serves a half-migrated
database.

Concurrency: a rolling restart, a compose ``up`` racing a manual ``start``, or
two replicas can run this at the same moment. A PostgreSQL session-level
advisory lock serialises them. The loser waits, then observes an already
up-to-date database, which is a no-op.

Usage::

    python -m app.db.migrate            # upgrade to head
    python -m app.db.migrate --current  # print the applied revision only
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool

from app.core.config import resolve_database_url
from app.core.redaction import format_exception_redacted, redact_text

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ALEMBIC_INI = BACKEND_ROOT / "alembic.ini"

# Stable project-specific advisory lock key: 0x414C4348 == b"ALCH". Any process
# that migrates this database must take this exact key.
ADVISORY_LOCK_KEY = 0x414C4348

DEFAULT_CONNECT_TIMEOUT_SEC = 60.0
DEFAULT_LOCK_TIMEOUT_SEC = 300.0
_POLL_INTERVAL_SEC = 2.0


def _log(message: str) -> None:
    """Single-line progress output, always redacted before it is printed."""
    print(redact_text("[migrate] " + message), flush=True)


def database_url() -> str:
    """Resolve the target URL exactly the way ``alembic/env.py`` resolves it."""
    override = (os.getenv("ALEMBIC_DATABASE_URL") or "").strip()
    if override:
        return override
    url = (resolve_database_url() or "").strip()
    if not url:
        raise RuntimeError(
            "Database URL is empty. Set DATABASE_URL or POSTGRES_* in the backend "
            "environment."
        )
    return url


def _create_engine(url: str):
    # hide_parameters keeps bound values (and therefore anything sensitive that
    # travels as a parameter) out of SQLAlchemy error messages.
    return create_engine(url, poolclass=NullPool, hide_parameters=True, future=True)


def wait_for_database(url: str, timeout: float = DEFAULT_CONNECT_TIMEOUT_SEC) -> None:
    """Block until the database answers, or raise after ``timeout`` seconds."""
    engine = _create_engine(url)
    deadline = time.monotonic() + timeout
    attempt = 0
    try:
        while True:
            attempt += 1
            try:
                with engine.connect() as connection:
                    connection.execute(text("SELECT 1"))
                _log("database reachable (attempt %d)" % attempt)
                return
            except Exception as exc:  # noqa: BLE001 - reported, then retried
                if time.monotonic() >= deadline:
                    raise RuntimeError(
                        "database unreachable after %.0fs: %s"
                        % (timeout, redact_text(str(exc)))
                    ) from None
                _log("database not ready yet (attempt %d), retrying" % attempt)
                time.sleep(_POLL_INTERVAL_SEC)
    finally:
        engine.dispose()


def current_revision(url: str) -> str | None:
    """The revision currently stamped in the database, or ``None``."""
    engine = _create_engine(url)
    try:
        with engine.connect() as connection:
            return MigrationContext.configure(connection).get_current_revision()
    finally:
        engine.dispose()


def _alembic_config(url: str) -> Config:
    config = Config(str(ALEMBIC_INI))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    # env.py reads this first, so both this process and alembic target the same
    # database even when DATABASE_URL and POSTGRES_* disagree.
    os.environ["ALEMBIC_DATABASE_URL"] = url
    return config


def upgrade_to_head(
    url: str | None = None,
    lock_timeout: float = DEFAULT_LOCK_TIMEOUT_SEC,
    connect_timeout: float = DEFAULT_CONNECT_TIMEOUT_SEC,
) -> str | None:
    """Take the advisory lock and run ``alembic upgrade head``.

    Returns the revision the database carries afterwards.
    """
    url = url or database_url()
    wait_for_database(url, timeout=connect_timeout)

    before = current_revision(url)
    _log("revision before upgrade: %s" % (before or "<none>"))

    lock_engine = _create_engine(url)
    try:
        with lock_engine.connect() as lock_connection:
            deadline = time.monotonic() + lock_timeout
            while True:
                acquired = lock_connection.execute(
                    text("SELECT pg_try_advisory_lock(:key)"),
                    {"key": ADVISORY_LOCK_KEY},
                ).scalar()
                if acquired:
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError(
                        "another process has held the migration advisory lock for "
                        "more than %.0fs; refusing to start" % lock_timeout
                    )
                _log("migration lock held by another process, waiting")
                time.sleep(_POLL_INTERVAL_SEC)

            _log("migration lock acquired")
            try:
                command.upgrade(_alembic_config(url), "head")
            finally:
                lock_connection.execute(
                    text("SELECT pg_advisory_unlock(:key)"),
                    {"key": ADVISORY_LOCK_KEY},
                )
                _log("migration lock released")
    finally:
        lock_engine.dispose()

    after = current_revision(url)
    _log("revision after upgrade: %s" % (after or "<none>"))
    if after is None:
        raise RuntimeError("alembic upgrade head left the database without a revision")
    return after


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Apply Alembic migrations.")
    parser.add_argument(
        "--current",
        action="store_true",
        help="print the applied revision and exit without migrating",
    )
    parser.add_argument(
        "--lock-timeout",
        type=float,
        default=DEFAULT_LOCK_TIMEOUT_SEC,
        help="seconds to wait for the migration advisory lock",
    )
    parser.add_argument(
        "--connect-timeout",
        type=float,
        default=DEFAULT_CONNECT_TIMEOUT_SEC,
        help="seconds to wait for the database to accept connections",
    )
    args = parser.parse_args(argv)

    try:
        url = database_url()
        if args.current:
            wait_for_database(url, timeout=args.connect_timeout)
            _log("current revision: %s" % (current_revision(url) or "<none>"))
            return 0
        upgrade_to_head(
            url,
            lock_timeout=args.lock_timeout,
            connect_timeout=args.connect_timeout,
        )
    except BaseException:  # noqa: BLE001 - the whole point is to report and fail
        sys.stderr.write(format_exception_redacted(*sys.exc_info()))
        sys.stderr.write("[migrate] FAILED: database schema was not brought to head\n")
        sys.stderr.flush()
        return 1
    _log("schema is at head")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
