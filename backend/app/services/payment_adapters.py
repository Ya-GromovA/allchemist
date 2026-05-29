from __future__ import annotations

import hashlib
import hmac
import secrets
from csv import DictWriter
from datetime import datetime, timedelta, timezone
from io import StringIO
from typing import Any, Dict

import httpx

from app.core.config import settings
from app.services.payments.providers import PROVIDERS
from app.services.user_state_store import _read_state, _write_state


SUPPORTED_PAYMENT_PROVIDERS = {"robokassa", "tbank", "yookassa"}
PAYMENT_STATUSES = {"pending", "authorized", "paid", "failed", "refunded"}
TERMINAL_STATUSES = {"paid", "failed", "refunded"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def _default_entitlements() -> Dict[str, Any]:
    return {"plans": ["free"], "modules": [], "ai_quota_left": 20}


PLAN_AI_QUOTA = {
    "pro_monthly": 250,
    "pro_quarter": 900,
    "school_quarter": 1500,
    "family_year": 2400,
}


def _grant_paid_item(ent: Dict[str, Any], item_id: str | None) -> None:
    normalized = str(item_id or "").strip()
    if not normalized:
        return

    if normalized.startswith("plan:"):
        plan_id = normalized.split(":", 1)[1].strip()
        if not plan_id:
            return
        current_plans = [str(x) for x in ent.get("plans", []) if str(x).strip()]
        paid_plans = [p for p in current_plans if p != "free"]
        next_plans = sorted(set(paid_plans + [plan_id]))
        ent["plans"] = next_plans or ["free"]
        quota_now = int(ent.get("ai_quota_left") or 0)
        ent["ai_quota_left"] = max(quota_now, 20) + int(PLAN_AI_QUOTA.get(plan_id, 150))
        return

    ent["modules"] = sorted(set(ent.get("modules", []) + [normalized]))


def _to_signing_string(data: Dict[str, Any]) -> str:
    parts = []
    for key in sorted(data.keys()):
        parts.append(f"{key}={data[key]}")
    return "&".join(parts)


def _provider_secret(provider: str) -> str:
    if provider == "robokassa":
        return settings.WEBHOOK_SECRET_ROBOKASSA
    if provider == "tbank":
        return settings.WEBHOOK_SECRET_TBANK
    if provider == "yookassa":
        return settings.WEBHOOK_SECRET_YOOKASSA
    raise ValueError("Unsupported payment provider")


def _provider_checkout_url(provider: str, payment: Dict[str, Any]) -> str:
    payment_id = payment["paymentId"]
    amount = payment["amountRub"]
    return_url = payment.get("returnUrl") or settings.PAYMENT_RETURN_BASE_URL

    impl = PROVIDERS.get(provider)
    if not impl:
        raise ValueError("Unsupported payment provider")
    return impl.build_checkout_url(
        payment_id=payment_id,
        amount_rub=amount,
        module_id=payment["moduleId"],
        return_url=return_url,
    )


def _provider_api_url(provider: str) -> str:
    if provider == "robokassa":
        return settings.ROBOKASSA_API_URL
    if provider == "tbank":
        return settings.TBANK_API_URL
    if provider == "yookassa":
        return settings.YOOKASSA_API_URL
    return ""


def _provider_init_payload(provider: str, payment: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "paymentId": payment["paymentId"],
        "amountRub": payment["amountRub"],
        "moduleId": payment["moduleId"],
        "returnUrl": payment.get("returnUrl") or settings.PAYMENT_RETURN_BASE_URL,
    }

    if provider == "robokassa":
        payload["merchantLogin"] = settings.ROBOKASSA_MERCHANT_LOGIN
        payload["password1"] = settings.ROBOKASSA_PASSWORD_1
    elif provider == "tbank":
        payload["terminalKey"] = settings.TBANK_TERMINAL_KEY
        payload["password"] = settings.TBANK_PASSWORD
    elif provider == "yookassa":
        payload["shopId"] = settings.YOOKASSA_SHOP_ID
        payload["secretKey"] = settings.YOOKASSA_SECRET_KEY
    return payload


def _request_provider_checkout(provider: str, payment: Dict[str, Any]) -> str:
    api_url = _provider_api_url(provider)
    if not api_url:
        return _provider_checkout_url(provider, payment)

    payload = _provider_init_payload(provider, payment)
    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(api_url, json=payload)
            resp.raise_for_status()
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            checkout_url = str(data.get("checkoutUrl") or "").strip()
            if checkout_url:
                return checkout_url
    except Exception:
        pass

    return _provider_checkout_url(provider, payment)


def verify_webhook_signature(provider: str, payload: Dict[str, Any], signature: str) -> bool:
    try:
        secret = _provider_secret(provider).encode("utf-8")
    except ValueError:
        return False
    to_sign = _to_signing_string(payload).encode("utf-8")
    expected = hmac.new(secret, to_sign, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature.strip().lower())


def create_payment(
    *,
    user_id: str,
    provider: str,
    module_id: str,
    amount_rub: int,
    return_url: str | None,
    idempotency_key: str | None,
) -> Dict[str, Any]:
    normalized_provider = provider.strip().lower()
    if normalized_provider not in SUPPORTED_PAYMENT_PROVIDERS:
        raise ValueError("Unsupported payment provider")
    if amount_rub <= 0:
        raise ValueError("amountRub must be positive")

    state = _read_state()
    payments = state.setdefault("payments", {})
    idem_store = state.setdefault("payment_idempotency", {})

    normalized_idem = (idempotency_key or "").strip() or None
    if normalized_idem:
        idem_key = f"{user_id}:{normalized_provider}:{normalized_idem}"
        existing_payment_id = idem_store.get(idem_key)
        if existing_payment_id and existing_payment_id in payments:
            return payments[existing_payment_id]

    payment_id = f"pay_{normalized_provider}_{secrets.token_hex(8)}"
    payment = {
        "paymentId": payment_id,
        "userId": user_id,
        "provider": normalized_provider,
        "status": "pending",
        "amountRub": amount_rub,
        "currency": "RUB",
        "checkoutUrl": "",
        "moduleId": module_id,
        "returnUrl": return_url,
        "idempotencyKey": normalized_idem,
        "failureReason": None,
        "createdAt": _now_iso(),
        "updatedAt": _now_iso(),
        "paidAt": None,
    }
    payment["checkoutUrl"] = _request_provider_checkout(normalized_provider, payment)

    payments[payment_id] = payment
    if normalized_idem:
        idem_store[f"{user_id}:{normalized_provider}:{normalized_idem}"] = payment_id

    _append_payment_audit(state, payment_id, "create", payment)
    _write_state(state)
    return payment


def get_payment(payment_id: str) -> Dict[str, Any]:
    state = _read_state()
    payment = state.setdefault("payments", {}).get(payment_id)
    if not payment:
        raise ValueError("Payment not found")
    return payment


def list_payment_audit(limit: int = 200) -> list[Dict[str, Any]]:
    state = _read_state()
    audit = state.get("payment_audit", [])
    return list(audit[-max(1, min(limit, 1000)):])


def query_payment_audit(
    *,
    provider: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    offset: int = 0,
    limit: int = 200,
) -> list[Dict[str, Any]]:
    rows = list_payment_audit(limit=1000)
    filtered: list[Dict[str, Any]] = []

    provider_norm = (provider or "").strip().lower() or None
    status_norm = (status or "").strip().lower() or None
    dt_from = _parse_iso(date_from)
    dt_to = _parse_iso(date_to)

    for row in rows:
        row_provider = str(row.get("provider") or "").strip().lower()
        row_status = str(row.get("status") or "").strip().lower()
        row_dt = _parse_iso(str(row.get("at") or ""))

        if provider_norm and row_provider != provider_norm:
            continue
        if status_norm and row_status != status_norm:
            continue
        if dt_from and row_dt and row_dt < dt_from:
            continue
        if dt_to and row_dt and row_dt > dt_to:
            continue
        filtered.append(row)

    bounded_limit = max(1, min(limit, 1000))
    bounded_offset = max(0, offset)
    if not filtered:
        return []
    if bounded_offset >= len(filtered):
        return []
    return filtered[bounded_offset : bounded_offset + bounded_limit]


def export_payment_audit_csv(
    *,
    provider: str | None = None,
    status: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    offset: int = 0,
    limit: int = 1000,
) -> str:
    rows = query_payment_audit(
        provider=provider,
        status=status,
        date_from=date_from,
        date_to=date_to,
        offset=offset,
        limit=limit,
    )
    out = StringIO()
    fieldnames = ["at", "paymentId", "action", "status", "provider", "amountRub"]
    writer = DictWriter(out, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k) for k in fieldnames})
    return out.getvalue()


