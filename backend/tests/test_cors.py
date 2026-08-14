import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import (
    Settings,
    get_cors_origins,
    settings,
    validate_production_secret_overrides,
)
from app.main import create_application


class CorsPolicyTest(unittest.TestCase):
    APPROVED_ORIGIN = "https://allchemist.ru"
    UNKNOWN_ORIGIN = "https://unknown.example"

    def setUp(self) -> None:
        env_patch = patch.object(settings, "ENV", "test")
        origins_patch = patch.object(
            settings,
            "CORS_ORIGINS",
            "https://allchemist.ru,https://www.allchemist.ru,https://admin.allchemist.ru,https://api.allchemist.ru",
        )
        env_patch.start()
        origins_patch.start()
        self.addCleanup(env_patch.stop)
        self.addCleanup(origins_patch.stop)
        self.client = TestClient(create_application())

    def test_approved_origin_receives_cors_and_credentials(self) -> None:
        response = self.client.get(
            "/api/v1/health",
            headers={"Origin": self.APPROVED_ORIGIN},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), self.APPROVED_ORIGIN)
        self.assertEqual(response.headers.get("access-control-allow-credentials"), "true")

    def test_unknown_origin_receives_no_cors_or_credentials(self) -> None:
        response = self.client.get(
            "/api/v1/health",
            headers={"Origin": self.UNKNOWN_ORIGIN},
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotIn("access-control-allow-origin", response.headers)
        self.assertNotIn("access-control-allow-credentials", response.headers)

    def test_preflight_only_passes_for_allowlist(self) -> None:
        approved = self.client.options(
            "/api/v1/health",
            headers={
                "Origin": self.APPROVED_ORIGIN,
                "Access-Control-Request-Method": "GET",
            },
        )
        unknown = self.client.options(
            "/api/v1/health",
            headers={
                "Origin": self.UNKNOWN_ORIGIN,
                "Access-Control-Request-Method": "GET",
            },
        )

        self.assertEqual(approved.status_code, 200)
        self.assertEqual(approved.headers.get("access-control-allow-origin"), self.APPROVED_ORIGIN)
        self.assertEqual(approved.headers.get("access-control-allow-credentials"), "true")
        self.assertEqual(unknown.status_code, 400)
        self.assertFalse(any(name.startswith("access-control-") for name in unknown.headers))

    def test_production_security_profile_disables_api_docs_independently_of_env(self) -> None:
        with (
            patch.object(settings, "ENV", "dev"),
            patch.object(settings, "SECURITY_ENV", "production"),
            patch("app.main.validate_production_secret_overrides"),
        ):
            production_client = TestClient(create_application())

        for path in ("/docs", "/redoc", "/openapi.json"):
            self.assertEqual(production_client.get(path).status_code, 404)

    def test_non_production_profile_keeps_api_docs(self) -> None:
        with (
            patch.object(settings, "ENV", "test"),
            patch.object(settings, "SECURITY_ENV", ""),
        ):
            development_client = TestClient(create_application())

        for path in ("/docs", "/redoc", "/openapi.json"):
            self.assertEqual(development_client.get(path).status_code, 200)

    def test_production_rejects_loopback_origin(self) -> None:
        with (
            patch.object(settings, "ENV", "production"),
            patch.object(settings, "CORS_ORIGINS", "https://allchemist.ru,http://localhost:19006"),
        ):
            with self.assertRaisesRegex(RuntimeError, "non-loopback HTTPS"):
                get_cors_origins(settings)

    def test_wildcard_is_rejected(self) -> None:
        with patch.object(settings, "CORS_ORIGINS", "*"):
            with self.assertRaisesRegex(RuntimeError, "must not contain a wildcard"):
                get_cors_origins(settings)

    def test_production_rejects_default_secret(self) -> None:
        default_password = Settings.model_fields["ADMIN_UI_PASSWORD"].default
        with (
            patch.object(settings, "SECURITY_ENV", "production"),
            patch.object(settings, "ADMIN_UI_PASSWORD", default_password),
        ):
            with self.assertRaisesRegex(RuntimeError, "ADMIN_UI_PASSWORD"):
                validate_production_secret_overrides(settings)


if __name__ == "__main__":
    unittest.main()
