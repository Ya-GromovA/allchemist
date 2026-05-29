from __future__ import annotations

from typing import Dict

import httpx

from app.core.config import settings


def send_otp_sms(phone: str, code: str) -> Dict[str, str]:
    message = f"AllChemist code: {code}. It expires in {settings.OTP_TTL_MIN} minutes."

    if not settings.SMS_PROVIDER_URL:
        if settings.ENV.lower() == "dev":
            return {"status": "dev-skip", "detail": "SMS provider is not configured"}
        raise RuntimeError("SMS provider is not configured")

    headers = {"Content-Type": "application/json"}
    if settings.SMS_PROVIDER_TOKEN:
        headers["Authorization"] = f"Bearer {settings.SMS_PROVIDER_TOKEN}"

    payload = {
        "phone": phone,
        "message": message,
        "sender": settings.SMS_SENDER_NAME,
    }

    with httpx.Client(timeout=8.0) as client:
        resp = client.post(settings.SMS_PROVIDER_URL, headers=headers, json=payload)
        resp.raise_for_status()

    return {"status": "sent", "detail": "OTP SMS sent"}