def list_payment_dead_letters(limit: int = 200) -> list[Dict[str, Any]]:
    state = _read_state()
    dead = state.get("payment_webhook_dead_letters", [])
    return list(dead[-max(1, min(limit, 1000)):])


def list_due_dead_letters(limit: int = 100) -> list[Dict[str, Any]]:
    state = _read_state()
    dead = state.get("payment_webhook_dead_letters", [])
    now = datetime.now(timezone.utc)
    due: list[Dict[str, Any]] = []
    for item in dead:
        if item.get("resolvedAt"):
            continue
        attempts = int(item.get("attempts") or 0)
        max_attempts = int(item.get("maxAttempts") or 3)
        if attempts >= max_attempts:
            continue
        next_retry = _parse_iso(str(item.get("nextRetryAt") or ""))
        if next_retry and next_retry > now:
            continue
        due.append(item)
    return due[: max(1, min(limit, 1000))]


def cleanup_payment_webhook_storage(retention_sec: int) -> Dict[str, int]:
    state = _read_state()
    now = datetime.now(timezone.utc)

    events = state.get("payment_webhook_events", {})
    events_before = len(events)
    kept_events = {}
    for key, item in events.items():
        ts = _parse_iso(item.get("receivedAt"))
        if ts and (now - ts).total_seconds() > retention_sec:
            continue
        kept_events[key] = item
    state["payment_webhook_events"] = kept_events

    dead_letters = state.get("payment_webhook_dead_letters", [])
    dead_before = len(dead_letters)
    kept_dead = []
    for item in dead_letters:
        ts = _parse_iso(item.get("at"))
        if ts and (now - ts).total_seconds() > retention_sec:
            continue
        kept_dead.append(item)
    state["payment_webhook_dead_letters"] = kept_dead

    _write_state(state)
    return {
        "eventsBefore": events_before,
        "eventsAfter": len(kept_events),
        "deadLettersBefore": dead_before,
        "deadLettersAfter": len(kept_dead),
        "removedEvents": max(0, events_before - len(kept_events)),
        "removedDeadLetters": max(0, dead_before - len(kept_dead)),
    }


