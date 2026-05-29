from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from app.core.config import settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode((data + padding).encode("ascii"))


def _sign(message: bytes) -> str:
    secret = settings.JWT_SECRET.encode("utf-8")
    sig = hmac.new(secret, message, hashlib.sha256).digest()
    return _b64url_encode(sig)


def _encode_jwt(payload: Dict[str, Any]) -> str:
    header = {"alg": settings.JWT_ALGORITHM, "typ": "JWT"}
    header_part = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_part = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_part}.{payload_part}".encode("ascii")
    signature_part = _sign(signing_input)
    return f"{header_part}.{payload_part}.{signature_part}"


def build_access_token(
    user_id: str,
    role: str | None = None,
    session_id: str | None = None,
    token_id: str | None = None,
) -> tuple[str, str, str]:
    exp = _now() + timedelta(minutes=settings.ACCESS_TOKEN_TTL_MIN)
    jti = token_id or secrets.token_hex(16)
    payload: Dict[str, Any] = {
        "sub": user_id,
        "type": "access",
        "jti": jti,
        "exp": int(exp.timestamp()),
        "iat": int(_now().timestamp()),
    }
    if session_id:
        payload["sid"] = session_id
    if role:
        payload["role"] = role
    token = _encode_jwt(payload)
    return token, exp.isoformat(), jti


def build_refresh_token(user_id: str) -> tuple[str, str, str]:
    exp = _now() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)
    jti = secrets.token_hex(16)
    payload = {
        "sub": user_id,
        "type": "refresh",
        "jti": jti,
        "exp": int(exp.timestamp()),
        "iat": int(_now().timestamp()),
    }
    token = _encode_jwt(payload)
    return token, exp.isoformat(), jti


def decode_token(token: str) -> Dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Invalid token format")

    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    expected_signature = _sign(signing_input)
    if not hmac.compare_digest(signature_b64, expected_signature):
        raise ValueError("Invalid token signature")

    header = json.loads(_b64url_decode(header_b64).decode("utf-8"))
    if str(header.get("alg") or "") != settings.JWT_ALGORITHM:
        raise ValueError("Unsupported token algorithm")

    payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    exp = payload.get("exp")
    if not isinstance(exp, int):
        raise ValueError("Token exp claim is required")
    if int(_now().timestamp()) >= exp:
        raise ValueError("Token expired")
    return payload
