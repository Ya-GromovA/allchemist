"""Redaction of sensitive configuration values in diagnostic output.

Specification §11 requires that secrets never reach logs or artifacts. Two
independent leaks are closed here:

1. **Tracebacks.** psycopg receives the connection string as a plain function
   argument, so any framework that renders frame arguments (pytest does this by
   default) prints ``password=<real value>`` into the test log. The same is true
   for every other library that takes a credential as an argument.
2. **Application logs.** A formatted message may embed a token, a DSN or an API
   key that came from configuration.

The mechanism is deliberately generic: it works for *any* configuration key
whose name looks sensitive, and additionally for any ``key=value`` /
``key: value`` pair in free text whose key looks sensitive, even when that value
is not present in the environment at all (a mistyped password, for example).

Public API:

* :func:`redact_text` -- redact a string.
* :func:`sensitive_env_keys` -- the configuration keys currently considered
  sensitive (names only, never values).
* :func:`install_redaction` -- install the logging and traceback hooks. Called
  once from :mod:`app.core.config`, which every entry point imports.
"""

from __future__ import annotations

import logging
import os
import re
import sys
import threading
import traceback
from typing import Any, Iterable

REDACTED = "<redacted>"

# A configuration key is sensitive when its NAME matches this pattern. Keeping
# the rule on the name (not on a hand-maintained list of keys) is what makes the
# mechanism general: a new secret added to Settings or to the environment is
# covered the moment it is named like a secret.
SENSITIVE_KEY_PATTERN = re.compile(
    r"(?:^|_)(?:"
    r"password|passwd|pwd|secret|token|api_?key|apikey|access_?key|private_?key|"
    r"credential|credentials|signature|salt|dsn|authorization|cookie|session_?key|"
    r"service_account_json|p8"
    r")(?:_|$)",
    re.IGNORECASE,
)

# Shell variables whose NAME matches the pattern but which never hold a secret.
# PWD/OLDPWD are the working directory: without this exclusion every file path
# in a traceback would be rewritten to "<redacted>/app/...".
_NEVER_SENSITIVE_KEYS = frozenset({"PWD", "OLDPWD"})

# Values shorter than this are not substituted: they are too likely to be a
# common substring ("dev", "1") and redacting them would corrupt the message
# without protecting anything.
_MIN_VALUE_LENGTH = 4


def _is_sensitive_key(key: str) -> bool:
    return key not in _NEVER_SENSITIVE_KEYS and bool(SENSITIVE_KEY_PATTERN.search(key))

# `secret=value`, `password: value`, `api_key="value"`, `'password': 'value'` in
# free text -- this is what catches a credential that is not in the environment
# at all, e.g. a mistyped one typed straight into a call.
_KEY_VALUE_PATTERN = re.compile(
    r"(?P<key>[A-Za-z0-9_.\-]*"
    r"(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|credential|signature|salt|dsn)"
    r"[A-Za-z0-9_.\-]*)"
    r"(?P<sep>[\"']?\s*[=:]\s*)"
    r"(?P<quote>[\"']?)"
    r"(?P<value>[^\s\"',;)&]+)",
    re.IGNORECASE,
)

# `scheme://user:password@host`
_URL_CREDENTIALS_PATTERN = re.compile(
    r"(?P<prefix>[A-Za-z][A-Za-z0-9+.\-]*://[^\s:/@]+:)(?P<value>[^\s/@]+)(?P<at>@)"
)

_install_lock = threading.Lock()
_installed = False


def _settings_items() -> Iterable[tuple[str, Any]]:
    """Configuration key/value pairs, without importing config at module import.

    ``app.core.config`` installs this module, so the import must stay lazy.
    """
    try:
        from app.core.config import settings  # local import on purpose
    except Exception:  # pragma: no cover - configuration itself is broken
        return ()
    try:
        return list(settings.model_dump().items())
    except Exception:  # pragma: no cover - pydantic v1 fallback
        return list(getattr(settings, "__dict__", {}).items())


