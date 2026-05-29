import tempfile
import subprocess
import unittest
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.api.v1.endpoints import content_readonly
from app.services import user_state_store as store


class PublicWebAppTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp_dir = tempfile.TemporaryDirectory()
        self._original_state_path = store.STATE_PATH
        self._original_packs_dir = content_readonly.PACKS_DIR
        store.STATE_PATH = Path(self._tmp_dir.name) / "user_state.json"
        self.client = TestClient(app)

    def tearDown(self) -> None:
        store.STATE_PATH = self._original_state_path
        content_readonly.PACKS_DIR = self._original_packs_dir
        self._tmp_dir.cleanup()

    def test_public_web_user_shell_assets(self) -> None:
        index = self.client.get("/api/v1/web")
        self.assertEqual(index.status_code, 200, index.text)
        self.assertIn("Полноценный вход в веб-кабинет", index.text)
        self.assertIn('id="authPanel"', index.text)
        self.assertIn('id="appShell"', index.text)
        self.assertIn('id="authSectionTitle"', index.text)
        self.assertIn('class="workspaceTopbar"', index.text)
        self.assertIn('id="workspaceTitle"', index.text)
        self.assertIn('id="workspaceApkLink"', index.text)
        self.assertIn('id="requestCodeBtn"', index.text)
        self.assertIn('id="verifyCodeBtn"', index.text)
        self.assertIn('id="paymentPlans"', index.text)
        self.assertIn("/api/v1/web/assets/app.js", index.text)

        js = self.client.get("/api/v1/web/assets/app.js")
        self.assertEqual(js.status_code, 200, js.text)
        self.assertIn("auth/phone/request-code", js.text)
        self.assertIn("auth/phone/verify", js.text)
        self.assertIn("users/profile", js.text)
        self.assertIn("cabinet/teacher/overview", js.text)
        self.assertIn("cabinet/parent/overview", js.text)
        self.assertIn("cabinet/live/join", js.text)
        self.assertIn("canShowStudentLive", js.text)
        self.assertIn("canShowTeacherLiveLaunch", js.text)
        self.assertIn("Подключите школу или класс", js.text)
        self.assertNotIn("Live-демо", js.text)
        self.assertNotIn("Web live-урок", js.text)
        self.assertIn("payments/create", js.text)
        self.assertIn("allchemist_web_session_v1", js.text)
        self.assertIn("workspaceHeaderCopy", js.text)
        self.assertIn("Режим работы", js.text)
        self.assertIn("Учебная сводка", js.text)
        self.assertIn("Кабинет родителя", js.text)
        self.assertIn("Кабинет учителя", js.text)
        self.assertIn("MODULE_LEARNING_FLOW", js.text)
        self.assertIn("Маршрут урока", js.text)
        self.assertIn("1. Теория", js.text)
        self.assertIn("2. Практика", js.text)
        self.assertIn("3. ${escapeHtml(labCopy[0])}", js.text)
        self.assertIn("4. Тест и экзамены", js.text)
        self.assertIn("5. AI-разбор", js.text)
        self.assertIn("Виртуальный микроскоп", js.text)
        self.assertIn("PERIODIC_ELEMENTS", js.text)
        self.assertIn("Интерактивная таблица элементов", js.text)
        self.assertIn("data-element-count=\"${PERIODIC_ELEMENTS.length}\"", js.text)
        self.assertIn("verified_by: Allchemist content QA baseline", js.text)
        self.assertIn("safePersonName", js.text)
        self.assertNotIn("Технический ID", js.text)
        self.assertNotIn("Показать технические детали", js.text)
        self.assertNotIn("renderTechnicalDetails", js.text)

        css = self.client.get("/api/v1/web/assets/styles.css")
        self.assertEqual(css.status_code, 200, css.text)
        self.assertIn(".authGrid", css.text)
        self.assertIn(".roleWorkspaceGrid", css.text)
        self.assertIn(".planCard", css.text)
        self.assertIn(".workspaceTopbar", css.text)
        self.assertIn(".dashboardStats", css.text)
        self.assertIn(".actionCard", css.text)
        self.assertIn(".learningFlow", css.text)
        self.assertIn(".learningFlowStep", css.text)
        self.assertIn(".periodicTablePanel", css.text)
        self.assertIn(".periodicGrid", css.text)
        self.assertIn(".periodicDetail", css.text)

    def test_public_web_periodic_table_has_118_elements(self) -> None:
        app_js = Path(__file__).resolve().parents[1] / "app" / "web_public" / "app.js"
        js_text = app_js.read_text(encoding="utf-8")
        node_preamble = r'''
global.window = { addEventListener() {} };
global.document = { getElementById() { return null; }, querySelectorAll() { return []; } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.navigator = { clipboard: { writeText() { return Promise.resolve(); } } };
global.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => "" });
'''
        js_test = r'''
if (PERIODIC_ELEMENTS.length !== 118) throw new Error(`periodic element count: ${PERIODIC_ELEMENTS.length}`);
const first = PERIODIC_ELEMENTS[0];
const last = PERIODIC_ELEMENTS[117];
if (first.symbol !== "H" || first.nameRu !== "Водород") throw new Error("first element mismatch");
if (last.symbol !== "Og" || last.nameRu !== "Оганесон") throw new Error("last element mismatch");
state.activeModule = "chemistry";
state.selectedElementSymbol = "Fe";
const html = renderPeriodicTable();
if (!html.includes('data-element-count="118"')) throw new Error("missing rendered count");
if (!html.includes("Железо")) throw new Error("missing selected element detail");
if (!html.includes("Изучение")) throw new Error("missing study mode");
if (!html.includes("Запоминание")) throw new Error("missing memory mode");
'''
        result = subprocess.run(
            ["node"],
            input=node_preamble + js_text + js_test,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_public_web_live_visibility_rules(self) -> None:
        app_js = Path(__file__).resolve().parents[1] / "app" / "web_public" / "app.js"
        js_test = app_js.read_text() + r'''

function assertRule(condition, message) {
  if (!condition) throw new Error(message);
}

function resetForRole(role, accessItems, classAssignments, modules, plans) {
  state.role = role;
  state.access = { items: accessItems || [] };
  state.profile = {
    modules: modules || [],
    plans: plans || [],
    roleData: { classAssignments: classAssignments || [] },
  };
}

resetForRole("student", [], [{ classroom: "8А" }], [], []);
assertRule(!canShowStudentLive({ id: "live-1" }), "student without school access must not see live join");

resetForRole("student", [{ schoolId: "school-2070" }], [], [], []);
assertRule(!canShowStudentLive({ id: "live-1" }), "student without class assignment must not see live join");

resetForRole("student", [{ schoolId: "school-2070" }], [{ classroom: "8А" }], [], []);
assertRule(!canShowStudentLive(null), "student without active live must not see live join");
assertRule(canShowStudentLive({ id: "live-1" }), "student with school, class and active live must see live join");

resetForRole("parent", [{ schoolId: "school-2070" }], [{ classroom: "8А" }], [], []);
assertRule(!canShowStudentLive({ id: "live-1" }), "parent must not see student live join");
assertRule(!canShowTeacherLiveLaunch(), "parent must not see teacher live launch");

resetForRole("homeroom_teacher", [{ schoolId: "school-2070" }], [{ classroom: "8А" }], [], []);
assertRule(!canShowTeacherLiveLaunch(), "homeroom teacher must not see teacher live launch");

resetForRole("teacher", [{ schoolId: "school-2070" }], [], [], []);
assertRule(!canShowTeacherLiveLaunch(), "teacher without class assignment must not see live launch");

resetForRole("teacher", [{ schoolId: "school-2070" }], [{ classroom: "8А" }], [], []);
assertRule(canShowTeacherLiveLaunch(), "teacher with school and class must see live launch");
'''
        node_preamble = r'''
global.window = { addEventListener() {} };
global.document = {
  getElementById() { return null; },
  querySelectorAll() { return []; },
};
global.localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
};
global.navigator = { clipboard: { writeText() { return Promise.resolve(); } } };
global.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => "" });
'''
        result = subprocess.run(
            ["node"],
            input=node_preamble + js_test,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_apk_latest_download_uses_metadata_file(self) -> None:
        packs_dir = Path(self._tmp_dir.name) / "content_packs"
        packs_dir.mkdir()
        content_readonly.PACKS_DIR = str(packs_dir)
        old_apk = packs_dir / "allchemist-old-late-copy.apk"
        latest_apk = packs_dir / "allchemist-release-test-v9.apk"
        old_apk.write_bytes(b"old-apk")
        latest_apk.write_bytes(b"new-apk-version")
        metadata = {
            "versionName": "9.0.0",
            "versionCode": 90,
            "releaseTitle": "Проверочная версия",
            "apkFile": latest_apk.name,
            "releaseNotes": ["Проверка актуальной версии в вебе"],
        }
        (packs_dir / "allchemist-apk-latest.json").write_text(json.dumps(metadata), encoding="utf-8")

        head = self.client.head("/api/v1/content/downloads/apk/latest")
        self.assertEqual(head.status_code, 200, head.text)
        self.assertIn(latest_apk.name, head.headers.get("content-disposition", ""))
        self.assertEqual(head.headers.get("content-length"), str(latest_apk.stat().st_size))

        meta = self.client.get("/api/v1/content/downloads/apk/latest/metadata")
        self.assertEqual(meta.status_code, 200, meta.text)
        self.assertEqual(meta.json()["fileName"], latest_apk.name)
        self.assertEqual(meta.json()["versionName"], "9.0.0")
        self.assertEqual(meta.json()["downloadUrl"], "/api/v1/content/downloads/apk/latest")
        self.assertEqual(meta.json()["localDownloadUrl"], "/api/v1/content/downloads/apk/latest")
        self.assertIsNone(meta.json()["cdnDownloadUrl"])

        download = self.client.get("/api/v1/content/downloads/apk/latest")
        self.assertEqual(download.status_code, 200, download.text)
        self.assertEqual(download.content, latest_apk.read_bytes())

    def test_apk_latest_metadata_exposes_cdn_url_when_configured(self) -> None:
        packs_dir = Path(self._tmp_dir.name) / "content_packs_cdn"
        packs_dir.mkdir()
        content_readonly.PACKS_DIR = str(packs_dir)
        content_readonly.APK_CDN_BASE_URL = "https://cdn.example.test/allchemist/apk"
        latest_apk = packs_dir / "allchemist-release-cdn.apk"
        latest_apk.write_bytes(b"cdn-ready-apk")
        metadata = {
            "versionName": "9.1.0",
            "versionCode": 91,
            "apkFile": latest_apk.name,
        }
        (packs_dir / "allchemist-apk-latest.json").write_text(json.dumps(metadata), encoding="utf-8")

        try:
            meta = self.client.get("/api/v1/content/downloads/apk/latest/metadata")
            self.assertEqual(meta.status_code, 200, meta.text)
            cdn_url = f"https://cdn.example.test/allchemist/apk/{latest_apk.name}"
            self.assertEqual(meta.json()["downloadUrl"], cdn_url)
            self.assertEqual(meta.json()["cdnDownloadUrl"], cdn_url)
            self.assertEqual(meta.json()["localDownloadUrl"], "/api/v1/content/downloads/apk/latest")
        finally:
            content_readonly.APK_CDN_BASE_URL = ""


if __name__ == "__main__":
    unittest.main()
