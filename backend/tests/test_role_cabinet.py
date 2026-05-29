import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints.role_cabinet import _teacher_class_ids
from app.services import user_state_store as store


class RoleCabinetTest(unittest.TestCase):
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

    def _login_with_role(self, role: str) -> str:
        req = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        code = req.json().get("debugCode")
        first = self.client.post("/api/v1/auth/phone/verify", json={"phone": self.phone, "code": code})
        user_id = first.json()["userId"]

        consent = self.client.post(
            "/api/v1/users/consents/accept",
            json={"userId": user_id, "role": role, "version": "2026-02-22", "parentApproved": True},
        )
        self.assertEqual(consent.status_code, 200, consent.text)

        req2 = self.client.post("/api/v1/auth/phone/request-code", json={"phone": self.phone})
        code2 = req2.json().get("debugCode")
        second = self.client.post(
            "/api/v1/auth/phone/verify",
            json={
                "phone": self.phone,
                "code": code2,
                "localPreferences": {
                    "classrooms": ["8A", "9B"],
                    "linkedChildren": [{"id": "c1", "name": "Иван"}],
                },
            },
        )
        self.assertEqual(second.status_code, 200, second.text)
        return second.json()["accessToken"]

    def test_teacher_cabinet_and_parent_forbidden(self) -> None:
        teacher = self._login_with_role("teacher")
        teacher_view = self.client.get("/api/v1/cabinet/teacher/overview", headers=self._auth(teacher))
        self.assertEqual(teacher_view.status_code, 200, teacher_view.text)
        self.assertEqual(teacher_view.json()["role"], "teacher")

        parent_view = self.client.get("/api/v1/cabinet/parent/overview", headers=self._auth(teacher))
        self.assertEqual(parent_view.status_code, 403, parent_view.text)

    def test_parent_cabinet_and_teacher_forbidden(self) -> None:
        parent = self._login_with_role("parent")
        parent_view = self.client.get("/api/v1/cabinet/parent/overview", headers=self._auth(parent))
        self.assertEqual(parent_view.status_code, 200, parent_view.text)
        self.assertEqual(parent_view.json()["role"], "parent")

        teacher_view = self.client.get("/api/v1/cabinet/teacher/overview", headers=self._auth(parent))
        self.assertEqual(teacher_view.status_code, 403, teacher_view.text)

        child = self.client.get("/api/v1/cabinet/parent/children/c1/progress", headers=self._auth(parent))
        self.assertEqual(child.status_code, 200, child.text)
        self.assertEqual(child.json()["childId"], "c1")

    def test_homeroom_teacher_sees_only_homeroom_classes(self) -> None:
        state = {
            "school_classes": {
                "class_9a": {"teacherUserId": "u_homeroom"},
                "class_9b": {"teacherUserId": "u_subject"},
                "class_9c": {"homeroomTeacherUserId": "u_homeroom"},
            },
            "school_memberships": {
                "class_9a": {"u_homeroom": {"role": "teacher"}},
                "class_9b": {"u_homeroom": {"role": "homeroom_teacher"}},
            },
        }

        self.assertEqual(
            sorted(_teacher_class_ids(state, "u_homeroom", "homeroom_teacher")),
            ["class_9b", "class_9c"],
        )
        self.assertEqual(
            sorted(_teacher_class_ids(state, "u_homeroom", "teacher")),
            ["class_9a", "class_9b", "class_9c"],
        )


if __name__ == "__main__":
    unittest.main()
