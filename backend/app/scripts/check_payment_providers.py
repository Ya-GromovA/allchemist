from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.core.config import settings


def _check(name: str, url: str) -> dict:
    result = {
        "provider": name,
        "url": url,
        "configured": bool(url),
        "ok": False,
        "statusCode": None,
        "error": None,
        "checkedAt": datetime.now(timezone.utc).isoformat(),
    }
    if not url:
        result["error"] = "not_configured"
        return result

    try:
        with httpx.Client(timeout=5.0, follow_redirects=True) as client:
            resp = client.get(url)
        result["statusCode"] = resp.status_code
        result["ok"] = 200 <= resp.status_code < 500
    except Exception as e:
        result["error"] = str(e)
    return result


def main() -> None:
    providers = [
        ("robokassa", settings.ROBOKASSA_API_URL),
        ("tbank", settings.TBANK_API_URL),
        ("yookassa", settings.YOOKASSA_API_URL),
    ]
    report = [_check(name, url) for name, url in providers]
    print(json.dumps({"providers": report}, ensure_ascii=False))


if __name__ == "__main__":
    main()
