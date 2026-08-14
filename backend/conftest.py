"""Test-suite wide configuration for the Allchemist backend.

Its only job is specification §11 hygiene: a failing test must not write a
secret into the test log. pytest renders the arguments of every frame in a
traceback, and libraries such as psycopg take the whole connection string --
password included -- as a plain argument. The report text is therefore passed
through :func:`app.core.redaction.redact_text` before pytest prints or stores
it.

The redaction rule itself lives in the application, not here, so the same rule
protects production logs, the migration runner and the test suite.
"""

from __future__ import annotations

import os
from urllib.parse import urlsplit

import pytest

from app.core.redaction import install_redaction, redact_text

install_redaction()


def _redact_report(report) -> None:
    if getattr(report, "longrepr", None) is not None:
        report.longrepr = redact_text(str(report.longrepr))
    sections = getattr(report, "sections", None)
    if sections:
        report.sections = [(name, redact_text(str(content))) for name, content in sections]


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item, call):
    report = yield
    _redact_report(report)
    return report


@pytest.hookimpl(wrapper=True)
def pytest_collectreport(report):
    result = yield
    _redact_report(report)
    return result


# --------------------------------------------------------------------------- #
# Isolation: the suite must never touch production
# --------------------------------------------------------------------------- #
#
# Two things used to make a test run a production write:
#
#   * DATABASE_URL resolved to 127.0.0.1:5433/synapse, the live database;
#   * app/services/legacy_state_bridge.STATE_PATH pointed at
#     backend/data/user_state.json, the live state file -- which is why that
#     file shows up modified in `git status` after every run.
#
# While identity lived in a JSON file that nobody trusted this was merely ugly.
# Now that registration creates real rows, it would create real accounts. The
# fixtures below fail the run rather than let that happen, and redirect the
# state file to a temporary copy.


def _resolved_database_url() -> str:
    from app.core.config import resolve_database_url

    return resolve_database_url()


def pytest_configure(config) -> None:
    """Refuse to start against the production database."""
    if os.environ.get("ALLCHEMIST_ALLOW_PROD_DB") == "1":
        return

    url = _resolved_database_url()
    parsed = urlsplit(url)
    database = (parsed.path or "").lstrip("/")
    port = parsed.port

    looks_like_production = database == "synapse" and port in (5432, 5433, None)
    if looks_like_production:
        raise pytest.UsageError(
            "Тесты запущены на боевой базе данных. Поднимите изолированную: "
            "tools/db/test_db.sh run .venv-test/bin/python -m pytest"
        )


@pytest.fixture(autouse=True, scope="session")
def _isolate_legacy_state_file(tmp_path_factory):
    """Point the legacy state file at a temporary copy for the whole run."""
    from app.services import legacy_state_bridge

    production_path = legacy_state_bridge.STATE_PATH
    sandbox = tmp_path_factory.mktemp("user_state") / "user_state.json"
    if production_path.exists():
        # Copied, not shared: the tests need the school and content seed that
        # lives in the file, and must not be able to write any of it back.
        sandbox.write_text(production_path.read_text(encoding="utf-8"), encoding="utf-8")

    legacy_state_bridge.STATE_PATH = sandbox
    try:
        yield sandbox
    finally:
        legacy_state_bridge.STATE_PATH = production_path


@pytest.fixture(autouse=True)
def _reset_authentication_throttling():
    """Give every test its own rate-limit window.

    The limiter used to live in the JSON state file, which the tests rewrote
    wholesale, so it never actually accumulated between them. Now it is three
    real tables and it does -- correctly. That makes the tenth login of a suite
    run fail with "Too many OTP requests", which says nothing about the code
    under test.

    TRUNCATE rather than DELETE on purpose: ``auth_attempt_events`` refuses
    DELETE at the database level, and the fact that this fixture has to reach
    for TRUNCATE is itself a demonstration that the append-only guarantee holds.
    """
    from sqlalchemy import text

    from app.db.session import engine

    with engine.begin() as connection:
        connection.execute(
            text("TRUNCATE auth_attempt_events, auth_lockouts, otp_challenges")
        )
    yield
