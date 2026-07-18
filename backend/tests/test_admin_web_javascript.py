from __future__ import annotations

import re
import subprocess
import unittest
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
APP_JS = ROOT / "backend" / "app" / "web_admin" / "app.js"
INDEX_HTML = ROOT / "backend" / "app" / "web_admin" / "index.html"
FINAL_RENDERERS = (
    "renderAdminKpis",
    "renderAdminPlatformActivity",
    "renderAdminSubjects",
    "renderAdminSchoolsMap",
    "renderAdminEvents",
    "renderAdminQaSummaryHome",
)


class LegacyAdminJavascriptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.source = APP_JS.read_text(encoding="utf-8")

    def test_javascript_syntax(self) -> None:
        result = subprocess.run(
            ["node", "--check", str(APP_JS)],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_final_renderer_declarations_are_unique(self) -> None:
        names = re.findall(r"(?m)^function\s+([A-Za-z_$][\w$]*)\s*\(", self.source)
        duplicates = {name: count for name, count in Counter(names).items() if count > 1}
        self.assertEqual(duplicates, {})

        for name in FINAL_RENDERERS:
            self.assertEqual(names.count(name), 1, f"{name} declarations: {names.count(name)}")

    def test_canonical_kpi_renderer_contract(self) -> None:
        marker = "Final visual renderers for the reference-style admin dashboard."
        self.assertIn(marker, self.source)
        final_block = self.source[self.source.index(marker) :]
        for binding in ("adminDashboardKpis", "kpiIcon", "kpiLabel", "adminFormatKpiValue", "data-jump-view"):
            self.assertIn(binding, final_block)
        for field in (
            "schoolsCount",
            "usersCount",
            "licensesCount",
            "publishedMaterialsCount",
            "reviewMaterialsCount",
            "errors24hCount",
            "liveLessonsNowCount",
            "monthlyPaymentsAmount",
        ):
            self.assertIn(f"data.{field}", final_block)

    def test_html_binding_is_preserved(self) -> None:
        html = INDEX_HTML.read_text(encoding="utf-8")
        self.assertIn('id="adminDashboardKpis"', html)
        self.assertIn('/api/v1/admin/web/assets/app.js', html)


if __name__ == "__main__":
    unittest.main()
