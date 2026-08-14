import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import user_state_store as store


class AuthenticationAcceptanceTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp_dir = tempfile.TemporaryDirectory()
        self._original_state_path = store.STATE_PATH
        store.STATE_PATH = Path(self._tmp_dir.name) / "user_state.json"
        self.client = TestClient(app, raise_server_exceptions=False)

    def tearDown(self) -> None:
        store.STATE_PATH = self._original_state_path
        self._tmp_dir.cleanup()

    def _synthetic_admin_settings(self):
        return (
            patch.object(settings, "ADMIN_UI_LOGIN", "auth-contract-test-admin"),
            patch.object(settings, "ADMIN_UI_PASSWORD", "Valid-Synthetic-Test-Password-001"),
        )

    def test_invalid_credentials_are_generic_401_without_enumeration(self) -> None:
        login_patch, password_patch = self._synthetic_admin_settings()
        with login_patch, password_patch:
            unknown_login = self.client.post(
                "/api/v1/admin/auth/login-password",
                json={
                    "login": "auth-negative-test-user",
                    "password": "Invalid-Test-Password-Not-A-Real-Credential-001",
                },
            )
            wrong_password = self.client.post(
                "/api/v1/admin/auth/login-password",
                json={
                    "login": "auth-contract-test-admin",
                    "password": "Invalid-Test-Password-Not-A-Real-Credential-001",
                },
            )

        expected = {"detail": "Не удалось войти. Проверь логин и пароль."}
        self.assertEqual(unknown_login.status_code, 401, unknown_login.text)
        self.assertEqual(wrong_password.status_code, 401, wrong_password.text)
        self.assertEqual(unknown_login.json(), expected)
        self.assertEqual(wrong_password.json(), expected)
        self.assertNotIn("traceback", unknown_login.text.lower())
        self.assertNotIn("stack", unknown_login.text.lower())
        self.assertNotIn("sql", unknown_login.text.lower())

    def test_missing_credentials_are_generic_401(self) -> None:
        login_patch, password_patch = self._synthetic_admin_settings()
        with login_patch, password_patch:
            response = self.client.post(
                "/api/v1/admin/auth/login-password",
                json={},
            )
        self.assertEqual(response.status_code, 401, response.text)
        self.assertEqual(
            response.json(),
            {"detail": "Не удалось войти. Проверь логин и пароль."},
        )

    def test_invalid_request_schema_is_generic_400(self) -> None:
        login_patch, password_patch = self._synthetic_admin_settings()
        with login_patch, password_patch:
            response = self.client.post(
                "/api/v1/admin/auth/login-password",
                json={"login": ["not", "a", "string"], "password": {}},
            )
        self.assertEqual(response.status_code, 400, response.text)
        self.assertEqual(response.json(), {"detail": "Некорректный запрос."})

    def test_unconfigured_authentication_is_generic_503(self) -> None:
        with (
            patch.object(settings, "ADMIN_UI_LOGIN", ""),
            patch.object(settings, "ADMIN_UI_PASSWORD", ""),
        ):
            response = self.client.post(
                "/api/v1/admin/auth/login-password",
                json={"login": "synthetic-user", "password": "synthetic-password"},
            )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(
            response.json(),
            {"detail": "Сервис входа временно недоступен."},
        )

    def test_unexpected_authentication_error_has_no_internal_details(self) -> None:
        login_patch, password_patch = self._synthetic_admin_settings()
        with (
            login_patch,
            password_patch,
            patch(
                "app.api.v1.endpoints.admin_panel.admin_password_login",
                side_effect=RuntimeError("sensitive stack SQL internal-id-123"),
            ),
        ):
            response = self.client.post(
                "/api/v1/admin/auth/login-password",
                json={"login": "synthetic-user", "password": "synthetic-password"},
            )
        self.assertEqual(response.status_code, 503, response.text)
        self.assertEqual(
            response.json(),
            {"detail": "Сервис входа временно недоступен."},
        )
        self.assertNotIn("sensitive", response.text.lower())
        self.assertNotIn("stack", response.text.lower())
        self.assertNotIn("sql", response.text.lower())
        self.assertNotIn("internal-id", response.text.lower())

    def test_unauthenticated_admin_request_is_401(self) -> None:
        response = self.client.get("/api/v1/admin/options")
        self.assertEqual(response.status_code, 401, response.text)

    def test_admin_web_contains_accessible_failure_contract(self) -> None:
        index = self.client.get("/api/v1/admin/web")
        script = self.client.get("/api/v1/admin/web/assets/app.js")
        styles = self.client.get("/api/v1/admin/web/assets/styles.css")

        self.assertEqual(index.status_code, 200, index.text)
        self.assertIn('id="adminPasswordForm"', index.text)
        self.assertIn('role="dialog"', index.text)
        self.assertIn('aria-modal="true"', index.text)
        self.assertIn('id="adminAuthStatus"', index.text)
        self.assertIn('role="alert"', index.text)
        self.assertIn('aria-live="assertive"', index.text)
        self.assertIn('type="submit"', index.text)
        self.assertIn("v=20260729auth1", index.text)

        self.assertEqual(script.status_code, 200, script.text)
        self.assertIn("ADMIN_AUTH_MESSAGES", script.text)
        self.assertIn("adminAuthSubmitting", script.text)
        self.assertIn("setAdminAuthLoading(true)", script.text)
        self.assertIn("passwordInput.value = \"\"", script.text)
        self.assertIn('addEventListener("submit", loginByPassword)', script.text)
        self.assertIn("ADMIN_AUTH_TIMEOUT_MS", script.text)
        self.assertIn("status === 429", script.text)
        self.assertIn("function expireAdminSession()", script.text)
        self.assertIn('path.startsWith("/admin/")', script.text)
        self.assertIn("Сессия истекла. Выполни вход снова.", script.text)

        self.assertEqual(styles.status_code, 200, styles.text)
        self.assertIn(".authStatusSlot:empty", styles.text)
        self.assertIn("min-height: 54px", styles.text)
        self.assertIn("min-height: 72px", styles.text)
        self.assertIn(".adminTopbar .heroGlow", styles.text)
        self.assertIn("pointer-events: none", styles.text)
        self.assertIn("@media (prefers-reduced-motion: reduce)", styles.text)


if __name__ == "__main__":
    unittest.main()
