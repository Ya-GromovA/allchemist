import json
import os
import re
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import user_state_store as store


class _SmsCaptureHandler(BaseHTTPRequestHandler):
    calls = []

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        payload = json.loads(body.decode("utf-8")) if body else {}
        _SmsCaptureHandler.calls.append(payload)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def log_message(self, format, *args):
        return


class SmsProdE2ETest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp_dir = tempfile.TemporaryDirectory()
        self._original_state_path = store.STATE_PATH
        self._orig_env = settings.ENV
        self._orig_sms_url = settings.SMS_PROVIDER_URL
        self._orig_sms_token = settings.SMS_PROVIDER_TOKEN

        store.STATE_PATH = Path(self._tmp_dir.name) / "user_state.json"
        _SmsCaptureHandler.calls = []

        self._server = ThreadingHTTPServer(("127.0.0.1", 0), _SmsCaptureHandler)
        host, port = self._server.server_address
        self._server_thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._server_thread.start()

        settings.ENV = "prod"
        settings.SMS_PROVIDER_URL = f"http://{host}:{port}/sms"
        settings.SMS_PROVIDER_TOKEN = ""

        self.client = TestClient(app)
        self.phone = os.getenv("TEST_PHONE", "89154674679")

    def tearDown(self) -> None:
        settings.ENV = self._orig_env
        settings.SMS_PROVIDER_URL = self._orig_sms_url
        settings.SMS_PROVIDER_TOKEN = self._orig_sms_token

        self._server.shutdown()
        self._server.server_close()
        self._server_thread.join(timeout=2)

        store.STATE_PATH = self._original_state_path
        self._tmp_dir.cleanup()

    def test_prod_sms_without_debug_code(self) -> None:
        req = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        self.assertEqual(req.status_code, 200, req.text)
        body = req.json()

        self.assertEqual(body.get("smsStatus"), "sent")
        self.assertIsNone(body.get("debugCode"))
        self.assertGreaterEqual(len(_SmsCaptureHandler.calls), 1)

        last_call = _SmsCaptureHandler.calls[-1]
        message = str(last_call.get("message") or "")
        match = re.search(r"(\d{6})", message)
        self.assertIsNotNone(match, f"OTP code not found in SMS payload: {message}")
        code = match.group(1)

        verify = self.client.post(
            "/api/v1/auth/phone/verify",
            json={"phone": self.phone, "code": code},
        )
        self.assertEqual(verify.status_code, 200, verify.text)
        verify_body = verify.json()
        self.assertEqual(verify_body["phone"], self.phone)
        self.assertEqual(verify_body["accessToken"].count("."), 2)


if __name__ == "__main__":
    unittest.main()
