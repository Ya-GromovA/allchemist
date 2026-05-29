import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import user_state_store as store


class AdminPanelTest(unittest.TestCase):
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

    def _login_and_set_role(self, role: str, phone: str) -> tuple[str, str]:
        req = self.client.post("/api/v1/auth/phone/request-code", json={"phone": phone})
        code = req.json()["debugCode"]
        verify = self.client.post("/api/v1/auth/phone/verify", json={"phone": phone, "code": code})
        user_id = verify.json()["userId"]

        consent = self.client.post(
            "/api/v1/users/consents/accept",
            json={"userId": user_id, "role": role, "version": "2026-02-22", "parentApproved": True},
        )
        self.assertEqual(consent.status_code, 200, consent.text)

        req2 = self.client.post("/api/v1/auth/phone/request-code", json={"phone": phone})
        code2 = req2.json()["debugCode"]
        verify2 = self.client.post("/api/v1/auth/phone/verify", json={"phone": phone, "code": code2})
        self.assertEqual(verify2.status_code, 200, verify2.text)
        return user_id, verify2.json()["accessToken"]

    def _bootstrap_owner(self, user_id: str) -> None:
        res = self.client.post(
            "/api/v1/admin/bootstrap-owner",
            json={"userId": user_id, "secret": settings.ADMIN_BOOTSTRAP_SECRET},
        )
        self.assertEqual(res.status_code, 200, res.text)

    def test_admin_panel_permissions_and_updates(self) -> None:
        owner_user, _ = self._login_and_set_role("student", "+79991110001")
        self._bootstrap_owner(owner_user)
        _, owner_token = self._login_and_set_role("student", "+79991110001")
        target_user, _ = self._login_and_set_role("student", "+79991110002")

        users = self.client.get("/api/v1/admin/users?limit=50", headers=self._auth(owner_token))
        self.assertEqual(users.status_code, 200, users.text)
        self.assertTrue(any(u.get("userId") == target_user for u in users.json()))
        self.assertIn("plans", users.json()[0])
        self.assertIn("modules", users.json()[0])

        options = self.client.get("/api/v1/admin/options", headers=self._auth(owner_token))
        self.assertEqual(options.status_code, 200, options.text)
        self.assertIn("plans", options.json())
        self.assertIn("modules", options.json())
        self.assertIn("roles", options.json())
        self.assertIn("scopes", options.json())
        self.assertIn("roleOptions", options.json())
        self.assertIn("scopeOptions", options.json())
        self.assertIn("accessSourceOptions", options.json())
        self.assertIn("schools", options.json())

        create_manual = self.client.post(
            "/api/v1/admin/users/create",
            json={"phone": "+79991110077", "role": "teacher", "plan": "pro", "moduleId": "chemistry_pro_lab"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(create_manual.status_code, 200, create_manual.text)
        self.assertEqual(create_manual.json()["role"], "teacher")

        set_role = self.client.post(
            "/api/v1/admin/users/role",
            json={"userId": target_user, "role": "teacher"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(set_role.status_code, 200, set_role.text)
        self.assertEqual(set_role.json()["role"], "teacher")

        school_overview = self.client.get("/api/v1/admin/schools/overview", headers=self._auth(owner_token))
        self.assertEqual(school_overview.status_code, 200, school_overview.text)
        self.assertGreaterEqual(len(school_overview.json().get("items", [])), 1)

        create_school = self.client.post(
            "/api/v1/admin/schools",
            json={"title": "Лицей Тест", "organizationTitle": "Лицей Тест", "siteTitle": "Главный корпус"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(create_school.status_code, 200, create_school.text)
        self.assertEqual(create_school.json().get("schoolTitle"), "Лицей Тест")

        school_options = self.client.get("/api/v1/admin/options", headers=self._auth(owner_token))
        self.assertEqual(school_options.status_code, 200, school_options.text)
        self.assertTrue(any(item.get("label", "").startswith("Лицей Тест") for item in school_options.json().get("schoolOptions", [])))

        partner_access = self.client.post(
            "/api/v1/admin/access/grant",
            json={"userId": target_user, "sourceType": "partner_license", "schoolId": "school_2070"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(partner_access.status_code, 200, partner_access.text)
        self.assertEqual(partner_access.json().get("sourceLabelRu"), "Партнёрская школьная лицензия")

        access_list = self.client.get(f"/api/v1/admin/users/{target_user}/access", headers=self._auth(owner_token))
        self.assertEqual(access_list.status_code, 200, access_list.text)
        self.assertGreaterEqual(len(access_list.json().get("items", [])), 1)

        set_scope = self.client.post(
            "/api/v1/admin/rights/scopes",
            json={"role": "teacher", "scope": "payments:admin", "allow": True},
            headers=self._auth(owner_token),
        )
        self.assertEqual(set_scope.status_code, 200, set_scope.text)

        matrix = self.client.get("/api/v1/admin/rights/matrix", headers=self._auth(owner_token))
        self.assertEqual(matrix.status_code, 200, matrix.text)
        self.assertIn("matrix", matrix.json())
        self.assertTrue(any(row.get("scope") == "payments:admin" for row in matrix.json().get("matrix", [])))

        pass_login = self.client.post(
            "/api/v1/admin/auth/login-password",
            json={"login": "admin", "password": "admin123"},
        )
        self.assertEqual(pass_login.status_code, 200, pass_login.text)
        self.assertIn("accessToken", pass_login.json())

        pass_login_bad = self.client.post(
            "/api/v1/admin/auth/login-password",
            json={"login": "admin", "password": "wrong"},
        )
        self.assertEqual(pass_login_bad.status_code, 400, pass_login_bad.text)

        security = self.client.get("/api/v1/admin/security/checklist", headers=self._auth(owner_token))
        self.assertEqual(security.status_code, 200, security.text)
        self.assertIn("checks", security.json())
        self.assertGreaterEqual(security.json().get("totalChecks", 0), 22)
        self.assertIn("alertCount", security.json())
        self.assertIn("alerts", security.json())
        check_names = {c.get("name") for c in security.json().get("checks", [])}
        self.assertIn("Mobile onboarding route wiring", check_names)
        self.assertIn("Mobile APK demo readiness", check_names)
        self.assertIn("Mobile onboarding smoke evidence", check_names)
        self.assertIn("Mobile onboarding smoke SLA (<=7d)", check_names)
        self.assertIn("Content ingestion packs availability", check_names)
        self.assertIn("Content ingestion JSON validity", check_names)
        self.assertIn("Content seed token configured", check_names)

        actions = self.client.get("/api/v1/admin/security/actions", headers=self._auth(owner_token))
        self.assertEqual(actions.status_code, 200, actions.text)
        self.assertIn("actions", actions.json())
        self.assertGreaterEqual(actions.json().get("totalActions", 0), 11)
        self.assertIn("owner", actions.json().get("actions", [{}])[0])
        self.assertIn("sla", actions.json().get("actions", [{}])[0])
        action_titles = {a.get("title") for a in actions.json().get("actions", [])}
        self.assertIn("Mobile onboarding smoke", action_titles)
        self.assertIn("APK demo preflight/build", action_titles)
        self.assertIn("Content ingestion import run", action_titles)

        alerts = self.client.get("/api/v1/admin/security/alerts", headers=self._auth(owner_token))
        self.assertEqual(alerts.status_code, 200, alerts.text)
        self.assertIn("alerts", alerts.json())

        mobile_readiness = self.client.get("/api/v1/admin/security/mobile-readiness", headers=self._auth(owner_token))
        self.assertEqual(mobile_readiness.status_code, 200, mobile_readiness.text)
        self.assertIn("level", mobile_readiness.json())
        self.assertIn("smoke", mobile_readiness.json())
        self.assertIn("smokeSla", mobile_readiness.json())

        mobile_smoke_set = self.client.post(
            "/api/v1/admin/security/mobile-onboarding/smoke",
            json={"status": "ok", "notes": "manual device smoke"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(mobile_smoke_set.status_code, 200, mobile_smoke_set.text)
        self.assertEqual(mobile_smoke_set.json().get("status"), "ok")

        mobile_smoke_bad = self.client.post(
            "/api/v1/admin/security/mobile-onboarding/smoke",
            json={"status": "unsupported"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(mobile_smoke_bad.status_code, 400, mobile_smoke_bad.text)

        content_ingestion = self.client.get("/api/v1/admin/security/content-ingestion", headers=self._auth(owner_token))
        self.assertEqual(content_ingestion.status_code, 200, content_ingestion.text)
        self.assertIn("level", content_ingestion.json())
        self.assertIn("packFiles", content_ingestion.json())

        go_no_go = self.client.get("/api/v1/admin/security/go-no-go", headers=self._auth(owner_token))
        self.assertEqual(go_no_go.status_code, 200, go_no_go.text)
        self.assertIn("status", go_no_go.json())
        self.assertIn("gates", go_no_go.json())
        self.assertIn("passedGates", go_no_go.json())
        self.assertIn("nextActions", go_no_go.json())
        self.assertIn("evidence", go_no_go.json())

        go_no_go_history = self.client.get("/api/v1/admin/security/go-no-go/history?limit=5", headers=self._auth(owner_token))
        self.assertEqual(go_no_go_history.status_code, 200, go_no_go_history.text)
        self.assertIn("history", go_no_go_history.json())

        handover_archive_save = self.client.post(
            "/api/v1/admin/security/handover/archive",
            json={
                "time": "2026-02-25T12:45",
                "outgoing": "Петров П.П.",
                "incoming": "Иванова И.И.",
                "incidents": "High alert reviewed",
                "comment": "Проверить mobile smoke",
            },
            headers=self._auth(owner_token),
        )
        self.assertEqual(handover_archive_save.status_code, 200, handover_archive_save.text)
        self.assertTrue(handover_archive_save.json().get("saved"))

        handover_archive_list = self.client.get("/api/v1/admin/security/handover/archive?limit=5", headers=self._auth(owner_token))
        self.assertEqual(handover_archive_list.status_code, 200, handover_archive_list.text)
        self.assertGreaterEqual(handover_archive_list.json().get("total", 0), 1)

        handover_archive_csv = self.client.get("/api/v1/admin/security/handover/archive.csv?limit=5", headers=self._auth(owner_token))
        self.assertEqual(handover_archive_csv.status_code, 200, handover_archive_csv.text)
        self.assertIn("text/csv", handover_archive_csv.headers.get("content-type", ""))
        self.assertIn("archivedAt,changedBy,time,outgoing,incoming,incidents,comment", handover_archive_csv.text)

        alerts_unacked = self.client.get(
            "/api/v1/admin/security/alerts?acked=unacked&severity=high",
            headers=self._auth(owner_token),
        )
        self.assertEqual(alerts_unacked.status_code, 200, alerts_unacked.text)
        self.assertEqual(alerts_unacked.json().get("acked"), "unacked")
        self.assertEqual(alerts_unacked.json().get("severity"), "high")

        alerts_bad_filter = self.client.get(
            "/api/v1/admin/security/alerts?acked=oops",
            headers=self._auth(owner_token),
        )
        self.assertEqual(alerts_bad_filter.status_code, 400, alerts_bad_filter.text)

        dry_run_status = self.client.get("/api/v1/admin/security/backup-dry-run", headers=self._auth(owner_token))
        self.assertEqual(dry_run_status.status_code, 200, dry_run_status.text)
        self.assertIn("status", dry_run_status.json())

        dry_run_run = self.client.post("/api/v1/admin/security/backup-dry-run/run", headers=self._auth(owner_token))
        self.assertEqual(dry_run_run.status_code, 200, dry_run_run.text)
        self.assertIn("checks", dry_run_run.json())
        self.assertIn("evidence", dry_run_run.json())

        dry_run_history = self.client.get("/api/v1/admin/security/backup-dry-run/history?limit=5", headers=self._auth(owner_token))
        self.assertEqual(dry_run_history.status_code, 200, dry_run_history.text)
        self.assertIn("history", dry_run_history.json())
        self.assertGreaterEqual(dry_run_history.json().get("totalRuns", 0), 1)
        self.assertIn("okRuns", dry_run_history.json())
        self.assertIn("failedRuns", dry_run_history.json())
        self.assertIn("successRate", dry_run_history.json())

        dry_run_history_ranged = self.client.get(
            "/api/v1/admin/security/backup-dry-run/history?limit=5&fromDate=2000-01-01T00:00:00&toDate=2100-01-01T00:00:00",
            headers=self._auth(owner_token),
        )
        self.assertEqual(dry_run_history_ranged.status_code, 200, dry_run_history_ranged.text)
        self.assertIn("fromDate", dry_run_history_ranged.json())
        self.assertIn("toDate", dry_run_history_ranged.json())

        dry_run_history_bad_range = self.client.get(
            "/api/v1/admin/security/backup-dry-run/history?limit=5&fromDate=wrong-date",
            headers=self._auth(owner_token),
        )
        self.assertEqual(dry_run_history_bad_range.status_code, 400, dry_run_history_bad_range.text)

        alerts_after_run = self.client.get("/api/v1/admin/security/alerts", headers=self._auth(owner_token))
        self.assertEqual(alerts_after_run.status_code, 200, alerts_after_run.text)
        alert_rows = alerts_after_run.json().get("alerts", [])
        if alert_rows:
            first_code = alert_rows[0].get("code")
            ack_res = self.client.post(
                "/api/v1/admin/security/alerts/ack",
                json={"code": first_code, "acknowledged": True, "comment": "reviewed"},
                headers=self._auth(owner_token),
            )
            self.assertEqual(ack_res.status_code, 200, ack_res.text)
            self.assertTrue(ack_res.json().get("acknowledged"))

            alerts_ack = self.client.get("/api/v1/admin/security/alerts", headers=self._auth(owner_token))
            self.assertEqual(alerts_ack.status_code, 200, alerts_ack.text)
            matched = [a for a in alerts_ack.json().get("alerts", []) if a.get("code") == first_code]
            if matched:
                self.assertTrue(matched[0].get("acknowledged"))

        ack_bad = self.client.post(
            "/api/v1/admin/security/alerts/ack",
            json={"code": "not-existing-alert", "acknowledged": True},
            headers=self._auth(owner_token),
        )
        self.assertEqual(ack_bad.status_code, 400, ack_bad.text)

        security_export_json = self.client.get("/api/v1/admin/security/export.json?limit=5", headers=self._auth(owner_token))
        self.assertEqual(security_export_json.status_code, 200, security_export_json.text)
        self.assertIn("checklist", security_export_json.json())
        self.assertIn("actions", security_export_json.json())
        self.assertIn("dryRunHistory", security_export_json.json())
        self.assertIn("mobileReadiness", security_export_json.json())
        self.assertIn("mobileSmoke", security_export_json.json())
        self.assertIn("contentIngestion", security_export_json.json())
        self.assertIn("goNoGo", security_export_json.json())

        security_export_alerts_json = self.client.get(
            "/api/v1/admin/security/export.json?limit=5&mode=alerts",
            headers=self._auth(owner_token),
        )
        self.assertEqual(security_export_alerts_json.status_code, 200, security_export_alerts_json.text)
        self.assertEqual(security_export_alerts_json.json().get("mode"), "alerts")

        security_export_ranged_json = self.client.get(
            "/api/v1/admin/security/export.json?limit=5&mode=all&fromDate=2000-01-01T00:00:00&toDate=2100-01-01T00:00:00",
            headers=self._auth(owner_token),
        )
        self.assertEqual(security_export_ranged_json.status_code, 200, security_export_ranged_json.text)
        self.assertIn("fromDate", security_export_ranged_json.json())
        self.assertIn("toDate", security_export_ranged_json.json())

        security_export_csv = self.client.get("/api/v1/admin/security/export.csv?limit=5", headers=self._auth(owner_token))
        self.assertEqual(security_export_csv.status_code, 200, security_export_csv.text)
        self.assertIn("text/csv", security_export_csv.headers.get("content-type", ""))
        self.assertIn("section,name,status", security_export_csv.text)
        self.assertIn("mobile_smoke", security_export_csv.text)
        self.assertIn("content_ingestion", security_export_csv.text)
        self.assertIn("go_no_go", security_export_csv.text)

        security_export_bad_mode = self.client.get(
            "/api/v1/admin/security/export.json?limit=5&mode=unsupported",
            headers=self._auth(owner_token),
        )
        self.assertEqual(security_export_bad_mode.status_code, 400, security_export_bad_mode.text)

        security_export_bad_range = self.client.get(
            "/api/v1/admin/security/export.csv?limit=5&mode=all&fromDate=bad-date",
            headers=self._auth(owner_token),
        )
        self.assertEqual(security_export_bad_range.status_code, 400, security_export_bad_range.text)

        grant = self.client.post(
            "/api/v1/admin/subscriptions/grant",
            json={"userId": target_user, "plan": "pro", "moduleId": "physics_ultra"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(grant.status_code, 200, grant.text)
        self.assertIn("pro", grant.json()["plans"])

        revoke = self.client.post(
            "/api/v1/admin/subscriptions/revoke",
            json={"userId": target_user, "moduleId": "physics_ultra"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(revoke.status_code, 200, revoke.text)
        self.assertNotIn("physics_ultra", revoke.json()["modules"])

        bulk_preview = self.client.post(
            "/api/v1/admin/subscriptions/bulk",
            json={
                "action": "grant",
                "query": "+799911100",
                "role": "teacher",
                "plan": "pro_bulk",
                "moduleId": "bulk_module",
                "dryRun": True,
                "limit": 50,
            },
            headers=self._auth(owner_token),
        )
        self.assertEqual(bulk_preview.status_code, 200, bulk_preview.text)
        self.assertTrue(bulk_preview.json()["dryRun"])
        self.assertGreaterEqual(bulk_preview.json()["selectedCount"], 1)

        bulk_apply = self.client.post(
            "/api/v1/admin/subscriptions/bulk",
            json={
                "action": "grant",
                "query": "+799911100",
                "role": "teacher",
                "plan": "pro_bulk",
                "moduleId": "bulk_module",
                "dryRun": False,
                "limit": 50,
            },
            headers=self._auth(owner_token),
        )
        self.assertEqual(bulk_apply.status_code, 200, bulk_apply.text)
        self.assertGreaterEqual(bulk_apply.json()["changedCount"], 1)
        self.assertEqual(bulk_apply.json()["action"], "grant")

        kpi = self.client.get("/api/v1/admin/subscriptions/kpi", headers=self._auth(owner_token))
        self.assertEqual(kpi.status_code, 200, kpi.text)
        self.assertIn("users", kpi.json())
        self.assertIn("topPlans", kpi.json())
        self.assertIn("topModules", kpi.json())

        audit = self.client.get("/api/v1/admin/audit?limit=20", headers=self._auth(owner_token))
        self.assertEqual(audit.status_code, 200, audit.text)
        self.assertTrue(len(audit.json()) >= 1)
        self.assertIn("action", audit.json()[-1])

        filtered_audit = self.client.get(
            "/api/v1/admin/audit?limit=20&action=bulk_grant_subscription",
            headers=self._auth(owner_token),
        )
        self.assertEqual(filtered_audit.status_code, 200, filtered_audit.text)
        self.assertTrue(any("bulk_grant_subscription" in row.get("action", "") for row in filtered_audit.json()))

        offset_audit = self.client.get(
            "/api/v1/admin/audit?limit=1&offset=1",
            headers=self._auth(owner_token),
        )
        self.assertEqual(offset_audit.status_code, 200, offset_audit.text)
        self.assertLessEqual(len(offset_audit.json()), 1)

        audit_csv = self.client.get(
            "/api/v1/admin/audit/export.csv?limit=100&action=bulk_grant_subscription",
            headers=self._auth(owner_token),
        )
        self.assertEqual(audit_csv.status_code, 200, audit_csv.text)
        self.assertIn("text/csv", audit_csv.headers.get("content-type", ""))
        self.assertIn("bulk_grant_subscription", audit_csv.text)

        overview = self.client.get("/api/v1/admin/database/overview", headers=self._auth(owner_token))
        self.assertEqual(overview.status_code, 200, overview.text)
        self.assertIn("state", overview.json())

    def test_only_owner_can_assign_owner_role(self) -> None:
        owner_user, _ = self._login_and_set_role("student", "+79991110003")
        self._bootstrap_owner(owner_user)
        _, owner_token = self._login_and_set_role("student", "+79991110003")

        admin_user, _ = self._login_and_set_role("student", "+79991110004")
        to_admin = self.client.post(
            "/api/v1/admin/users/role",
            json={"userId": admin_user, "role": "admin"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(to_admin.status_code, 200, to_admin.text)
        _, admin_token = self._login_and_set_role("student", "+79991110004")

        target_user, _ = self._login_and_set_role("student", "+79991110005")

        forbidden = self.client.post(
            "/api/v1/admin/users/role",
            json={"userId": target_user, "role": "owner"},
            headers=self._auth(admin_token),
        )
        self.assertEqual(forbidden.status_code, 403, forbidden.text)

    def test_school_admin_cannot_change_global_admin_settings(self) -> None:
        owner_user, _ = self._login_and_set_role("student", "+79991110006")
        self._bootstrap_owner(owner_user)
        _, owner_token = self._login_and_set_role("student", "+79991110006")

        school_admin_user, _ = self._login_and_set_role("student", "+79991110007")
        to_school_admin = self.client.post(
            "/api/v1/admin/users/role",
            json={"userId": school_admin_user, "role": "school_admin"},
            headers=self._auth(owner_token),
        )
        self.assertEqual(to_school_admin.status_code, 200, to_school_admin.text)
        _, school_admin_token = self._login_and_set_role("student", "+79991110007")

        panel = self.client.get("/api/v1/admin/users?limit=1", headers=self._auth(school_admin_token))
        self.assertEqual(panel.status_code, 200, panel.text)

        create_school = self.client.post(
            "/api/v1/admin/schools",
            json={"title": "Tenant Escape School", "organizationTitle": "Tenant Escape", "siteTitle": "Main"},
            headers=self._auth(school_admin_token),
        )
        self.assertEqual(create_school.status_code, 403, create_school.text)

        set_scope = self.client.post(
            "/api/v1/admin/rights/scopes",
            json={"role": "teacher", "scope": "admin:panel", "allow": True},
            headers=self._auth(school_admin_token),
        )
        self.assertEqual(set_scope.status_code, 403, set_scope.text)

    def test_admin_web_stage8_markers(self) -> None:
        page = self.client.get("/api/v1/admin/web")
        self.assertEqual(page.status_code, 200, page.text)
        self.assertIn("Границы полномочий", page.text)
        self.assertIn("Редакционный маршрут без автопубликации", page.text)
        self.assertIn("Очереди workflow и дедупликация", page.text)
        self.assertIn("Чеклист перед выдачей лицензии", page.text)
        self.assertIn("Сценарии со скриншотами", page.text)

        styles = self.client.get("/api/v1/admin/web/assets/styles.css")
        self.assertEqual(styles.status_code, 200, styles.text)
        self.assertIn(".adminGuardRail", styles.text)
        self.assertIn(".operationFlow", styles.text)
        self.assertIn(".contentQueuePanel", styles.text)
        self.assertIn(".licenseChecklist", styles.text)
        self.assertIn(".screenshotGuide", styles.text)


if __name__ == "__main__":
    unittest.main()
