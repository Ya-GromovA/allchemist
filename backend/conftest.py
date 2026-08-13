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
