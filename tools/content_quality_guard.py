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
    ".next",
}

# Сборочные артефакты: минифицированные бандлы с хешами в именах. В них нет
# авторского текста, зато есть случайные последовательности вроде BVIr1GLF,
# которые снапшот формул принимал за химию.
SKIP_PATH_FRAGMENTS = (
    "web_public_react/assets/",
)

TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt", ".html", ".css", ".yml", ".yaml", ".sql"
}

MOJIBAKE_PATTERNS = [
    re.compile("[ÐÑÃ][-¿]"),
    re.compile("�"),
    re.compile(r"â€”|â€“|â€˜|â€™|â€œ|â€�|â„–|â€¦"),
]

TOKEN_RE = re.compile(r"\b[A-Za-z0-9]{3,}\b")

# Не формулы: CSS-цвет (#F8FBFF), unicode-escape (Δ) и hex-литерал (0xFFAA).
# Раньше первая ветка заканчивалась байтом 0x08 вместо \b — из-за этого ни один
# цвет не вырезался, и весь набор дизайн-токенов уезжал в снапшот формул.
NON_FORMULA_RE = re.compile(
    r"#[0-9A-Fa-f]{3,8}\b"
    r"|\\[uU][0-9A-Fa-f]{4,8}"
    r"|\b0[xX][0-9A-Fa-f]+\b"
)

# Цвет может быть записан и без решётки: "F8FBFF". Отличить его от формулы по
# самому токену нельзя (CF3CF3 — настоящее вещество и одновременно валидный hex),
# поэтому голый hex вырезается только в строке, которая описывает цвет.
COLOR_CONTEXT_RE = re.compile(
    r"\b(?:color|colour|fill|stroke|background|tint|border|shadow|glow|palette|hex|rgba?|swatch)\b",
    re.IGNORECASE,
)
BARE_HEX_RE = re.compile(r"\b[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?\b")

FORMULA_RE = re.compile(r"(?:[A-Z][a-z]?\d{0,3}){2,}")
FORMULA_PART_RE = re.compile(r"([A-Z][a-z]?)(\d{0,3})")

# Символы 118 элементов по IUPAC. Изотопные обозначения D и T намеренно
# не включены: с ними hex-цвета FFD5C2 и FFF5DD снова стали бы «формулами»,
# а тяжёлая вода в сканируемом контенте не встречается.
ELEMENT_SYMBOLS = {
    "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne",
    "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca",
    "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn",
    "Ga", "Ge", "As", "Se", "Br", "Kr", "Rb", "Sr", "Y", "Zr",
    "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn",
    "Sb", "Te", "I", "Xe", "Cs", "Ba", "La", "Ce", "Pr", "Nd",
    "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb",
    "Lu", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg",
    "Tl", "Pb", "Bi", "Po", "At", "Rn", "Fr", "Ra", "Ac", "Th",
    "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm",
    "Md", "No", "Lr", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds",
    "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og",
}

# explicit symbols list for stable checks
SPECIAL_SYMBOLS = "→⇄≤≥±°αβγΔμ·×√∞≈≠ΩλνπΣθϕ"


def is_chemical_formula(token: str) -> bool:
    """Токен — формула, только если он целиком раскладывается на символы элементов.

    Это и есть определение химической формулы. Цвет D7E8FF, код ошибки BLE001 и
    имя бандла BVIr1GLF раскладываются на несуществующие «элементы» D, E, L, G
    и формулами не являются.
    """
    if not FORMULA_RE.fullmatch(token):
        return False
    if not any(ch.isdigit() for ch in token):
        return False
    position = 0
    for match in FORMULA_PART_RE.finditer(token):
        if match.start() != position:
            return False
        position = match.end()
        if match.group(1) not in ELEMENT_SYMBOLS:
            return False
    return position == len(token)


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
            posix = path.as_posix()
            if "tools/snapshots" in posix:
                continue
            if any(fragment in posix for fragment in SKIP_PATH_FRAGMENTS):
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


def strip_non_formulas(line: str) -> str:
    """Убирает из строки всё, что похоже на формулу, но ею не является."""
    cleaned = NON_FORMULA_RE.sub(" ", line)
    if COLOR_CONTEXT_RE.search(line):
        cleaned = BARE_HEX_RE.sub(" ", cleaned)
    return cleaned


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

            formula_source = strip_non_formulas(stripped)
            for token in TOKEN_RE.findall(formula_source):
                if is_chemical_formula(token):
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
