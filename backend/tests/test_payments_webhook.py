import hashlib
import hmac
import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import user_state_store as store


class PaymentsWebhookTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp_dir = tempfile.TemporaryDirectory()
        self._original_state_path = store.STATE_PATH
        store.STATE_PATH = Path(self._tmp_dir.name) / "user_state.json"
        self.client = TestClient(app)
        self.phone = os.getenv("TEST_PHONE", "89154674679")

    def tearDown(self) -> None:
        store.STATE_PATH = self._original_state_path
        self._tmp_dir.cleanup()

    @staticmethod
    def _auth(access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}"}

    @staticmethod
    def _sign(secret: str, payload: dict) -> str:
        raw = "&".join(f"{k}={payload[k]}" for k in sorted(payload.keys()))
        return hmac.new(secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()

    def _login(self):
        req = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        code = req.json()["debugCode"]
        verify = self.client.post("/api/v1/auth/phone/verify", json={"phone": self.phone, "code": code})
        body = verify.json()
        return body["userId"], body["accessToken"]

    def _teacher_access(self) -> str:
        user_id, _ = self._login()
        consent = self.client.post(
            "/api/v1/users/consents/accept",
            json={
                "userId": user_id,
                "role": "teacher",
                "version": "2026-02-22",
                "parentApproved": True,
            },
        )
        self.assertEqual(consent.status_code, 200, consent.text)

        req = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        code = req.json()["debugCode"]
        verify = self.client.post("/api/v1/auth/phone/verify", json={"phone": self.phone, "code": code})
        self.assertEqual(verify.status_code, 200, verify.text)
        return verify.json()["accessToken"]

    def test_invalid_signature_rejected(self) -> None:
        _, access = self._login()
        create = self.client.post(
            "/api/v1/payments/create",
            json={"provider": "tbank", "moduleId": "physics_plus", "amountRub": 1290},
            headers=self._auth(access),
        )
        payment_id = create.json()["paymentId"]

        res = self.client.post(
            "/api/v1/payments/webhook/tbank",
            json={"paymentId": payment_id, "status": "paid", "eventId": "evt-x", "payload": {}},
            headers={"X-Signature": "invalid-signature"},
        )
        self.assertEqual(res.status_code, 400, res.text)

    def test_invalid_transition_rejected(self) -> None:
        _, access = self._login()
        create = self.client.post(
            "/api/v1/payments/create",
            json={"provider": "yookassa", "moduleId": "chemistry_plus", "amountRub": 990},
            headers=self._auth(access),
        )
        payment_id = create.json()["paymentId"]

        paid_payload = {"paymentId": payment_id, "status": "paid", "eventId": "evt-paid"}
        paid_sign = self._sign(
            settings.WEBHOOK_SECRET_YOOKASSA,
            {
                "paymentId": payment_id,
                "status": "paid",
                "amountRub": None,
                "moduleId": None,
                "eventId": "evt-paid",
            },
        )
        paid = self.client.post(
            "/api/v1/payments/webhook/yookassa",
            json={"paymentId": payment_id, "status": "paid", "eventId": "evt-paid", "payload": {}},
            headers={"X-Signature": paid_sign},
        )
        self.assertEqual(paid.status_code, 200, paid.text)

        auth_payload = {"paymentId": payment_id, "status": "authorized", "eventId": "evt-auth"}
        auth_sign = self._sign(
            settings.WEBHOOK_SECRET_YOOKASSA,
            {
                "paymentId": payment_id,
                "status": "authorized",
                "amountRub": None,
                "moduleId": None,
                "eventId": "evt-auth",
            },
        )
        invalid = self.client.post(
            "/api/v1/payments/webhook/yookassa",
            json={"paymentId": payment_id, "status": "authorized", "eventId": "evt-auth", "payload": {}},
            headers={"X-Signature": auth_sign},
        )
        self.assertEqual(invalid.status_code, 400, invalid.text)

    def test_webhook_idempotency_and_status_mapping(self) -> None:
        _, access = self._login()
        create = self.client.post(
            "/api/v1/payments/create",
            json={"provider": "robokassa", "moduleId": "chemistry_plus", "amountRub": 990},
            headers=self._auth(access),
        )
        payment_id = create.json()["paymentId"]

        sign_payload = {
            "paymentId": payment_id,
            "status": "success",
            "amountRub": None,
            "moduleId": None,
            "eventId": "evt-robo-1",
        }
        signature = self._sign(settings.WEBHOOK_SECRET_ROBOKASSA, sign_payload)

        first = self.client.post(
            "/api/v1/payments/webhook/robokassa",
            json={"paymentId": payment_id, "status": "success", "eventId": "evt-robo-1", "payload": {}},
            headers={"X-Signature": signature},
        )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["status"], "paid")

        second = self.client.post(
            "/api/v1/payments/webhook/robokassa",
            json={"paymentId": payment_id, "status": "success", "eventId": "evt-robo-1", "payload": {}},
            headers={"X-Signature": signature},
        )
        self.assertEqual(second.status_code, 200, second.text)
        self.assertEqual(second.json()["status"], "paid")

    def test_dead_letter_admin_flow(self) -> None:
        _, access = self._login()
        create = self.client.post(
            "/api/v1/payments/create",
            json={"provider": "tbank", "moduleId": "physics_plus", "amountRub": 1290},
            headers=self._auth(access),
        )
        payment_id = create.json()["paymentId"]

        bad = self.client.post(
            "/api/v1/payments/webhook/tbank",
            json={"paymentId": payment_id, "status": "paid", "eventId": "evt-dlq-1", "payload": {}},
            headers={"X-Signature": "bad"},
        )
        self.assertEqual(bad.status_code, 400, bad.text)

        forbidden_dead = self.client.get(
            "/api/v1/payments/admin/webhook/dead-letters",
            headers=self._auth(access),
        )
        self.assertEqual(forbidden_dead.status_code, 403, forbidden_dead.text)

        teacher_access = self._teacher_access()
        dead = self.client.get(
            "/api/v1/payments/admin/webhook/dead-letters",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(dead.status_code, 200, dead.text)
        letters = dead.json()
        self.assertTrue(len(letters) >= 1)
        dead_id = letters[-1]["deadLetterId"]

        reprocess = self.client.post(
            f"/api/v1/payments/admin/webhook/dead-letters/{dead_id}/reprocess",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(reprocess.status_code, 200, reprocess.text)

        cleanup = self.client.post(
            "/api/v1/payments/admin/webhook/cleanup?retention_sec=3600",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(cleanup.status_code, 200, cleanup.text)

        query = self.client.get(
            "/api/v1/payments/audit/query?provider=tbank&limit=50",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(query.status_code, 200, query.text)
        self.assertTrue(isinstance(query.json(), list))

        csv_export = self.client.get(
            "/api/v1/payments/audit/export.csv?provider=tbank&limit=50",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(csv_export.status_code, 200, csv_export.text)
        self.assertIn("text/csv", csv_export.headers.get("content-type", ""))
        self.assertIn("paymentId", csv_export.text)

    def test_dead_letter_reprocess_backoff(self) -> None:
        _, access = self._login()
        create = self.client.post(
            "/api/v1/payments/create",
            json={"provider": "tbank", "moduleId": "physics_plus", "amountRub": 1290},
            headers=self._auth(access),
        )
        payment_id = create.json()["paymentId"]

        bad = self.client.post(
            "/api/v1/payments/webhook/tbank",
            json={"paymentId": payment_id, "status": "unknown_status", "eventId": "evt-dlq-backoff", "payload": {}},
            headers={"X-Signature": "bad"},
        )
        self.assertEqual(bad.status_code, 400, bad.text)

        teacher_access = self._teacher_access()
        dead = self.client.get(
            "/api/v1/payments/admin/webhook/dead-letters",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(dead.status_code, 200, dead.text)
        target = None
        for item in dead.json():
            if item.get("paymentId") == payment_id:
                target = item
                break
        self.assertIsNotNone(target)

        reprocess = self.client.post(
            f"/api/v1/payments/admin/webhook/dead-letters/{target['deadLetterId']}/reprocess",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(reprocess.status_code, 400, reprocess.text)

        dead_after = self.client.get(
            "/api/v1/payments/admin/webhook/dead-letters",
            headers=self._auth(teacher_access),
        )
        self.assertEqual(dead_after.status_code, 200, dead_after.text)
        target_after = None
        for item in dead_after.json():
            if item.get("deadLetterId") == target["deadLetterId"]:
                target_after = item
                break
        self.assertIsNotNone(target_after)
        self.assertGreaterEqual(int(target_after.get("attempts") or 0), 1)
        self.assertTrue(bool(target_after.get("nextRetryAt")))


if __name__ == "__main__":
    unittest.main()
