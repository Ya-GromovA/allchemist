import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services import user_state_store as store


class AdminUiTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp_dir = tempfile.TemporaryDirectory()
        self._original_state_path = store.STATE_PATH
        store.STATE_PATH = Path(self._tmp_dir.name) / "user_state.json"
        self.client = TestClient(app)

    def tearDown(self) -> None:
        store.STATE_PATH = self._original_state_path
        self._tmp_dir.cleanup()

    def test_admin_ui_html(self) -> None:
        res = self.client.get("/api/v1/admin/ui")
        self.assertEqual(res.status_code, 200, res.text)
        self.assertIn("Алхимик Админ-панель", res.text)
        self.assertIn("/api/v1/admin/web", res.text)
        self.assertIn("режим совместимости", res.text)


if __name__ == "__main__":
    unittest.main()
