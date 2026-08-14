"""Write the database-owned collections back into the legacy JSON file.

This is the rollback tool for the identity write-path deployment, and it exists
because rollback without it is not actually a rollback.

The problem it solves
---------------------
After the new image is live, a registration creates rows in ``users``,
``user_identifiers`` and ``user_credentials``. The previous image does not read
those tables -- it reads ``backend/data/user_state.json``. So restoring the old
image would silently hide every account created since the deploy: the pupil
would be told their phone number is unknown, and the row proving otherwise would
sit in a table nothing reads.

Running this first turns that into a defined operation. It materialises the same
projection the compatibility bridge serves at runtime and writes it into the
file the old image expects, so the two views agree at the moment of the swap.

Usage::

    python -m app.scripts.export_state_to_json --dry-run
    python -m app.scripts.export_state_to_json --apply

``--dry-run`` prints the record count of every collection and changes nothing.
``--apply`` writes the file, keeping a timestamped copy of the previous one
next to it first. Collections that never moved to the database are preserved
exactly as they are: this merges, it does not replace.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.db.session import SessionLocal
from app.services.legacy_state_bridge import (
    DB_OWNED_COLLECTIONS,
    STATE_PATH,
    project_state,
)


def _describe(value: Any) -> str:
    if isinstance(value, dict):
        return f"{len(value)} записей"
    if isinstance(value, list):
        return f"{len(value)} элементов"
    return type(value).__name__


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="показать, что будет записано")
    group.add_argument("--apply", action="store_true", help="записать файл")
    parser.add_argument(
        "--path",
        type=Path,
        default=STATE_PATH,
        help=f"куда писать (по умолчанию {STATE_PATH})",
    )
    args = parser.parse_args(argv)

    session = SessionLocal()
    try:
        projected = project_state(session)
    finally:
        session.close()

    target: Path = args.path
    existing: dict[str, Any] = {}
    if target.exists():
        try:
            loaded = json.loads(target.read_text(encoding="utf-8"))
            existing = loaded if isinstance(loaded, dict) else {}
        except json.JSONDecodeError as error:
            print(f"ОШИБКА: {target} не разбирается как JSON: {error}", file=sys.stderr)
            return 2

    print(f"файл назначения: {target}")
    print(f"коллекций в файле сейчас: {len(existing)}")
    print()
    print("будет перезаписано из базы:")
    for name in sorted(DB_OWNED_COLLECTIONS):
        was = _describe(existing.get(name, {}))
        now = _describe(projected.get(name, {}))
        print(f"  {name:<24} {was:>16}  ->  {now}")

    untouched = sorted(set(existing) - DB_OWNED_COLLECTIONS)
    print()
    print(f"сохраняется без изменений: {len(untouched)} коллекций")
    if untouched:
        print("  " + ", ".join(untouched))

    if args.dry_run:
        print()
        print("--dry-run: ничего не записано")
        return 0

    merged = dict(existing)
    merged.update(projected)

    if target.exists():
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        backup = target.with_name(f"{target.stem}-before-export-{stamp}.json")
        shutil.copy2(target, backup)
        print()
        print(f"предыдущий файл сохранён: {backup}")

    tmp_path = target.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(target)
    print(f"записано: {target} ({target.stat().st_size} байт, {len(merged)} коллекций)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