def reprocess_dead_letter(dead_letter_id: str) -> Dict[str, Any]:
    state = _read_state()
    dead_letters = state.get("payment_webhook_dead_letters", [])
    found = None
    for item in dead_letters:
        if str(item.get("deadLetterId") or "") == dead_letter_id:
            found = item
            break
    if not found:
        raise ValueError("Dead letter not found")

    payment_id = str(found.get("paymentId") or "")
    payment = state.get("payments", {}).get(payment_id)
    if not payment:
        raise ValueError("Payment not found")

    mapped_status = _map_provider_status(str(found.get("provider") or ""), str(found.get("status") or ""))

    try:
        updated = update_payment_status(
            payment_id,
            user_id=str(payment.get("userId") or ""),
            next_status=mapped_status,
            failure_reason=str(found.get("reason") or "dead_letter_reprocess"),
        )
    except ValueError as e:
        state_after_error = _read_state()
        for item in state_after_error.get("payment_webhook_dead_letters", []):
            if str(item.get("deadLetterId") or "") == dead_letter_id:
                attempts_now = int(item.get("attempts") or 0) + 1
                item["attempts"] = attempts_now
                backoff_sec = min(3600, 60 * (2 ** max(0, attempts_now - 1)))
                item["nextRetryAt"] = (datetime.now(timezone.utc) + timedelta(seconds=backoff_sec)).isoformat()
                item["lastError"] = str(e)
                if attempts_now >= int(item.get("maxAttempts") or 3):
                    item["resolvedAt"] = _now_iso()
                    item["resolution"] = "exhausted"
                break
        _write_state(state_after_error)
        raise

    state_after = _read_state()
    for item in state_after.get("payment_webhook_dead_letters", []):
        if str(item.get("deadLetterId") or "") == dead_letter_id:
            item["attempts"] = int(item.get("attempts") or 0) + 1
            item["resolvedAt"] = _now_iso()
            item["resolution"] = "reprocessed"
            item["lastError"] = None
            break
    _write_state(state_after)
    return updated


