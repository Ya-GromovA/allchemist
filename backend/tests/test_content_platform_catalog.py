import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.main import app
from app.services import user_state_store as store


class ContentPlatformCatalogTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp_dir = tempfile.TemporaryDirectory()
        self._original_state_path = store.STATE_PATH
        store.STATE_PATH = Path(self._tmp_dir.name) / "user_state.json"
        self.client = TestClient(app)
        init_db()
        self.phone = os.getenv("TEST_PHONE", "+79992220001")

    def tearDown(self) -> None:
        try:
            db = SessionLocal()
            db.execute(text("DELETE FROM content_blocks WHERE id = 'cnt_test_publish_gate'"))
            db.execute(text("DELETE FROM content_blocks WHERE id = 'cnt_test_publish_gate_duplicate'"))
            db.execute(text("DELETE FROM content_sources WHERE id = 'src_test_methodist_owned'"))
            db.execute(text("DELETE FROM content_sources WHERE id = 'src_test_methodist_owned_duplicate'"))
            db.commit()
            db.close()
        except Exception:
            pass
        store.STATE_PATH = self._original_state_path
        self._tmp_dir.cleanup()

    @staticmethod
    def _auth(access_token: str) -> dict:
        return {"Authorization": f"Bearer {access_token}"}

    def _owner_token(self) -> str:
        req = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        code = req.json()["debugCode"]
        verify = self.client.post("/api/v1/auth/phone/verify", json={"phone": self.phone, "code": code})
        user_id = verify.json()["userId"]
        consent = self.client.post(
            "/api/v1/users/consents/accept",
            json={"userId": user_id, "role": "student", "version": "2026-05-20", "parentApproved": True},
        )
        self.assertEqual(consent.status_code, 200, consent.text)
        bootstrap = self.client.post(
            "/api/v1/admin/bootstrap-owner",
            json={"userId": user_id, "secret": settings.ADMIN_BOOTSTRAP_SECRET},
        )
        self.assertEqual(bootstrap.status_code, 200, bootstrap.text)
        req2 = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        code2 = req2.json()["debugCode"]
        verify2 = self.client.post("/api/v1/auth/phone/verify", json={"phone": self.phone, "code": code2})
        self.assertEqual(verify2.status_code, 200, verify2.text)
        return verify2.json()["accessToken"]

    def test_platform_catalog_contains_qa_and_subjects(self) -> None:
        response = self.client.get("/api/v1/content/platform-catalog")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("contentHash", data)
        self.assertIn("qa", data)
        self.assertIn("requiredMetadata", data["qa"])
        self.assertGreaterEqual(len(data.get("subjects", [])), 4)

    def test_exam_variant_generation_is_structured(self) -> None:
        response = self.client.post(
            "/api/v1/content/exams/generate",
            json={"subject": "chemistry", "examType": "oge", "count": 4, "seed": "student-1"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["subject"], "chemistry")
        self.assertEqual(data["examType"], "oge")
        self.assertEqual(len(data["questions"]), 4)
        self.assertIn("qa", data)
        self.assertEqual(data["questions"][0]["publicationStatus"], "draft_training_template")

    def test_ticket_analysis_returns_private_plan(self) -> None:
        response = self.client.post(
            "/api/v1/content/tickets/analyze",
            json={"subject": "chemistry", "text": "Периодический закон. Ионные реакции в растворах."},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertEqual(data["publicationStatus"], "user_private_analysis")
        self.assertIn("ticketHash", data)
        self.assertTrue(data["repeatPlanRu"])

    def test_content_qa_publish_gate_requires_sources_and_review(self) -> None:
        token = self._owner_token()
        block = self.client.post(
            "/api/v1/content/qa/blocks",
            headers=self._auth(token),
            json={
                "id": "cnt_test_publish_gate",
                "subject": "chemistry",
                "section": "Общая химия",
                "topic": "Ионные реакции в растворах",
                "contentType": "theory",
                "titleRu": "Тестовый блок QA",
                "bodyRu": "Авторское объяснение для проверки workflow.",
            },
        )
        self.assertEqual(block.status_code, 200, block.text)
        self.assertFalse(block.json()["publishGate"]["ready"])

        duplicate_block = self.client.post(
            "/api/v1/content/qa/blocks",
            headers=self._auth(token),
            json={
                "id": "cnt_test_publish_gate_duplicate",
                "subject": "chemistry",
                "section": "Общая химия",
                "topic": "Ионные реакции в растворах",
                "contentType": "theory",
                "titleRu": "Тестовый блок QA",
                "bodyRu": "Авторское объяснение для проверки workflow.",
            },
        )
        self.assertEqual(duplicate_block.status_code, 409, duplicate_block.text)
        self.assertIn("duplicate", duplicate_block.json()["detail"])

        rejected = self.client.post(
            "/api/v1/content/qa/blocks/cnt_test_publish_gate/transition",
            headers=self._auth(token),
            json={"toStatus": "published", "actor": "qa-test"},
        )
        self.assertEqual(rejected.status_code, 400, rejected.text)
        self.assertIn("missingFields", rejected.json()["detail"])

        source = self.client.post(
            "/api/v1/content/qa/sources",
            headers=self._auth(token),
            json={
                "id": "src_test_methodist_owned",
                "titleRu": "Собственный методический материал",
                "organizationRu": "Allchemist content team",
                "licenseStatus": "owned_or_commissioned",
                "usageRu": "Можно использовать в авторских объяснениях после методической проверки.",
                "trustLevel": "high_after_review",
            },
        )
        self.assertEqual(source.status_code, 200, source.text)

        duplicate_source = self.client.post(
            "/api/v1/content/qa/sources",
            headers=self._auth(token),
            json={
                "id": "src_test_methodist_owned_duplicate",
                "titleRu": "Собственный методический материал",
                "organizationRu": "Allchemist content team",
                "licenseStatus": "owned_or_commissioned",
            },
        )
        self.assertEqual(duplicate_source.status_code, 409, duplicate_source.text)
        self.assertIn("duplicate", duplicate_source.json()["detail"])

        ready = self.client.post(
            "/api/v1/content/qa/blocks",
            headers=self._auth(token),
            json={
                "id": "cnt_test_publish_gate",
                "subject": "chemistry",
                "section": "Общая химия",
                "topic": "Ионные реакции в растворах",
                "contentType": "theory",
                "titleRu": "Тестовый блок QA",
                "bodyRu": "Авторское объяснение для проверки workflow.",
                "sourceList": ["src_test_methodist_owned"],
                "licenseStatus": "owned_or_commissioned",
                "legalStatus": "owned_or_commissioned",
                "verifiedBy": "scientific-editor-test",
                "reviewedBy": "methodist-test",
            },
        )
        self.assertEqual(ready.status_code, 200, ready.text)
        self.assertTrue(ready.json()["publishGate"]["ready"])

        queues = self.client.get("/api/v1/content/qa/queues?subject=chemistry", headers=self._auth(token))
        self.assertEqual(queues.status_code, 200, queues.text)
        self.assertIn("noAutopublishGateRu", queues.json())
        self.assertTrue(any(queue.get("status") == "draft" for queue in queues.json().get("queues", [])))

        source_list = self.client.get(
            "/api/v1/content/qa/sources?q=methodist&licenseStatus=owned_or_commissioned",
            headers=self._auth(token),
        )
        self.assertEqual(source_list.status_code, 200, source_list.text)
        self.assertGreaterEqual(source_list.json()["total"], 1)
        self.assertIn("src_test_methodist_owned", [item["id"] for item in source_list.json()["items"]])

        block_list = self.client.get(
            "/api/v1/content/qa/blocks?q=publish_gate&subject=chemistry&publishStatus=draft",
            headers=self._auth(token),
        )
        self.assertEqual(block_list.status_code, 200, block_list.text)
        self.assertGreaterEqual(block_list.json()["total"], 1)
        self.assertIn("bodyRu", block_list.json()["items"][0])
        self.assertIn("cnt_test_publish_gate", [item["id"] for item in block_list.json()["items"]])

        published = self.client.post(
            "/api/v1/content/qa/blocks/cnt_test_publish_gate/transition",
            headers=self._auth(token),
            json={"toStatus": "published", "actor": "qa-test"},
        )
        self.assertEqual(published.status_code, 400, published.text)
        self.assertIn("workflow_status:legal_review", published.json()["detail"]["missingFields"])

        for status in ["author_review", "scientific_review", "methodist_review", "content_qa", "legal_review"]:
            moved = self.client.post(
                "/api/v1/content/qa/blocks/cnt_test_publish_gate/transition",
                headers=self._auth(token),
                json={"toStatus": status, "actor": "qa-test"},
            )
            self.assertEqual(moved.status_code, 200, moved.text)
            self.assertEqual(moved.json()["publishStatus"], status)

        published = self.client.post(
            "/api/v1/content/qa/blocks/cnt_test_publish_gate/transition",
            headers=self._auth(token),
            json={"toStatus": "published", "actor": "qa-test"},
        )
        self.assertEqual(published.status_code, 200, published.text)
        self.assertEqual(published.json()["publishStatus"], "published")

        events = self.client.get(
            "/api/v1/content/qa/blocks/cnt_test_publish_gate/events",
            headers=self._auth(token),
        )
        self.assertEqual(events.status_code, 200, events.text)
        self.assertGreaterEqual(len(events.json()["items"]), 1)
        self.assertEqual(events.json()["items"][0]["toStatus"], "published")


if __name__ == "__main__":
    unittest.main()
