from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_PATH = ROOT / "tools" / "snapshots" / "formula_special_snapshot.json"

SCAN_DIRS = [
    ROOT / "backend" / "app",
    ROOT / "mobile" / "app",
    ROOT / "content_packs",
    ROOT / "tools",
]

SKIP_DIR_NAMES = {
    "node_modules",
    ".venv",
    "venv",
    "dist",
    "build",
    "__pycache__",
    ".git",
}

TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".html", ".css", ".yml", ".yaml", ".sql"
}

MOJIBAKE_PATTERNS = [
    re.compile(r"�"),
    re.compile(r"Ã[-¿]"),
    re.compile(r"Ð[-¿]"),
    re.compile(r"Ñ[-¿]"),
    re.compile(r"â€”|â€“|â€˜|â€™|â€œ|â€�|â„–|â€¦"),
]

TOKEN_RE = re.compile(r"\b[A-Za-z0-9]{3,}\b")
FORMULA_RE = re.compile(r"(?:[A-Z][a-z]?\d{0,3}){2,}")

# explicit symbols list for stable checks
SPECIAL_SYMBOLS = "→⇄≤≥±°αβγΔμ·×√∞≈≠ΩλνπΣθϕ"


def iter_text_files() -> List[Path]:
    out: List[Path] = []
    for scan_root in SCAN_DIRS:
        if not scan_root.exists():
            continue
        for path in scan_root.rglob("*"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIR_NAMES for part in path.parts):
                continue
            if "tools/snapshots" in str(path):
                continue
            if path.name == "content_quality_guard.py":
                continue
            if path.suffix.lower() not in TEXT_EXTS:
                continue
            out.append(path)
    return sorted(out)


def check_utf8(files: List[Path]) -> List[str]:
    errors: List[str] = []
    for p in files:
        data = p.read_bytes()
        try:
            data.decode("utf-8")
        except UnicodeDecodeError as e:
            errors.append(f"{p}: invalid UTF-8 ({e})")
    return errors


def check_mojibake(files: List[Path]) -> List[str]:
    findings: List[str] = []
    for p in files:
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if any(rx.search(line) for rx in MOJIBAKE_PATTERNS):
                findings.append(f"{p}:{i}: {line.strip()[:180]}")
    return findings


def collect_formula_snapshot(files: List[Path], limit: int = 500) -> Dict[str, List[str]]:
    formulas = set()
    symbols = set()
    snippets = set()

    for p in files:
        try:
            text = p.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        for line in text.splitlines():
            stripped = line.strip()
            if not stripped:
                continue

            for token in TOKEN_RE.findall(stripped):
                if not any(ch.isdigit() for ch in token):
                    continue
                if FORMULA_RE.fullmatch(token):
                    formulas.add(token)

            if any(ch in stripped for ch in SPECIAL_SYMBOLS):
                for ch in stripped:
                    if ch in SPECIAL_SYMBOLS:
                        symbols.add(ch)
                snippets.add(stripped[:220])

    return {
        "formulas": sorted(formulas)[:limit],
        "symbols": sorted(symbols),
        "snippets": sorted(snippets)[:limit],
    }


def load_snapshot() -> Dict[str, List[str]]:
    if not SNAPSHOT_PATH.exists():
        return {"formulas": [], "symbols": [], "snippets": []}
    return json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))


def save_snapshot(payload: Dict[str, List[str]]) -> None:
    SNAPSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def diff_snapshot(current: Dict[str, List[str]], base: Dict[str, List[str]]) -> Dict[str, Dict[str, List[str]]]:
    out: Dict[str, Dict[str, List[str]]] = {}
    for key in ("formulas", "symbols", "snippets"):
        a = set(base.get(key, []))
        b = set(current.get(key, []))
        added = sorted(b - a)
        removed = sorted(a - b)
        if added or removed:
            out[key] = {"added": added[:50], "removed": removed[:50]}
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Алхимик content encoding + mojibake + formula snapshot checks")
    parser.add_argument("--update-snapshot", action="store_true", help="Rewrite formula/symbol snapshot from current repository state")
    parser.add_argument("--check", action="store_true", help="Run checks and fail on errors")
    args = parser.parse_args()

    files = iter_text_files()
    utf8_errors = check_utf8(files)
    mojibake = check_mojibake(files)
    current = collect_formula_snapshot(files)

    if args.update_snapshot:
        save_snapshot(current)
        print(f"snapshot updated: {SNAPSHOT_PATH}")
        print(f"scanned files: {len(files)}")
        print(f"formulas: {len(current['formulas'])}, symbols: {len(current['symbols'])}, snippets: {len(current['snippets'])}")
        return 0

    base = load_snapshot()
    delta = diff_snapshot(current, base)

    print(f"scanned files: {len(files)}")
    print(f"utf8 errors: {len(utf8_errors)}")
    print(f"mojibake findings: {len(mojibake)}")
    print(f"snapshot delta groups: {len(delta)}")

    if utf8_errors:
        print("\nUTF-8 errors:")
        for line in utf8_errors[:50]:
            print(line)

    if mojibake:
        print("\nMojibake findings:")
        for line in mojibake[:50]:
            print(line)

    if delta:
        print("\nSnapshot differences:")
        print(json.dumps(delta, ensure_ascii=False, indent=2))

    if args.check and (utf8_errors or mojibake or delta):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
