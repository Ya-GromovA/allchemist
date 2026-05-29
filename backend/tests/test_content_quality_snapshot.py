from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import unittest


class ContentQualitySnapshotTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        repo_root = Path(__file__).resolve().parents[2]
        module_path = repo_root / "tools" / "content_quality_guard.py"
        spec = importlib.util.spec_from_file_location("content_quality_guard", module_path)
        module = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(module)
        cls.guard = module

    def test_utf8_and_mojibake_clean(self):
        files = self.guard.iter_text_files()
        utf8_errors = self.guard.check_utf8(files)
        mojibake = self.guard.check_mojibake(files)
        self.assertEqual([], utf8_errors)
        self.assertEqual([], mojibake)

    def test_formula_snapshot_is_stable(self):
        files = self.guard.iter_text_files()
        current = self.guard.collect_formula_snapshot(files)
        baseline = self.guard.load_snapshot()
        delta = self.guard.diff_snapshot(current, baseline)
        self.assertEqual({}, delta, msg=json.dumps(delta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    unittest.main()
