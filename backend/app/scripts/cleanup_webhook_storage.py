from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.services.payment_adapters import cleanup_payment_webhook_storage


def main() -> None:
    parser = argparse.ArgumentParser(description="Cleanup payment webhook storage")
    parser.add_argument("--retention-sec", type=int, default=604800)
    args = parser.parse_args()

    result = cleanup_payment_webhook_storage(retention_sec=args.retention_sec)
    print(result)


if __name__ == "__main__":
    main()