def process_due_dead_letters(limit: int = 100) -> Dict[str, Any]:
    due = list_due_dead_letters(limit=limit)
    processed = 0
    succeeded = 0
    failed = 0
    details: list[Dict[str, Any]] = []

    for item in due:
        dead_id = str(item.get("deadLetterId") or "")
        if not dead_id:
            continue
        processed += 1
        try:
            payment = reprocess_dead_letter(dead_id)
            succeeded += 1
            details.append({"deadLetterId": dead_id, "ok": True, "paymentId": payment.get("paymentId")})
        except Exception as e:
            failed += 1
            details.append({"deadLetterId": dead_id, "ok": False, "error": str(e)})

    return {
        "due": len(due),
        "processed": processed,
        "succeeded": succeeded,
        "failed": failed,
        "details": details,
    }


def _transition_allowed(current: str, target: str) -> bool:
    if current == target:
        return True
    allowed = {
        "pending": {"authorized", "paid", "failed", "refunded"},
        "authorized": {"paid", "failed", "refunded"},
        "paid": {"refunded"},
        "failed": set(),
        "refunded": set(),
    }
    return target in allowed.get(current, set())


def update_payment_status(
    payment_id: str,
    *,
    user_id: str,
    next_status: str,
    failure_reason: str | None = None,
) -> Dict[str, Any]:
    state = _read_state()
    payments = state.setdefault("payments", {})
    payment = payments.get(payment_id)
    if not payment:
        raise ValueError("Payment not found")
    if payment.get("userId") != user_id:
        raise ValueError("Forbidden payment access")

    normalized_status = next_status.strip().lower()
    if normalized_status not in PAYMENT_STATUSES:
        raise ValueError("Unsupported payment status")

    current_status = str(payment.get("status") or "pending")
    if not _transition_allowed(current_status, normalized_status):
        raise ValueError(f"Invalid payment transition: {current_status} -> {normalized_status}")

    payment["status"] = normalized_status
    payment["updatedAt"] = _now_iso()
    if normalized_status == "paid":
        payment["paidAt"] = payment.get("paidAt") or _now_iso()
        ent = state.setdefault("entitlements", {}).setdefault(user_id, _default_entitlements())
        _grant_paid_item(ent, str(payment.get("moduleId") or ""))

    if normalized_status == "failed":
        payment["failureReason"] = failure_reason or "unknown_failure"
    elif failure_reason:
        payment["failureReason"] = failure_reason

    payments[payment_id] = payment
    _append_payment_audit(state, payment_id, f"status:{normalized_status}", payment)
    _write_state(state)
    return payment


def mark_payment_succeeded(payment_id: str, *, user_id: str) -> Dict[str, Any]:
    return update_payment_status(payment_id, user_id=user_id, next_status="paid")


def _append_payment_audit(state: Dict[str, Any], payment_id: str, action: str, payload: Dict[str, Any]) -> None:
    audit = state.setdefault("payment_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "paymentId": payment_id,
            "action": action,
            "status": payload.get("status"),
            "provider": payload.get("provider"),
            "amountRub": payload.get("amountRub"),
        }
    )
    state["payment_audit"] = audit[-10000:]


