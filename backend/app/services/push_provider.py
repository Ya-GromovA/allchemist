from __future__ import annotations

from typing import Any, Dict, List

import httpx

from app.core.config import settings


def _expo_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    token = (settings.EXPO_ACCESS_TOKEN or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _is_expo_token(token: str) -> bool:
    t = token.strip()
    return t.startswith("ExponentPushToken[") or t.startswith("ExpoPushToken[")


async def _send_expo(tokens: List[str], title: str, body: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if not tokens:
        return {"ok": True, "provider": "expo", "sent": 0, "tickets": []}

    payload = []
    for token in tokens:
        payload.append(
            {
                "to": token,
                "title": title,
                "body": body,
                "data": data,
                "priority": "high",
                "sound": "default",
            }
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(settings.EXPO_PUSH_URL, headers=_expo_headers(), json=payload)

    try:
        body_json = res.json()
    except Exception:
        body_json = {"raw": res.text}

    ok = 200 <= res.status_code < 300
    return {
        "ok": ok,
        "provider": "expo",
        "status": res.status_code,
        "response": body_json,
        "sent": len(tokens),
    }


async def dispatch_push_notifications(tokens: List[Dict[str, Any]], title: str, body: str, data: Dict[str, Any]) -> Dict[str, Any]:
    provider = (settings.PUSH_PROVIDER or "expo").strip().lower()

    token_values = [str(x.get("token") or "").strip() for x in tokens if str(x.get("token") or "").strip()]
    expo_tokens = [t for t in token_values if _is_expo_token(t)]

    if provider == "expo":
        return await _send_expo(expo_tokens, title=title, body=body, data=data)

    if provider == "fcm":
        return {
            "ok": False,
            "provider": "fcm",
            "error": "FCM provider selected, but server-side FCM credentials flow is not configured yet",
            "required": ["FCM_PROJECT_ID", "FCM_SERVICE_ACCOUNT_JSON"],
        }

    if provider == "apns":
        return {
            "ok": False,
            "provider": "apns",
            "error": "APNs provider selected, but JWT signing flow is not configured yet",
            "required": ["APNS_TEAM_ID", "APNS_KEY_ID", "APNS_PRIVATE_KEY_P8", "APNS_BUNDLE_ID"],
        }

    return {"ok": False, "provider": provider, "error": "Unsupported PUSH_PROVIDER"}
