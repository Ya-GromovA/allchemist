"""Specification §11: sensitive values must never reach logs or artifacts."""

from __future__ import annotations

import logging
import unittest

from app.core.redaction import (
    REDACTED,
    install_redaction,
    redact_object,
    redact_text,
    sensitive_env_keys,
)


class RedactionTest(unittest.TestCase):
    def setUp(self) -> None:
        install_redaction()

    def test_connection_string_password_is_replaced(self) -> None:
        text = "postgresql+psycopg://synapse:s3cret-value-9x@127.0.0.1:5433/synapse"
        redacted = redact_text(text)
        self.assertNotIn("s3cret-value-9x", redacted)
        self.assertIn(REDACTED, redacted)
        # Everything that is not a credential survives: a redacted message must
        # still be diagnosable.
        self.assertIn("127.0.0.1:5433/synapse", redacted)

    def test_libpq_style_conninfo_is_replaced(self) -> None:
        text = "host=127.0.0.1 dbname=synapse user=synapse password=s3cret-value-9x port=5433"
        redacted = redact_text(text)
        self.assertNotIn("s3cret-value-9x", redacted)
        self.assertIn("password=" + REDACTED, redacted)
        self.assertIn("user=synapse", redacted)

    def test_quoted_mapping_form_is_replaced(self) -> None:
        text = "{'dbname': 'synapse', 'password': 's3cret-value-9x', 'port': 5433}"
        redacted = redact_text(text)
        self.assertNotIn("s3cret-value-9x", redacted)
        self.assertIn(REDACTED, redacted)

    def test_rule_is_generic_across_sensitive_key_names(self) -> None:
        for key in ("api_key", "WEBHOOK_SECRET_YOOKASSA", "access_token", "X-Signature"):
            with self.subTest(key=key):
                redacted = redact_text("%s=value-under-test-1234" % key)
                self.assertNotIn("value-under-test-1234", redacted)
                self.assertIn(REDACTED, redacted)

    def test_working_directory_is_not_treated_as_a_secret(self) -> None:
        # PWD matches the "pwd" key pattern but is never a credential; without
        # the exclusion every file path in a traceback would be destroyed.
        self.assertNotIn("PWD", sensitive_env_keys())
        self.assertNotIn("OLDPWD", sensitive_env_keys())

    def test_non_sensitive_text_is_untouched(self) -> None:
        text = "GET /api/v1/health 200 OK in 3ms"
        self.assertEqual(text, redact_text(text))

    def test_nested_containers_are_redacted(self) -> None:
        payload = {"conn": ["password=s3cret-value-9x"], "port": 5433}
        redacted = redact_object(payload)
        self.assertNotIn("s3cret-value-9x", str(redacted))
        self.assertEqual(5433, redacted["port"])

    def test_log_records_are_redacted(self) -> None:
        logger = logging.getLogger("allchemist.tests.redaction")
        with self.assertLogs(logger, level="ERROR") as captured:
            logger.error("connect failed: password=s3cret-value-9x")
            logger.error("connect failed: %s", "token=s3cret-value-9x")
        joined = "\n".join(captured.output)
        self.assertNotIn("s3cret-value-9x", joined)
        self.assertIn(REDACTED, joined)


if __name__ == "__main__":
    unittest.main()
