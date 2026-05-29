from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.services.user_state_store import _read_state, _write_state


def run_reconciliation(auto_fail_stale_pending: bool = False, stale_hours: int = 48) -> dict:
    state = _read_state()
    payments = state.get("payments", {})

    now = datetime.now(timezone.utc)
    stale_before = now - timedelta(hours=stale_hours)

    total = len(payments)
    pending = 0
    authorized = 0
    paid = 0
    failed = 0
    refunded = 0
    stale_pending = 0
    auto_failed = 0

    for payment_id, payment in payments.items():
        status = str(payment.get("status") or "pending").lower()
        created_at_raw = payment.get("createdAt")
        created_at = None
        if isinstance(created_at_raw, str):
            try:
                created_at = datetime.fromisoformat(created_at_raw)
            except Exception:
                created_at = None

        if status == "pending":
            pending += 1
            if created_at and created_at < stale_before:
                stale_pending += 1
                if auto_fail_stale_pending:
                    payment["status"] = "failed"
                    payment["failureReason"] = "reconciliation_stale_pending"
                    payment["updatedAt"] = now.isoformat()
                    payments[payment_id] = payment
                    auto_failed += 1
        elif status == "authorized":
            authorized += 1
        elif status == "paid":
            paid += 1
        elif status == "failed":
            failed += 1
        elif status == "refunded":
            refunded += 1

    state["payments"] = payments
    if auto_fail_stale_pending and auto_failed:
        _write_state(state)

    return {
        "total": total,
        "pending": pending,
        "authorized": authorized,
        "paid": paid,
        "failed": failed,
        "refunded": refunded,
        "stalePending": stale_pending,
        "autoFailed": auto_failed,
    }


if __name__ == "__main__":
    summary = run_reconciliation(auto_fail_stale_pending=False)
    print(summary)
