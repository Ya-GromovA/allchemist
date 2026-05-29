from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.services.payment_adapters import cleanup_payment_webhook_storage, process_due_dead_letters


def main() -> None:
    parser = argparse.ArgumentParser(description="Run payment maintenance jobs")
    parser.add_argument("--retention-sec", type=int, default=604800)
    parser.add_argument("--max-reprocess", type=int, default=100)
    args = parser.parse_args()

    reprocess = process_due_dead_letters(limit=args.max_reprocess)
    cleanup = cleanup_payment_webhook_storage(retention_sec=args.retention_sec)

    print(json.dumps({"reprocess": reprocess, "cleanup": cleanup}, ensure_ascii=False))


if __name__ == "__main__":
    main()