def _map_provider_status(provider: str, status: str) -> str:
    impl = PROVIDERS.get(provider)
    if not impl:
        return status.strip().lower()
    return impl.map_status(status)


def _record_dead_letter(
    state: Dict[str, Any],
    *,
    provider: str,
    payment_id: str,
    status: str,
    reason: str,
    payload: Dict[str, Any],
) -> None:
    dead = state.setdefault("payment_webhook_dead_letters", [])
    dead.append(
        {
            "deadLetterId": f"dlq_{secrets.token_hex(8)}",
            "at": _now_iso(),
            "provider": provider,
            "paymentId": payment_id,
            "status": status,
            "reason": reason,
            "attempts": 0,
            "maxAttempts": 3,
            "nextRetryAt": _now_iso(),
            "resolvedAt": None,
            "resolution": None,
            "payload": payload,
        }
    )
    state["payment_webhook_dead_letters"] = dead[-2000:]


def apply_provider_webhook(
    *,
    provider: str,
    payment_id: str,
    status: str,
    signature: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    normalized_provider = provider.strip().lower()
    if normalized_provider not in SUPPORTED_PAYMENT_PROVIDERS:
        raise ValueError("Unsupported payment provider")

    verify_payload = dict(payload)
    verify_payload.update({"paymentId": payment_id, "status": status})

    state = _read_state()
    if not verify_webhook_signature(normalized_provider, verify_payload, signature):
        _record_dead_letter(
            state,
            provider=normalized_provider,
            payment_id=payment_id,
            status=status,
            reason="invalid_signature",
            payload=verify_payload,
        )
        _write_state(state)
        raise ValueError("Invalid webhook signature")

    payment = state.setdefault("payments", {}).get(payment_id)
    if not payment:
        _record_dead_letter(
            state,
            provider=normalized_provider,
            payment_id=payment_id,
            status=status,
            reason="payment_not_found",
            payload=verify_payload,
        )
        _write_state(state)
        raise ValueError("Payment not found")
    if payment.get("provider") != normalized_provider:
        _record_dead_letter(
            state,
            provider=normalized_provider,
            payment_id=payment_id,
            status=status,
            reason="provider_mismatch",
            payload=verify_payload,
        )
        _write_state(state)
        raise ValueError("Provider mismatch")

    event_id = str(payload.get("eventId") or "").strip()
    event_store = state.setdefault("payment_webhook_events", {})
    if event_id:
        event_key = f"{normalized_provider}:{event_id}"
        payload_hash = hashlib.sha256(_to_signing_string(verify_payload).encode("utf-8")).hexdigest()
        existing = event_store.get(event_key)
        if existing:
            first_seen = _parse_iso(existing.get("receivedAt"))
            if first_seen and (datetime.now(timezone.utc) - first_seen).total_seconds() <= settings.PAYMENT_WEBHOOK_REPLAY_WINDOW_SEC:
                if existing.get("payloadHash") != payload_hash:
                    _record_dead_letter(
                        state,
                        provider=normalized_provider,
                        payment_id=payment_id,
                        status=status,
                        reason="replay_payload_mismatch",
                        payload=verify_payload,
                    )
                    _write_state(state)
                    raise ValueError("Webhook replay payload mismatch")
                return payment

        event_store[event_key] = {
            "paymentId": payment_id,
            "provider": normalized_provider,
            "payloadHash": payload_hash,
            "receivedAt": _now_iso(),
        }

    mapped_status = _map_provider_status(normalized_provider, status)
    if mapped_status not in TERMINAL_STATUSES and mapped_status != "authorized":
        _record_dead_letter(
            state,
            provider=normalized_provider,
            payment_id=payment_id,
            status=status,
            reason="unsupported_status",
            payload=verify_payload,
        )
        _write_state(state)
        raise ValueError("Unsupported webhook status")

    next_payment = update_payment_status(
        payment_id,
        user_id=payment["userId"],
        next_status=mapped_status,
        failure_reason=payload.get("failureReason"),
    )
    return next_payment
