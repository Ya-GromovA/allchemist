#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
VENV_PYTHON = BACKEND / ".venv-test" / "bin" / "python"
if VENV_PYTHON.exists() and Path(sys.executable) != VENV_PYTHON:
    os.execv(str(VENV_PYTHON), [str(VENV_PYTHON), *sys.argv])
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.services import user_state_store as store  # noqa: E402


def _count_active_sessions(user_id: str | None = None) -> int:
    state = store._read_state()
    count = 0
    for item in state.setdefault("sessions", {}).values():
        if not isinstance(item, dict) or item.get("revoked"):
            continue
        if user_id and str(item.get("userId") or "") != user_id:
            continue
        count += 1
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="Revoke Allchemist refresh/access sessions for maintenance windows.")
    parser.add_argument("--apply", action="store_true", help="Actually revoke sessions. Without this flag the command is dry-run only.")
    parser.add_argument("--user-id", default="", help="Optional single userId target. Omit to revoke all active sessions.")
    parser.add_argument("--changed-by", default="ops", help="Operator or system name for audit trail.")
    parser.add_argument("--reason", default="maintenance", help="Audit reason for revocation.")
    args = parser.parse_args()

    user_id = args.user_id.strip() or None
    active = _count_active_sessions(user_id=user_id)
    if not args.apply:
        print(json.dumps({"dryRun": True, "targetUserId": user_id, "activeSessions": active}, ensure_ascii=False))
        return 0

    result = store.revoke_all_sessions(changed_by=args.changed_by, reason=args.reason, user_id=user_id)
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
