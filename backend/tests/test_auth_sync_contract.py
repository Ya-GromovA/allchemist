import os
import hmac
import hashlib
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints.auth_sync import _build_role_data
from app.core.config import settings
from app.services.admin_panel_service import create_school_invite_code
from app.services import user_state_store as store


class AuthSyncContractTest(unittest.TestCase):
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

    def _request_code(self, phone: str) -> str:
        response = self.client.post("/api/v1/auth/phone/request-code", json={"phone": phone})
        self.assertEqual(response.status_code, 200, response.text)
        code = response.json().get("debugCode")
        self.assertTrue(code)
        return code

    @staticmethod
    def _sign(secret: str, payload: dict) -> str:
        raw = "&".join(f"{k}={payload[k]}" for k in sorted(payload.keys()))
        return hmac.new(secret.encode("utf-8"), raw.encode("utf-8"), hashlib.sha256).hexdigest()

    def test_homeroom_profile_role_data_is_russian(self) -> None:
        store._write_state({
            "school_classes": {
                "class_10f": {
                    "title": "10Ф",
                    "subject": "chemistry",
                    "homeroomTeacherUserId": "teacher_1",
                },
            },
            "school_memberships": {
                "class_10f": {"teacher_1": {"role": "homeroom_teacher"}},
            },
        })
        role_data = _build_role_data("homeroom_teacher", "teacher_1", {})
        self.assertEqual(role_data["roleLabelRu"], "Классный руководитель")
        self.assertEqual(role_data["positionLabelRu"], "Классный руководитель 10Ф")
        self.assertEqual(role_data["classAssignments"][0]["subjectLabelRu"], "химии")

    def test_school_invite_can_create_login_password_account_and_reset_password(self) -> None:
        invite = create_school_invite_code(
            class_id="class_10f",
            school_id="school_2070",
            site_id="site_2070_new_star",
            role="student",
            title="10Ф",
            subject="chemistry",
            expires_at=None,
            max_activations=1,
            teacher_user_id=None,
            student_label="Иван",
            changed_by="test_admin",
        )
        preview = self.client.post("/api/v1/auth/invite/preview", json={"code": invite["code"]})
        self.assertEqual(preview.status_code, 200, preview.text)
        preview_json = preview.json()
        self.assertEqual(preview_json["code"], invite["code"])
        self.assertEqual(preview_json["statusLabelRu"], "Готов к активации")
        self.assertEqual(preview_json["schoolTitle"], "Школа №2070")
        self.assertEqual(preview_json["siteTitle"], "Новая звезда")
        self.assertEqual(preview_json["classTitle"], "10Ф")
        self.assertEqual(preview_json["roleLabelRu"], "Учащийся")
        self.assertTrue(preview_json["modules"])
        self.assertIn("Код найден", preview_json["messageRu"])
        state_after_preview = store._read_state()
        stored_invite = state_after_preview["school_invite_codes"][invite["code"]]
        self.assertEqual(stored_invite.get("activations"), 0)
        self.assertEqual(stored_invite.get("status"), "pending")

        activated = self.client.post(
            "/api/v1/auth/invite/activate",
            json={
                "code": invite["code"],
                "phone": "+79000000001",
                "displayName": "Иван Иванов",
                "login": "ivan_10f",
                "password": "Passw0rd1",
                "passwordConfirm": "Passw0rd1",
            },
        )
        self.assertEqual(activated.status_code, 200, activated.text)
        activated_json = activated.json()
        self.assertEqual(activated_json["login"], "ivan_10f")
        self.assertEqual(activated_json["role"], "student")
        self.assertEqual(activated_json["activeRole"], "student")
        self.assertIn("availableRoles", activated_json)
        self.assertIn("schoolMemberships", activated_json)
        self.assertIn("classMemberships", activated_json)
        self.assertIn("grants", activated_json)
        self.assertIn("capabilities", activated_json)
        self.assertIn("featureFlags", activated_json)

        reused = self.client.post(
            "/api/v1/auth/invite/activate",
            json={
                "code": invite["code"],
                "phone": "+79000000002",
                "login": "ivan_10f_2",
                "password": "Passw0rd1",
                "passwordConfirm": "Passw0rd1",
            },
        )
        self.assertEqual(reused.status_code, 400, reused.text)
        used_preview = self.client.post("/api/v1/auth/invite/preview", json={"code": invite["code"]})
        self.assertEqual(used_preview.status_code, 400, used_preview.text)
        self.assertEqual(used_preview.json()["detail"], "Код уже был использован. Обратитесь к учителю или администратору школы.")

        login_ok = self.client.post("/api/v1/auth/login", json={"login": "ivan_10f", "password": "Passw0rd1"})
        self.assertEqual(login_ok.status_code, 200, login_ok.text)
        self.assertEqual(login_ok.json()["userId"], activated_json["userId"])
        self.assertEqual(login_ok.json()["activeRole"], "student")
        self.assertEqual(login_ok.json()["displayName"], "Иван Иванов")
        self.assertTrue(login_ok.json()["availableRoles"])
        profile = self.client.get("/api/v1/users/profile", headers=self._auth(login_ok.json()["accessToken"]))
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertEqual(profile.json()["displayName"], "Иван Иванов")
        self.assertEqual(profile.json()["activeRole"], "student")
        self.assertTrue(profile.json()["capabilities"]["canStudy"])

        login_bad = self.client.post("/api/v1/auth/login", json={"login": "ivan_10f", "password": "wrong"})
        self.assertEqual(login_bad.status_code, 400, login_bad.text)
        self.assertEqual(login_bad.json()["detail"], "Неверный логин или пароль")
        teacher_login = self.client.post("/api/v1/auth/login", json={"login": "ivan_10f", "password": "Passw0rd1", "expectedRole": "teacher"})
        self.assertEqual(teacher_login.status_code, 200, teacher_login.text)
        self.assertEqual(teacher_login.json()["activeRole"], "student")

        reset = store.create_password_reset_code(activated_json["userId"], changed_by="test_admin")
        state_after_reset = store._read_state()
        self.assertNotIn(reset["resetCode"], str(state_after_reset.get("password_reset_codes")))
        reset_ok = self.client.post(
            "/api/v1/auth/password-reset/by-code",
            json={"login": "ivan_10f", "code": reset["resetCode"], "password": "NewPassw0rd2", "passwordConfirm": "NewPassw0rd2"},
        )
        self.assertEqual(reset_ok.status_code, 200, reset_ok.text)
        reset_reuse = self.client.post(
            "/api/v1/auth/password-reset/by-code",
            json={"login": "ivan_10f", "code": reset["resetCode"], "password": "OtherPassw0rd3", "passwordConfirm": "OtherPassw0rd3"},
        )
        self.assertEqual(reset_reuse.status_code, 400, reset_reuse.text)

        old_password = self.client.post("/api/v1/auth/login", json={"login": "ivan_10f", "password": "Passw0rd1"})
        self.assertEqual(old_password.status_code, 400, old_password.text)
        new_password = self.client.post("/api/v1/auth/login", json={"login": "ivan_10f", "password": "NewPassw0rd2"})
        self.assertEqual(new_password.status_code, 200, new_password.text)

        stored = store._read_state()
        user = stored["users"][activated_json["userId"]]
        self.assertNotEqual(user.get("passwordHash"), "NewPassw0rd2")
        self.assertTrue(str(user.get("passwordHash") or "").startswith(("$2", "pbkdf2_sha256$")))
        self.assertTrue(any(row.get("action") == "login_password" for row in stored.get("auth_audit", [])))

    def test_school_invite_preview_errors_are_russian(self) -> None:
        missing = self.client.post("/api/v1/auth/invite/preview", json={"code": ""})
        self.assertEqual(missing.status_code, 400, missing.text)
        self.assertEqual(missing.json()["detail"], "Введите код доступа")

        unknown = self.client.post("/api/v1/auth/invite/preview", json={"code": "STD-2070-NZ-4040"})
        self.assertEqual(unknown.status_code, 400, unknown.text)
        self.assertEqual(unknown.json()["detail"], "Код не найден")

        revoked = create_school_invite_code(
            class_id="class_10f",
            school_id="school_2070",
            site_id="site_2070_new_star",
            role="student",
            title="10Ф",
            subject="chemistry",
            expires_at=None,
            max_activations=1,
            teacher_user_id=None,
            student_label="Иван",
            changed_by="test_admin",
        )
        state = store._read_state()
        state["school_invite_codes"][revoked["code"]]["status"] = "revoked"
        store._write_state(state)
        revoked_preview = self.client.post("/api/v1/auth/invite/preview", json={"code": revoked["code"]})
        self.assertEqual(revoked_preview.status_code, 400, revoked_preview.text)
        self.assertEqual(revoked_preview.json()["detail"], "Код отозван. Обратитесь к учителю или администратору школы.")

        expired = create_school_invite_code(
            class_id="class_10f",
            school_id="school_2070",
            site_id="site_2070_new_star",
            role="student",
            title="10Ф",
            subject="chemistry",
            expires_at="2000-01-01T00:00:00+00:00",
            max_activations=1,
            teacher_user_id=None,
            student_label="Пётр",
            changed_by="test_admin",
        )
        expired_preview = self.client.post("/api/v1/auth/invite/preview", json={"code": expired["code"]})
        self.assertEqual(expired_preview.status_code, 400, expired_preview.text)
        self.assertEqual(expired_preview.json()["detail"], "Срок действия кода истёк. Обратитесь к учителю или администратору школы за новым кодом.")

    def test_auth_sync_contract(self) -> None:
        code_a = self._request_code(self.phone)
        verify_a = self.client.post(
            "/api/v1/auth/phone/verify",
            json={
                "phone": self.phone,
                "code": code_a,
                "localUserId": "deviceA_local",
                "localPurchases": ["chemistry_pro_lab", "physics_core"],
                "localContentVersions": {"chemistry_core": "v2"},
                "localPreferences": {"theme": "ocean", "appMode": "standard"},
            },
        )
        self.assertEqual(verify_a.status_code, 200, verify_a.text)
        data_a = verify_a.json()
        user_id = data_a["userId"]
        access_a = data_a["accessToken"]
        refresh_a = data_a["refreshToken"]

        self.assertEqual(access_a.count("."), 2, "Access token must be JWT")

        me = self.client.get("/api/v1/auth/me", headers=self._auth(access_a))
        self.assertEqual(me.status_code, 200, me.text)
        me_json = me.json()
        self.assertEqual(me_json["userId"], user_id)
        self.assertEqual(me_json["role"], "student")
        self.assertEqual(me_json["activeRole"], "student")
        self.assertTrue(me_json["availableRoles"])
        self.assertIn("capabilities", me_json)

        profile = self.client.get("/api/v1/users/profile", headers=self._auth(access_a))
        self.assertEqual(profile.status_code, 200, profile.text)
        profile_json = profile.json()
        self.assertEqual(profile_json["userId"], user_id)
        self.assertEqual(profile_json["role"], "student")
        self.assertEqual(profile_json["activeRole"], "student")
        self.assertIn("availableRoles", profile_json)
        self.assertIn("schoolMemberships", profile_json)
        self.assertIn("classMemberships", profile_json)
        self.assertIn("subscriptions", profile_json)
        self.assertIn("grants", profile_json)
        self.assertIn("capabilities", profile_json)
        self.assertIn("featureFlags", profile_json)
        self.assertIn("quickActions", profile_json["roleData"])

        payment_create = self.client.post(
            "/api/v1/payments/create",
            json={
                "provider": "robokassa",
                "moduleId": "chemistry_pro_lab",
                "amountRub": 1490,
                "returnUrl": "https://allchemist.ru/return",
                "idempotencyKey": "idem-001",
            },
            headers=self._auth(access_a),
        )
        self.assertEqual(payment_create.status_code, 200, payment_create.text)
        payment_id = payment_create.json()["paymentId"]

        payment_create_repeat = self.client.post(
            "/api/v1/payments/create",
            json={
                "provider": "robokassa",
                "moduleId": "chemistry_pro_lab",
                "amountRub": 1490,
                "returnUrl": "https://allchemist.ru/return",
                "idempotencyKey": "idem-001",
            },
            headers=self._auth(access_a),
        )
        self.assertEqual(payment_create_repeat.status_code, 200, payment_create_repeat.text)
        self.assertEqual(payment_create_repeat.json()["paymentId"], payment_id)

        payment_status = self.client.get(f"/api/v1/payments/{payment_id}", headers=self._auth(access_a))
        self.assertEqual(payment_status.status_code, 200, payment_status.text)
        self.assertEqual(payment_status.json()["status"], "pending")

        payment_paid = self.client.post(
            f"/api/v1/payments/{payment_id}/simulate-success",
            headers=self._auth(access_a),
        )
        if payment_paid.status_code == 200:
            self.assertEqual(payment_paid.json()["status"], "paid")
        else:
            self.assertEqual(payment_paid.status_code, 403, payment_paid.text)
            paid_payload = {
                "paymentId": payment_id,
                "status": "paid",
                "amountRub": 1490,
                "moduleId": "chemistry_pro_lab",
                "eventId": "evt-paid-1",
                "payload": {},
            }
            paid_sign_payload = {
                "paymentId": payment_id,
                "status": "paid",
                "amountRub": 1490,
                "moduleId": "chemistry_pro_lab",
                "eventId": "evt-paid-1",
            }
            paid_signature = self._sign(settings.WEBHOOK_SECRET_ROBOKASSA, paid_sign_payload)
            paid_webhook = self.client.post(
                "/api/v1/payments/webhook/robokassa",
                json=paid_payload,
                headers={"X-Signature": paid_signature},
            )
            self.assertEqual(paid_webhook.status_code, 200, paid_webhook.text)
            self.assertEqual(paid_webhook.json()["status"], "paid")

        audit = self.client.get("/api/v1/payments/audit/log", headers=self._auth(access_a))
        self.assertEqual(audit.status_code, 200, audit.text)
        self.assertTrue(isinstance(audit.json(), list))

        webhook_payload = {
            "paymentId": payment_id,
            "status": "refunded",
            "amountRub": 1490,
            "moduleId": "chemistry_pro_lab",
            "eventId": "evt-1",
            "payload": {"failureReason": "user_request"},
        }
        sign_payload = {
            "paymentId": payment_id,
            "status": "refunded",
            "amountRub": 1490,
            "moduleId": "chemistry_pro_lab",
            "eventId": "evt-1",
            "failureReason": "user_request",
        }
        signature = self._sign(settings.WEBHOOK_SECRET_ROBOKASSA, sign_payload)
        webhook_res = self.client.post(
            "/api/v1/payments/webhook/robokassa",
            json=webhook_payload,
            headers={"X-Signature": signature},
        )
        self.assertEqual(webhook_res.status_code, 200, webhook_res.text)
        self.assertEqual(webhook_res.json()["status"], "refunded")

        no_auth_ent = self.client.get("/api/v1/users/entitlements", params={"userId": user_id})
        self.assertEqual(no_auth_ent.status_code, 401, no_auth_ent.text)

        ent = self.client.get(
            "/api/v1/users/entitlements",
            params={"userId": user_id},
            headers=self._auth(access_a),
        )
        self.assertEqual(ent.status_code, 200, ent.text)
        self.assertIn("chemistry_pro_lab", ent.json().get("modules", []))
        self.assertIn("physics_core", ent.json().get("modules", []))

        forbidden_ent = self.client.get(
            "/api/v1/users/entitlements",
            params={"userId": "another_user"},
            headers=self._auth(access_a),
        )
        self.assertEqual(forbidden_ent.status_code, 403, forbidden_ent.text)

        upload = self.client.post(
            "/api/v1/users/devices/sync",
            json={
                "userId": user_id,
                "contentVersions": {"chemistry_core": "v3", "physics_core": "v2"},
                "purchases": ["exam_pack"],
                "preferences": {"theme": "forest", "appMode": "exam"},
            },
            headers=self._auth(access_a),
        )
        self.assertEqual(upload.status_code, 200, upload.text)

        telemetry_forbidden = self.client.post(
            "/api/v1/telemetry/events",
            json={
                "events": [
                    {
                        "name": "test_event",
                        "userId": "bad_user",
                        "role": "student",
                        "payload": {"source": "contract-test"},
                    }
                ]
            },
            headers=self._auth(access_a),
        )
        self.assertEqual(telemetry_forbidden.status_code, 403, telemetry_forbidden.text)

        telemetry_ok = self.client.post(
            "/api/v1/telemetry/events",
            json={"events": [{"name": "test_event_ok", "payload": {"source": "contract-test"}}]},
            headers=self._auth(access_a),
        )
        self.assertEqual(telemetry_ok.status_code, 200, telemetry_ok.text)

        code_b = self._request_code(self.phone)
        verify_b = self.client.post(
            "/api/v1/auth/phone/verify",
            json={
                "phone": self.phone,
                "code": code_b,
                "localUserId": "deviceB_local",
                "localPurchases": ["biology_preview"],
                "localContentVersions": {"biology_core": "v1", "chemistry_core": "v4"},
                "localPreferences": {"theme": "midnight", "appMode": "standard"},
            },
        )
        self.assertEqual(verify_b.status_code, 200, verify_b.text)
        data_b = verify_b.json()
        self.assertEqual(data_b["userId"], user_id)

        merged = self.client.get(
            "/api/v1/users/devices/sync",
            params={"userId": user_id},
            headers=self._auth(data_b["accessToken"]),
        )
        self.assertEqual(merged.status_code, 200, merged.text)
        merged_json = merged.json()
        self.assertEqual(merged_json["contentVersions"].get("chemistry_core"), "v4")
        self.assertEqual(merged_json["contentVersions"].get("biology_core"), "v1")

        refresh = self.client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_a})
        self.assertEqual(refresh.status_code, 200, refresh.text)
        refresh_data = refresh.json()
        self.assertNotEqual(refresh_data["refreshToken"], refresh_a)

        logout = self.client.post("/api/v1/auth/logout", json={"refreshToken": refresh_data["refreshToken"]})
        self.assertEqual(logout.status_code, 200, logout.text)
        self.assertTrue(logout.json().get("ok"))

        refresh_after_logout = self.client.post(
            "/api/v1/auth/refresh",
            json={"refreshToken": refresh_data["refreshToken"]},
        )
        self.assertEqual(refresh_after_logout.status_code, 401, refresh_after_logout.text)

    def test_role_switch_allows_only_server_assigned_roles(self) -> None:
        code = self._request_code("+79000000077")
        verified = self.client.post(
            "/api/v1/auth/phone/verify",
            json={
                "phone": "+79000000077",
                "code": code,
                "localUserId": "multi_role_local",
                "localPurchases": [],
                "localContentVersions": {},
                "localPreferences": {},
            },
        )
        self.assertEqual(verified.status_code, 200, verified.text)
        user_id = verified.json()["userId"]
        access = verified.json()["accessToken"]
        state = store._read_state()
        state.setdefault("school_classes", {})["class_10f"] = {"title": "10Ф", "subject": "chemistry", "schoolId": "school_2070", "siteId": "site_2070_new_star"}
        state.setdefault("school_memberships", {})["class_10f"] = {user_id: {"role": "teacher", "schoolId": "school_2070", "siteId": "site_2070_new_star"}}
        store._write_state(state)

        switched = self.client.post("/api/v1/auth/role/switch", json={"role": "teacher"}, headers=self._auth(access))
        self.assertEqual(switched.status_code, 200, switched.text)
        self.assertEqual(switched.json()["activeRole"], "teacher")
        self.assertTrue(any(item["role"] == "student" for item in switched.json()["availableRoles"]))
        self.assertTrue(any(item["role"] == "teacher" for item in switched.json()["availableRoles"]))

        rejected = self.client.post("/api/v1/auth/role/switch", json={"role": "admin"}, headers=self._auth(access))
        self.assertEqual(rejected.status_code, 400, rejected.text)
        self.assertEqual(rejected.json()["detail"], "Этот режим работы не назначен вашему аккаунту")

    def test_forced_global_logout_revokes_access_and_refresh_sessions(self) -> None:
        code = self._request_code("+79000000444")
        verified = self.client.post(
            "/api/v1/auth/phone/verify",
            json={
                "phone": "+79000000444",
                "code": code,
                "localUserId": "forced_logout_local",
                "localPurchases": [],
                "localContentVersions": {},
                "localPreferences": {},
            },
        )
        self.assertEqual(verified.status_code, 200, verified.text)
        access = verified.json()["accessToken"]
        refresh = verified.json()["refreshToken"]

        before = self.client.get("/api/v1/auth/me", headers=self._auth(access))
        self.assertEqual(before.status_code, 200, before.text)

        revoked = store.revoke_all_sessions(changed_by="test_ops", reason="maintenance window")
        self.assertTrue(revoked["ok"])
        self.assertGreaterEqual(revoked["revokedCount"], 1)

        after_access = self.client.get("/api/v1/auth/me", headers=self._auth(access))
        self.assertEqual(after_access.status_code, 401, after_access.text)
        self.assertEqual(after_access.json()["detail"], "Session revoked")

        after_refresh = self.client.post("/api/v1/auth/refresh", json={"refreshToken": refresh})
        self.assertEqual(after_refresh.status_code, 401, after_refresh.text)
        self.assertEqual(after_refresh.json()["detail"], "Session revoked")

        state = store._read_state()
        self.assertTrue(any(item.get("action") == "global_session_revoke_all" for item in state.get("auth_audit", [])))
        self.assertEqual(state.get("session_revocations", [])[-1]["reason"], "maintenance window")

    def test_security_rate_limits_device_binding_and_data_rights(self) -> None:
        invite = create_school_invite_code(
            class_id="class_10s",
            school_id="school_2070",
            site_id="site_2070_new_star",
            role="student",
            title="10С",
            subject="chemistry",
            expires_at=None,
            max_activations=1,
            teacher_user_id=None,
            student_label="Security",
            changed_by="test_admin",
        )
        activated = self.client.post(
            "/api/v1/auth/invite/activate",
            json={
                "code": invite["code"],
                "phone": "+79000000910",
                "displayName": "Security User",
                "login": "secure_10s",
                "password": "SecurePass1",
                "passwordConfirm": "SecurePass1",
            },
        )
        self.assertEqual(activated.status_code, 200, activated.text)
        user_id = activated.json()["userId"]
        access = activated.json()["accessToken"]

        for _ in range(5):
            bad = self.client.post("/api/v1/auth/login", json={"login": "secure_10s", "password": "wrong"})
            self.assertEqual(bad.status_code, 400, bad.text)
        locked = self.client.post("/api/v1/auth/login", json={"login": "secure_10s", "password": "SecurePass1"})
        self.assertEqual(locked.status_code, 400, locked.text)
        self.assertEqual(locked.json()["detail"], "Слишком много попыток. Попробуйте позже.")

        register = self.client.post(
            "/api/v1/users/devices/register",
            json={"deviceId": "device-sec-1", "label": "Основной телефон", "platform": "android"},
            headers=self._auth(access),
        )
        self.assertEqual(register.status_code, 200, register.text)
        state_after_register = store._read_state()
        self.assertTrue(any(row.get("deviceId") == "device-sec-1" for row in state_after_register.get("sessions", {}).values()))

        export = self.client.get("/api/v1/users/export", headers=self._auth(access))
        self.assertEqual(export.status_code, 200, export.text)
        self.assertEqual(export.json()["userId"], user_id)
        self.assertIn("profile", export.json())
        self.assertNotIn("passwordHash", export.json()["profile"])
        self.assertTrue(export.json().get("devices"))

        delete_bad = self.client.post("/api/v1/users/delete", json={"confirmation": "NO"}, headers=self._auth(access))
        self.assertEqual(delete_bad.status_code, 400, delete_bad.text)

        deleted = self.client.post("/api/v1/users/delete", json={"confirmation": "DELETE"}, headers=self._auth(access))
        self.assertEqual(deleted.status_code, 200, deleted.text)
        self.assertTrue(deleted.json()["ok"])
        state_after_delete = store._read_state()
        self.assertTrue(state_after_delete["users"][user_id]["deleted"])
        self.assertNotIn("secure_10s", state_after_delete.get("logins", {}))

        profile_after_delete = self.client.get("/api/v1/users/profile", headers=self._auth(access))
        self.assertEqual(profile_after_delete.status_code, 401, profile_after_delete.text)


if __name__ == "__main__":
    unittest.main()