def sensitive_env_keys() -> list[str]:
    """Names (never values) of the configuration keys treated as sensitive."""
    keys = {key for key in os.environ if _is_sensitive_key(key)}
    keys.update(key for key, _ in _settings_items() if _is_sensitive_key(key))
    return sorted(keys)


def _sensitive_values() -> list[str]:
    """Current values of all sensitive configuration keys, longest first.

    Recomputed on every call: the environment is mutated by tests and by
    one-off commands, and a stale cache would silently stop redacting.
    """
    values: set[str] = set()
    for key, value in os.environ.items():
        if _is_sensitive_key(key) and isinstance(value, str):
            values.add(value)
    for key, value in _settings_items():
        if _is_sensitive_key(key) and isinstance(value, str):
            values.add(value)
    return sorted(
        (value for value in values if len(value.strip()) >= _MIN_VALUE_LENGTH),
        key=len,
        reverse=True,
    )


def redact_text(text: str) -> str:
    """Replace every sensitive value in ``text`` with ``<redacted>``."""
    if not text:
        return text

    result = text
    for value in _sensitive_values():
        if value in result:
            result = result.replace(value, REDACTED)

    result = _KEY_VALUE_PATTERN.sub(
        lambda match: "{key}{sep}{quote}{redacted}".format(
            key=match.group("key"),
            sep=match.group("sep"),
            quote=match.group("quote"),
            redacted=REDACTED,
        ),
        result,
    )
    result = _URL_CREDENTIALS_PATTERN.sub(
        lambda match: "{prefix}{redacted}{at}".format(
            prefix=match.group("prefix"),
            redacted=REDACTED,
            at=match.group("at"),
        ),
        result,
    )
    return result


def redact_object(value: Any) -> Any:
    """Redact strings inside the containers that logging actually carries."""
    if isinstance(value, str):
        return redact_text(value)
    if isinstance(value, tuple):
        return tuple(redact_object(item) for item in value)
    if isinstance(value, list):
        return [redact_object(item) for item in value]
    if isinstance(value, dict):
        return {key: redact_object(item) for key, item in value.items()}
    return value


def format_exception_redacted(exc_type: Any, exc: Any, tb: Any) -> str:
    """Format a traceback with every sensitive value redacted."""
    return redact_text("".join(traceback.format_exception(exc_type, exc, tb)))


def _install_log_record_factory() -> None:
    """Redact at record creation, so every logger and handler is covered."""
    previous_factory = logging.getLogRecordFactory()
    if getattr(previous_factory, "_allchemist_redacting", False):
        return

    def factory(*args: Any, **kwargs: Any) -> logging.LogRecord:
        record = previous_factory(*args, **kwargs)
        if isinstance(record.msg, str):
            record.msg = redact_text(record.msg)
        if record.args:
            record.args = redact_object(record.args)
        return record

    factory._allchemist_redacting = True  # type: ignore[attr-defined]
    logging.setLogRecordFactory(factory)


def _install_excepthooks() -> None:
    """Redact uncaught tracebacks printed by the interpreter."""
    if not getattr(sys.excepthook, "_allchemist_redacting", False):

        def excepthook(exc_type, exc, tb):  # type: ignore[no-untyped-def]
            sys.stderr.write(format_exception_redacted(exc_type, exc, tb))

        excepthook._allchemist_redacting = True  # type: ignore[attr-defined]
        sys.excepthook = excepthook

    thread_hook = getattr(threading, "excepthook", None)
    if thread_hook is not None and not getattr(thread_hook, "_allchemist_redacting", False):

        def thread_excepthook(args):  # type: ignore[no-untyped-def]
            sys.stderr.write(
                format_exception_redacted(args.exc_type, args.exc_value, args.exc_traceback)
            )

        thread_excepthook._allchemist_redacting = True  # type: ignore[attr-defined]
        threading.excepthook = thread_excepthook


def install_redaction() -> None:
    """Idempotently install the logging and traceback redaction hooks."""
    global _installed
    with _install_lock:
        if _installed:
            return
        _install_log_record_factory()
        _install_excepthooks()
        _installed = True
