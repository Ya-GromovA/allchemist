import tempfile
import subprocess
import unittest
import json
import re
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
        head = self.client.head("/api/v1/web")
        self.assertEqual(head.status_code, 200, head.text)
        self.assertIn("text/html", head.headers.get("content-type", ""))

        index = self.client.get("/api/v1/web")
        self.assertEqual(index.status_code, 200, index.text)
        self.assertIn('id="root"', index.text)
        self.assertIn("/api/v1/web/figma-assets/assets/", index.text)
        self.assertNotIn('id="authPanel"', index.text)
        self.assertNotIn('id="appShell"', index.text)
        self.assertNotIn("Скачать Android APK", index.text)
        asset_paths = re.findall(r'/api/v1/web/figma-assets/assets/[^"<>]+', index.text)
        self.assertGreaterEqual(len(asset_paths), 2, index.text)
        for asset_path in asset_paths:
            asset = self.client.get(asset_path)
            self.assertEqual(asset.status_code, 200, asset_path)

        js_path = next(path for path in asset_paths if path.endswith(".js"))
        js = self.client.get(js_path)
        self.assertEqual(js.status_code, 200, js.text[:200])
        self.assertIn("/auth/login", js.text)
        self.assertIn("/auth/me", js.text)
        self.assertIn("/auth/logout", js.text)
        self.assertIn("allchemist_web_session_v1", js.text)
        self.assertIn("demo/periodic-table", js.text)
        self.assertIn("school_admin", js.text)
        self.assertIn("content_editor", js.text)
        self.assertIn("support", js.text)

    def test_public_web_known_routes_return_shell(self) -> None:
        for route in (
            "/api/v1/web/login",
            "/api/v1/web/plans",
            "/api/v1/web/pricing",
            "/api/v1/web/activate-code",
            "/api/v1/web/school-login",
            "/api/v1/web/staff-login",
            "/api/v1/web/demo",
            "/api/v1/web/demo/chemistry",
            "/api/v1/web/demo/physics",
            "/api/v1/web/demo/biology",
            "/api/v1/web/demo/ai",
            "/api/v1/web/demo/periodic-table",
            "/api/v1/web/demo/labs",
            "/api/v1/web/demo/molecules",
            "/api/v1/web/demo/physics-simulator",
            "/api/v1/web/demo/microscope",
            "/api/v1/web/demo/cell",
            "/api/v1/web/demo/exams",
            "/api/v1/web/demo/revision-plan",
            "/api/v1/web/student",
            "/api/v1/web/student/chemistry",
            "/api/v1/web/student/physics",
            "/api/v1/web/student/biology",
            "/api/v1/web/student/chemistry/periodic-table",
            "/api/v1/web/student/ai-tutor",
            "/api/v1/web/teacher",
            "/api/v1/web/parent",
            "/api/v1/web/homeroom",
            "/api/v1/web/school-admin",
            "/api/v1/web/admin",
            "/api/v1/web/support",
            "/api/v1/web/content",
        ):
            with self.subTest(route=route):
                response = self.client.get(route)
                self.assertEqual(response.status_code, 200, response.text)
                self.assertIn('id="root"', response.text)
                self.assertIn("/api/v1/web/figma-assets/assets/", response.text)

        missing = self.client.get("/api/v1/web/demo/not-real")
        self.assertEqual(missing.status_code, 404)

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
