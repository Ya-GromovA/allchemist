from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import bcrypt
except Exception:
    bcrypt = None

from app.core.config import settings
from app.services.auth_tokens import build_access_token, decode_token
from app.services.sms_provider import send_otp_sms
try:
    from app.services.pg_school_store import list_user_devices_pg, sync_school_domain_from_state
except Exception:
    def list_user_devices_pg(user_id: str) -> List[Dict[str, Any]]:
        return []

    def sync_school_domain_from_state(state: Dict[str, Any]) -> None:
        return None


STATE_PATH = Path(__file__).resolve().parents[2] / "data" / "user_state.json"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now().isoformat()


def _norm_phone(phone: str) -> str:
    plus = phone.strip().startswith("+")
    digits = "".join(ch for ch in phone if ch.isdigit())
    if not digits:
        return ""
    return f"+{digits}" if plus else digits


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _norm_login(login: str) -> str:
    return str(login or "").strip().lower()


def _validate_login(login: str) -> str:
    normalized = _norm_login(login)
    if not re.fullmatch(r"[a-z0-9_-]{4,32}", normalized):
        raise ValueError("Логин должен содержать 4-32 символа: латинские буквы, цифры, _ или -")
    return normalized


def _validate_password(password: str) -> str:
    raw = str(password or "")
    if len(raw) < 8 or not re.search(r"[A-Za-zА-Яа-я]", raw) or not re.search(r"\d", raw):
        raise ValueError("Пароль должен быть не короче 8 символов и содержать буквы и цифры")
    return raw


def _hash_password(password: str) -> str:
    if bcrypt is not None:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 260000).hex()
    return f"pbkdf2_sha256$260000${salt}${digest}"


def _check_password(password: str, password_hash: str) -> bool:
    try:
        if str(password_hash or "").startswith("pbkdf2_sha256$"):
            _, rounds, salt, digest = str(password_hash).split("$", 3)
            candidate = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(rounds)).hex()
            return secrets.compare_digest(candidate, digest)
        if bcrypt is None:
            return False
        return bcrypt.checkpw(password.encode("utf-8"), str(password_hash or "").encode("utf-8"))
    except Exception:
        return False


def _auth_audit(state: Dict[str, Any], action: str, *, user_id: str | None = None, login: str | None = None, result: str = "ok", details: Dict[str, Any] | None = None) -> None:
    event = {
        "at": _now_iso(),
        "action": action,
        "userId": user_id,
        "loginHash": _sha256(_norm_login(login)) if login else None,
        "result": result,
        "details": details or {},
    }
    state.setdefault("auth_audit", []).append(event)
    state["auth_audit"] = state["auth_audit"][-5000:]


def _gen_token(prefix: str) -> str:
    return f"{prefix}_{secrets.token_urlsafe(32)}"


def _default_state() -> Dict[str, Any]:
    return {
        "users": {},
        "phones": {},
        "otp": {},
        "otp_requests": {},
        "consents": {},
        "entitlements": {},
        "device_sync": {},
        "sessions": {},
        "session_revocations": [],
        "telemetry": [],
        "learning_events": [],
        "payments": {},
        "payment_idempotency": {},
        "payment_webhook_events": {},
        "payment_webhook_dead_letters": [],
        "payment_audit": [],
        "role_overrides": {},
        "scope_overrides": {},
        "access_grants": {},
        "organizations": {},
        "schools": {},
        "school_sites": {},
        "school_licenses": {},
        "school_classes": {},
        "school_invite_codes": {},
        "school_memberships": {},
        "device_registry": {},
        "device_recovery_codes": {},
        "logins": {},
        "password_reset_codes": {},
        "auth_audit": [],
        "login_attempts": {},
    }


def _read_state() -> Dict[str, Any]:
    if not STATE_PATH.exists():
        return _default_state()
    try:
        raw = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        base = _default_state()
        base.update(raw)
        return base
    except Exception:
        return _default_state()


def _write_state(state: Dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def _default_entitlements() -> Dict[str, Any]:
    return {
        "plans": ["free"],
        "modules": ["chemistry_core"],
        "ai_quota_left": 20,
    }


def _prune_timestamps(timestamps: List[str], seconds: int) -> List[str]:
    now = _now()
    out: List[str] = []
    for ts in timestamps:
        try:
            dt = datetime.fromisoformat(ts)
        except Exception:
            continue
        if (now - dt).total_seconds() <= seconds:
            out.append(ts)
    return out


def _rate_limit_key(kind: str, value: str) -> str:
    return f"{kind}:{_sha256(str(value or '').strip().lower())}"


def _check_attempt_limit(state: Dict[str, Any], kind: str, value: str, *, limit: int = 5, window_sec: int = 900, lock_min: int = 15) -> None:
    key = _rate_limit_key(kind, value)
    attempts = state.setdefault("login_attempts", {}).get(key, {"timestamps": [], "lockedUntil": None})
    locked_until = attempts.get("lockedUntil")
    if locked_until:
        try:
            if _now() < datetime.fromisoformat(str(locked_until)):
                raise ValueError("Слишком много попыток. Попробуйте позже.")
        except ValueError:
            raise
        except Exception:
            attempts["lockedUntil"] = None
    attempts["timestamps"] = _prune_timestamps(attempts.get("timestamps", []), window_sec)
    state.setdefault("login_attempts", {})[key] = attempts


def _record_attempt_failure(state: Dict[str, Any], kind: str, value: str, *, limit: int = 5, window_sec: int = 900, lock_min: int = 15) -> None:
    key = _rate_limit_key(kind, value)
    attempts = state.setdefault("login_attempts", {}).get(key, {"timestamps": [], "lockedUntil": None})
    attempts["timestamps"] = _prune_timestamps(attempts.get("timestamps", []), window_sec)
    attempts["timestamps"].append(_now_iso())
    if len(attempts["timestamps"]) >= limit:
        attempts["lockedUntil"] = (_now() + timedelta(minutes=lock_min)).isoformat()
    state.setdefault("login_attempts", {})[key] = attempts


def _clear_attempts(state: Dict[str, Any], kind: str, value: str) -> None:
    state.setdefault("login_attempts", {}).pop(_rate_limit_key(kind, value), None)


def request_phone_code(phone: str) -> Dict[str, Any]:
    state = _read_state()
    normalized = _norm_phone(phone)
    if not normalized:
        raise ValueError("Phone is required")

    req = state["otp_requests"].get(normalized, {"timestamps": []})
    req["timestamps"] = _prune_timestamps(req.get("timestamps", []), settings.OTP_REQUEST_WINDOW_SEC)
    if len(req["timestamps"]) >= settings.OTP_REQUEST_LIMIT:
        raise ValueError("Too many OTP requests. Try later.")

    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = (_now() + timedelta(minutes=settings.OTP_TTL_MIN)).isoformat()

    state["otp"][normalized] = {
        "codeHash": _sha256(code),
        "expiresAt": expires_at,
        "attempts": 0,
        "lockedUntil": None,
    }
    req["timestamps"].append(_now_iso())
    state["otp_requests"][normalized] = req

    sms_result = send_otp_sms(normalized, code)
    _write_state(state)

    out = {"phone": normalized, "expiresAt": expires_at}
    if settings.ENV.lower() == "dev":
        out["debugCode"] = code
    out["smsStatus"] = sms_result.get("status", "unknown")
    return out


def _merge_versions(a: Dict[str, str], b: Dict[str, str]) -> Dict[str, str]:
    merged = dict(a)
    for k, v in b.items():
        if k not in merged or str(v) > str(merged[k]):
            merged[k] = v
    return merged


def _merge_user_state(state: Dict[str, Any], canonical_user: str, local_user: Optional[str], purchases: List[str], content_versions: Dict[str, str], preferences: Dict[str, Any]) -> None:
    if canonical_user not in state["entitlements"]:
        state["entitlements"][canonical_user] = _default_entitlements()

    canonical_ent = state["entitlements"][canonical_user]
    canonical_ent["modules"] = sorted(set(canonical_ent.get("modules", []) + purchases))

    canonical_snap = state["device_sync"].get(
        canonical_user,
        {
            "userId": canonical_user,
            "contentVersions": {},
            "purchases": canonical_ent["modules"],
            "preferences": {},
        },
    )
    canonical_snap["contentVersions"] = _merge_versions(canonical_snap.get("contentVersions", {}), content_versions)
    canonical_snap["purchases"] = sorted(set(canonical_snap.get("purchases", []) + purchases))
    canonical_snap["preferences"] = {**canonical_snap.get("preferences", {}), **preferences}
    state["device_sync"][canonical_user] = canonical_snap

    if local_user and local_user != canonical_user:
        local_ent = state["entitlements"].get(local_user)
        if local_ent:
            canonical_ent["modules"] = sorted(set(canonical_ent.get("modules", []) + local_ent.get("modules", [])))

        local_snap = state["device_sync"].get(local_user)
        if local_snap:
            canonical_snap["contentVersions"] = _merge_versions(
                canonical_snap.get("contentVersions", {}),
                local_snap.get("contentVersions", {}),
            )
            canonical_snap["purchases"] = sorted(set(canonical_snap.get("purchases", []) + local_snap.get("purchases", [])))
            canonical_snap["preferences"] = {**local_snap.get("preferences", {}), **canonical_snap.get("preferences", {})}

        local_consent = state["consents"].get(local_user)
        if local_consent and canonical_user not in state["consents"]:
            state["consents"][canonical_user] = local_consent

        state["entitlements"].pop(local_user, None)
        state["device_sync"].pop(local_user, None)
        state["consents"].pop(local_user, None)


def _create_session(state: Dict[str, Any], user_id: str, role: str | None = None) -> Dict[str, str]:
    normalized_role = role or "student"
    refresh_expires_at = (_now() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS)).isoformat()
    session_id = secrets.token_hex(16)
    access_token, access_expires_at, access_jti = build_access_token(
        user_id=user_id,
        role=normalized_role,
        session_id=session_id,
    )
    refresh_token = _gen_token("ref")

    state["sessions"][session_id] = {
        "userId": user_id,
        "role": normalized_role,
        "accessJti": access_jti,
        "accessExpiresAt": access_expires_at,
        "refreshHash": _sha256(refresh_token),
        "expiresAt": refresh_expires_at,
        "revoked": False,
        "createdAt": _now_iso(),
    }

    return {
        "accessToken": access_token,
        "accessTokenExpiresAt": access_expires_at,
        "refreshToken": refresh_token,
        "refreshTokenExpiresAt": refresh_expires_at,
    }


def verify_phone_code(
    phone: str,
    code: str,
    local_user_id: Optional[str] = None,
    local_purchases: Optional[List[str]] = None,
    local_content_versions: Optional[Dict[str, str]] = None,
    local_preferences: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    state = _read_state()
    normalized = _norm_phone(phone)
    otp = state["otp"].get(normalized)
    if not otp:
        raise ValueError("OTP not requested")

    if otp.get("lockedUntil"):
        locked_until = datetime.fromisoformat(otp["lockedUntil"])
        if _now() < locked_until:
            raise ValueError("OTP temporarily locked due to too many attempts")

    expires_at = datetime.fromisoformat(otp["expiresAt"])
    if _now() > expires_at:
        state["otp"].pop(normalized, None)
        _write_state(state)
        raise ValueError("OTP expired")

    if _sha256(str(code)) != str(otp.get("codeHash", "")):
        otp["attempts"] = int(otp.get("attempts", 0)) + 1
        if otp["attempts"] >= settings.OTP_MAX_VERIFY_ATTEMPTS:
            otp["lockedUntil"] = (_now() + timedelta(minutes=settings.OTP_LOCK_MIN)).isoformat()
        state["otp"][normalized] = otp
        _write_state(state)
        raise ValueError("Invalid OTP")

    user_id = state["phones"].get(normalized)
    if not user_id:
        user_id = f"u_{secrets.token_hex(6)}"
        state["phones"][normalized] = user_id

    state["users"].setdefault(user_id, {"userId": user_id, "phone": normalized, "createdAt": _now_iso()})
    state["entitlements"].setdefault(user_id, _default_entitlements())

    _merge_user_state(
        state=state,
        canonical_user=user_id,
        local_user=local_user_id,
        purchases=local_purchases or [],
        content_versions=local_content_versions or {},
        preferences=local_preferences or {},
    )

    requested_role = None
    if isinstance(local_preferences, dict):
        requested_role = local_preferences.get("role")
    role = state.get("consents", {}).get(user_id, {}).get("role") or requested_role
    session_tokens = _create_session(state, user_id=user_id, role=role)

    state["otp"].pop(normalized, None)
    _write_state(state)

    return {
        "userId": user_id,
        "phone": normalized,
        **session_tokens,
    }


def attach_login_password(state: Dict[str, Any], user_id: str, login: str, password: str, display_name: str | None = None) -> Dict[str, Any]:
    normalized_login = _validate_login(login)
    raw_password = _validate_password(password)
    users = state.setdefault("users", {})
    user = users.get(user_id, {}) if isinstance(users.get(user_id), dict) else {}
    if not user:
        raise ValueError("Пользователь не найден")

    logins = state.setdefault("logins", {})
    existing_user_id = str(logins.get(normalized_login) or "").strip()
    if existing_user_id and existing_user_id != user_id:
        raise ValueError("Такой логин уже занят")

    old_login = _norm_login(user.get("login"))
    if old_login and old_login != normalized_login and logins.get(old_login) == user_id:
        logins.pop(old_login, None)

    user["login"] = normalized_login
    user["passwordHash"] = _hash_password(raw_password)
    user["passwordUpdatedAt"] = _now_iso()
    if display_name:
        user["displayName"] = str(display_name).strip()
    users[user_id] = user
    logins[normalized_login] = user_id
    state["logins"] = logins
    _auth_audit(state, "set_login_password", user_id=user_id, login=normalized_login)
    return {"userId": user_id, "login": normalized_login}


def login_with_password(login: str, password: str) -> Dict[str, Any]:
    state = _read_state()
    normalized_login = _norm_login(login)
    _check_attempt_limit(state, "password_login", normalized_login)
    user_id = str(state.setdefault("logins", {}).get(normalized_login) or "").strip()
    user = state.setdefault("users", {}).get(user_id, {}) if user_id else {}
    generic_error = "Неверный логин или пароль"
    if not user_id or not isinstance(user, dict) or not _check_password(str(password or ""), str(user.get("passwordHash") or "")):
        _record_attempt_failure(state, "password_login", normalized_login)
        _auth_audit(state, "login_password", login=normalized_login, result="failed")
        _write_state(state)
        raise ValueError(generic_error)

    _clear_attempts(state, "password_login", normalized_login)
    role = state.get("role_overrides", {}).get(user_id) or state.get("consents", {}).get(user_id, {}).get("role") or "student"
    tokens = _create_session(state, user_id=user_id, role=role)
    user["lastLoginAt"] = _now_iso()
    state["users"][user_id] = user
    _auth_audit(state, "login_password", user_id=user_id, login=normalized_login)
    _write_state(state)
    return {"userId": user_id, "login": normalized_login, "role": role, **tokens}


def create_password_reset_code(user_id: str, changed_by: str, ttl_hours: int = 72) -> Dict[str, Any]:
    state = _read_state()
    if user_id not in state.setdefault("users", {}):
        raise ValueError("Пользователь не найден")
    code = f"PWR-{secrets.randbelow(1000000):06d}"
    reset_id = f"pwd_reset_{secrets.token_hex(8)}"
    row = {
        "resetId": reset_id,
        "codeHash": _sha256(code),
        "userId": user_id,
        "status": "pending",
        "createdAt": _now_iso(),
        "expiresAt": (_now() + timedelta(hours=max(1, min(int(ttl_hours or 72), 168)))).isoformat(),
        "createdBy": changed_by,
    }
    state.setdefault("password_reset_codes", {})[reset_id] = row
    _auth_audit(state, "create_password_reset_code", user_id=user_id, result="issued", details={"createdBy": changed_by})
    _write_state(state)
    return {"userId": user_id, "resetCode": code, "expiresAt": row["expiresAt"]}


def reset_password_by_code(code: str, login: str, password: str) -> Dict[str, Any]:
    state = _read_state()
    normalized_login = _validate_login(login)
    raw_password = _validate_password(password)
    user_id = str(state.setdefault("logins", {}).get(normalized_login) or "").strip()
    if not user_id:
        _auth_audit(state, "reset_password_by_code", login=normalized_login, result="failed")
        _write_state(state)
        raise ValueError("Код восстановления недействителен")

    code_hash = _sha256(str(code or "").strip().upper())
    found_id = None
    found = None
    for reset_id, row in state.setdefault("password_reset_codes", {}).items():
        if isinstance(row, dict) and row.get("codeHash") == code_hash:
            found_id = reset_id
            found = row
            break
    if not found_id or not isinstance(found, dict) or str(found.get("userId") or "") != user_id or str(found.get("status") or "pending") != "pending":
        _auth_audit(state, "reset_password_by_code", user_id=user_id, login=normalized_login, result="failed")
        _write_state(state)
        raise ValueError("Код восстановления недействителен")

    expires_at = datetime.fromisoformat(str(found.get("expiresAt")))
    if _now() > expires_at:
        found["status"] = "expired"
        state["password_reset_codes"][found_id] = found
        _auth_audit(state, "reset_password_by_code", user_id=user_id, login=normalized_login, result="expired")
        _write_state(state)
        raise ValueError("Срок действия кода восстановления истёк")

    user = state.setdefault("users", {}).setdefault(user_id, {"userId": user_id, "createdAt": _now_iso()})
    user["passwordHash"] = _hash_password(raw_password)
    user["passwordUpdatedAt"] = _now_iso()
    found["status"] = "used"
    found["usedAt"] = _now_iso()
    state["password_reset_codes"][found_id] = found
    for sid, session in state.get("sessions", {}).items():
        if session.get("userId") == user_id:
            session["revoked"] = True
            state["sessions"][sid] = session
    role = state.get("role_overrides", {}).get(user_id) or state.get("consents", {}).get(user_id, {}).get("role") or "student"
    tokens = _create_session(state, user_id=user_id, role=role)
    _auth_audit(state, "reset_password_by_code", user_id=user_id, login=normalized_login)
    _write_state(state)
    return {"userId": user_id, "login": normalized_login, "role": role, **tokens}


def change_password(user_id: str, current_password: str, new_password: str) -> Dict[str, Any]:
    state = _read_state()
    user = state.setdefault("users", {}).get(user_id, {})
    login = _norm_login(user.get("login")) if isinstance(user, dict) else ""
    if not isinstance(user, dict) or not login or not _check_password(str(current_password or ""), str(user.get("passwordHash") or "")):
        _auth_audit(state, "change_password", user_id=user_id, login=login, result="failed")
        _write_state(state)
        raise ValueError("Неверный текущий пароль")
    user["passwordHash"] = _hash_password(_validate_password(new_password))
    user["passwordUpdatedAt"] = _now_iso()
    state["users"][user_id] = user
    _auth_audit(state, "change_password", user_id=user_id, login=login)
    _write_state(state)
    return {"ok": True, "userId": user_id}


def refresh_session(refresh_token: str) -> Dict[str, str]:
    state = _read_state()
    found_jti = None
    session = None
    hashed = _sha256(refresh_token)
    for jti, item in state["sessions"].items():
        if item.get("refreshHash") == hashed:
            found_jti = jti
            session = item
            break
    if not session or not found_jti:
        raise ValueError("Session not found")

    if session.get("revoked"):
        raise ValueError("Session revoked")

    expires_at = datetime.fromisoformat(session["expiresAt"])
    if _now() > expires_at:
        session["revoked"] = True
        state["sessions"][found_jti] = session
        _write_state(state)
        raise ValueError("Refresh token expired")

    user_id = session["userId"]
    role = state.get("role_overrides", {}).get(user_id) or state.get("consents", {}).get(user_id, {}).get("role") or session.get("role")

    session["revoked"] = True
    state["sessions"][found_jti] = session
    new_tokens = _create_session(state, user_id=user_id, role=role)
    _write_state(state)
    return new_tokens


def revoke_session(refresh_token: str) -> None:
    state = _read_state()
    hashed = _sha256(refresh_token)
    for jti, item in state["sessions"].items():
        if item.get("refreshHash") == hashed:
            item["revoked"] = True
            state["sessions"][jti] = item
            break
    _write_state(state)


def revoke_all_sessions(*, changed_by: str = "system", reason: str = "maintenance", user_id: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    revoked_count = 0
    now = _now_iso()
    normalized_user_id = str(user_id or "").strip()
    for sid, item in state.setdefault("sessions", {}).items():
        if not isinstance(item, dict):
            continue
        if normalized_user_id and str(item.get("userId") or "") != normalized_user_id:
            continue
        if item.get("revoked"):
            continue
        item["revoked"] = True
        item["revokedAt"] = now
        item["revokedBy"] = str(changed_by or "system")
        item["revokeReason"] = str(reason or "maintenance")
        state["sessions"][sid] = item
        revoked_count += 1

    event = {
        "at": now,
        "changedBy": str(changed_by or "system"),
        "reason": str(reason or "maintenance"),
        "userId": normalized_user_id or None,
        "revokedCount": revoked_count,
    }
    state.setdefault("session_revocations", []).append(event)
    state["session_revocations"] = state["session_revocations"][-500:]
    _auth_audit(
        state,
        "user_session_revoke_all" if normalized_user_id else "global_session_revoke_all",
        user_id=normalized_user_id or None,
        details={"changedBy": event["changedBy"], "reason": event["reason"], "revokedCount": revoked_count},
    )
    _write_state(state)
    return {"ok": True, **event}


def _device_limit_for_role(role: str | None) -> int:
    normalized = str(role or "student").strip().lower() or "student"
    limits = {
        "student": 3,
        "learner": 3,
        "parent": 3,
        "teacher": 5,
        "homeroom_teacher": 5,
        "school_admin": 5,
        "content_editor": 5,
        "support": 5,
        "admin": 5,
        "owner": 10,
    }
    return int(limits.get(normalized, 3))



def list_user_devices(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    role = state.get("role_overrides", {}).get(user_id) or state.get("consents", {}).get(user_id, {}).get("role") or "student"
    sync_school_domain_from_state(state)
    try:
        pg_items = []
        for row in list_user_devices_pg(user_id):
            item = dict(row)
            for key in ("trustedAt", "lastSeenAt", "revokedAt"):
                if item.get(key) is not None and hasattr(item.get(key), "isoformat"):
                    item[key] = item[key].isoformat()
            pg_items.append(item)
        if pg_items:
            return {"userId": user_id, "limit": _device_limit_for_role(role), "items": pg_items}
    except Exception:
        pass
    registry = state.setdefault("device_registry", {}).get(user_id, {})
    items = []
    for device_id, row in registry.items():
        if not isinstance(row, dict):
            continue
        item = dict(row)
        item["deviceId"] = device_id
        items.append(item)
    items.sort(key=lambda x: str(x.get("lastSeenAt") or x.get("trustedAt") or ""), reverse=True)
    return {"userId": user_id, "limit": _device_limit_for_role(role), "items": items}



def register_user_device(user_id: str, role: str | None, device_id: str, label: str | None, platform: str | None, session_id: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    normalized_device_id = str(device_id or "").strip()
    if not normalized_device_id:
        raise ValueError("deviceId обязателен")
    registry_root = state.setdefault("device_registry", {})
    user_registry = registry_root.setdefault(user_id, {}) if isinstance(registry_root.get(user_id), dict) else {}
    active_count = len([1 for row in user_registry.values() if isinstance(row, dict) and row.get("active", True)])
    row = user_registry.get(normalized_device_id, {}) if isinstance(user_registry.get(normalized_device_id), dict) else {}
    is_new = not row
    if is_new and active_count >= _device_limit_for_role(role):
        raise ValueError("Достигнут лимит устройств")
    row.update({
        "label": str(label or "").strip() or "Устройство",
        "platform": str(platform or "").strip() or None,
        "active": True,
        "trustedAt": row.get("trustedAt") or _now_iso(),
        "lastSeenAt": _now_iso(),
    })
    user_registry[normalized_device_id] = row
    registry_root[user_id] = user_registry
    state["device_registry"] = registry_root
    if session_id and session_id in state.get("sessions", {}):
        session = state["sessions"][session_id]
        if session.get("userId") == user_id and not session.get("revoked"):
            session["deviceId"] = normalized_device_id
            session["deviceBoundAt"] = _now_iso()
            state["sessions"][session_id] = session
    _auth_audit(state, "device_register", user_id=user_id, result="ok", details={"deviceHash": _sha256(normalized_device_id), "platform": platform})
    _write_state(state)
    sync_school_domain_from_state(state)
    return {"deviceId": normalized_device_id, **row, "limit": _device_limit_for_role(role)}



def revoke_user_device(user_id: str, device_id: str) -> Dict[str, Any]:
    state = _read_state()
    registry_root = state.setdefault("device_registry", {})
    user_registry = registry_root.get(user_id, {}) if isinstance(registry_root.get(user_id), dict) else {}
    row = user_registry.get(device_id)
    if not isinstance(row, dict):
        raise ValueError("Устройство не найдено")
    row["active"] = False
    row["revokedAt"] = _now_iso()
    user_registry[device_id] = row
    registry_root[user_id] = user_registry
    state["device_registry"] = registry_root
    for sid, session in state.get("sessions", {}).items():
        if session.get("userId") == user_id and session.get("deviceId") == device_id:
            session["revoked"] = True
            state["sessions"][sid] = session
    _auth_audit(state, "device_revoke", user_id=user_id, result="ok", details={"deviceHash": _sha256(str(device_id or ''))})
    _write_state(state)
    sync_school_domain_from_state(state)
    return {"ok": True, "userId": user_id, "deviceId": device_id}



def reset_user_devices(user_id: str, changed_by: str, school_id: str | None = None, class_id: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    registry_root = state.setdefault("device_registry", {})
    user_registry = registry_root.get(user_id, {}) if isinstance(registry_root.get(user_id), dict) else {}
    reset_count = 0
    for device_id, row in user_registry.items():
        if isinstance(row, dict) and row.get("active", True):
            row["active"] = False
            row["revokedAt"] = _now_iso()
            user_registry[device_id] = row
            reset_count += 1
    registry_root[user_id] = user_registry
    state["device_registry"] = registry_root
    for sid, session in state.get("sessions", {}).items():
        if session.get("userId") == user_id:
            session["revoked"] = True
            state["sessions"][sid] = session
    code = f"RST-{abs(hash((user_id, changed_by, _now_iso()))) % 1000000:06d}"
    state.setdefault("device_recovery_codes", {})[code] = {
        "code": code,
        "userId": user_id,
        "schoolId": school_id,
        "classId": class_id,
        "status": "pending",
        "createdAt": _now_iso(),
        "expiresAt": (_now() + timedelta(days=3)).isoformat(),
        "createdBy": changed_by,
    }
    _write_state(state)
    sync_school_domain_from_state(state)
    return {"ok": True, "userId": user_id, "resetDevices": reset_count, "recoveryCode": code, "expiresAt": state["device_recovery_codes"][code]["expiresAt"]}



def activate_device_recovery_code(code: str, phone: str, display_name: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    normalized_code = str(code or "").strip().upper()
    if not normalized_code:
        raise ValueError("Код восстановления обязателен")
    normalized_phone = _norm_phone(phone)
    if not normalized_phone:
        raise ValueError("Телефон обязателен")
    _check_attempt_limit(state, "device_recovery", normalized_phone, limit=5, window_sec=900, lock_min=15)
    row = state.setdefault("device_recovery_codes", {}).get(normalized_code)
    if not isinstance(row, dict):
        _record_attempt_failure(state, "device_recovery", normalized_phone, limit=5, window_sec=900, lock_min=15)
        _write_state(state)
        raise ValueError("Код восстановления не найден")
    if str(row.get("status") or "pending") != "pending":
        raise ValueError("Код восстановления уже использован")
    expires_at = datetime.fromisoformat(str(row.get("expiresAt")))
    if _now() > expires_at:
        row["status"] = "expired"
        state["device_recovery_codes"][normalized_code] = row
        _write_state(state)
        raise ValueError("Срок действия кода восстановления истёк")
    user_id = str(row.get("userId") or "").strip()
    if not user_id:
        raise ValueError("Код восстановления поврежден")
    state.setdefault("phones", {})[normalized_phone] = user_id
    user = state.setdefault("users", {}).setdefault(user_id, {"userId": user_id, "createdAt": _now_iso()})
    user["phone"] = normalized_phone
    if display_name:
        user["displayName"] = str(display_name).strip()
    role = state.get("role_overrides", {}).get(user_id) or state.get("consents", {}).get(user_id, {}).get("role") or "student"
    tokens = _create_session(state, user_id=user_id, role=role)
    row["status"] = "activated"
    row["activatedAt"] = _now_iso()
    state["device_recovery_codes"][normalized_code] = row
    _clear_attempts(state, "device_recovery", normalized_phone)
    _auth_audit(state, "device_recovery_activate", user_id=user_id, result="ok")
    _write_state(state)
    sync_school_domain_from_state(state)
    return {"userId": user_id, "phone": normalized_phone, "role": role, **tokens}


def resolve_access_token(access_token: str) -> Dict[str, Any]:
    state = _read_state()
    try:
        payload = decode_token(access_token)
    except Exception as e:
        raise ValueError("Invalid access token") from e

    token_type = str(payload.get("type") or "")
    user_id = str(payload.get("sub") or "")
    session_id = str(payload.get("sid") or "")
    access_jti = str(payload.get("jti") or "")
    role = payload.get("role")

    if token_type != "access":
        raise ValueError("Invalid token type")
    if not user_id or not session_id or not access_jti:
        raise ValueError("Invalid access token claims")

    session = state["sessions"].get(session_id)
    if not session:
        raise ValueError("Session not found")

    if session.get("revoked"):
        raise ValueError("Session revoked")

    if str(session.get("userId") or "") != user_id:
        raise ValueError("Session user mismatch")

    if str(session.get("accessJti") or "") != access_jti:
        raise ValueError("Session token mismatch")

    access_expires_at = datetime.fromisoformat(session["accessExpiresAt"])
    if _now() > access_expires_at:
        raise ValueError("Access token expired")

    effective_role = state.get("role_overrides", {}).get(user_id) or role or session.get("role") or "student"

    return {
        "jti": access_jti,
        "sid": session_id,
        "userId": user_id,
        "role": effective_role,
        "accessExpiresAt": session["accessExpiresAt"],
    }


def save_consent(user_id: str, role: str, version: str, accepted_at: Optional[str], parent_approved: bool) -> Dict[str, Any]:
    state = _read_state()
    data = {
        "userId": user_id,
        "role": role,
        "version": version,
        "acceptedAt": accepted_at or _now_iso(),
        "parentApproved": parent_approved,
    }
    state["consents"][user_id] = data
    state["entitlements"].setdefault(user_id, _default_entitlements())
    _write_state(state)
    return data


def get_consent(user_id: str) -> Optional[Dict[str, Any]]:
    state = _read_state()
    return state["consents"].get(user_id)


def get_entitlements(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    ent = state["entitlements"].get(user_id)
    if not ent:
        ent = _default_entitlements()
        state["entitlements"][user_id] = ent
        _write_state(state)
    return {
        "userId": user_id,
        "plans": ent["plans"],
        "modules": ent["modules"],
        "aiQuotaLeft": ent["ai_quota_left"],
    }


def save_device_sync(user_id: str, content_versions: Dict[str, str], purchases: List[str], preferences: Dict[str, Any]) -> Dict[str, Any]:
    state = _read_state()
    data = {
        "userId": user_id,
        "contentVersions": content_versions,
        "purchases": purchases,
        "preferences": preferences,
    }
    state["device_sync"][user_id] = data

    ent = state["entitlements"].setdefault(user_id, _default_entitlements())
    ent["modules"] = sorted(set(ent.get("modules", []) + purchases))

    _write_state(state)
    return data


def get_device_sync(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    data = state["device_sync"].get(user_id)
    if data:
        return data
    return {
        "userId": user_id,
        "contentVersions": {"chemistry_core": "v1"},
        "purchases": get_entitlements(user_id).get("modules", []),
        "preferences": {"theme": "midnight", "appMode": "standard"},
    }


def export_user_data(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    user = state.setdefault("users", {}).get(user_id, {}) if user_id else {}
    if not isinstance(user, dict) or not user:
        raise ValueError("Пользователь не найден")
    devices = list_user_devices(user_id)
    payload = {
        "userId": user_id,
        "generatedAt": _now_iso(),
        "profile": {k: v for k, v in user.items() if k not in {"passwordHash"}},
        "consent": state.setdefault("consents", {}).get(user_id),
        "entitlements": state.setdefault("entitlements", {}).get(user_id),
        "deviceSync": state.setdefault("device_sync", {}).get(user_id),
        "devices": devices.get("items", []),
        "accessGrants": state.setdefault("access_grants", {}).get(user_id, []),
        "sessions": [
            {"sid": sid, "role": row.get("role"), "createdAt": row.get("createdAt"), "expiresAt": row.get("expiresAt"), "revoked": row.get("revoked", False), "deviceId": row.get("deviceId")}
            for sid, row in state.setdefault("sessions", {}).items()
            if isinstance(row, dict) and row.get("userId") == user_id
        ],
    }
    _auth_audit(state, "user_data_export", user_id=user_id)
    _write_state(state)
    return payload


def delete_user_data(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    users = state.setdefault("users", {})
    user = users.get(user_id, {}) if isinstance(users.get(user_id), dict) else {}
    if not user:
        raise ValueError("Пользователь не найден")
    login = _norm_login(user.get("login"))
    phone = str(user.get("phone") or "")
    if login:
        state.setdefault("logins", {}).pop(login, None)
    if phone and state.setdefault("phones", {}).get(phone) == user_id:
        state.setdefault("phones", {}).pop(phone, None)
    for sid, session in state.setdefault("sessions", {}).items():
        if isinstance(session, dict) and session.get("userId") == user_id:
            session["revoked"] = True
            state["sessions"][sid] = session
    users[user_id] = {
        "userId": user_id,
        "deleted": True,
        "deletedAt": _now_iso(),
        "phoneHash": _sha256(phone) if phone else None,
        "loginHash": _sha256(login) if login else None,
    }
    for key in ["consents", "entitlements", "device_sync", "device_registry", "access_grants", "role_overrides", "user_role_modes"]:
        bucket = state.setdefault(key, {})
        if isinstance(bucket, dict):
            bucket.pop(user_id, None)
    _auth_audit(state, "user_data_delete", user_id=user_id, result="ok")
    _write_state(state)
    return {"ok": True, "userId": user_id, "deletedAt": users[user_id]["deletedAt"]}


def ingest_telemetry(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    state = _read_state()
    received_at = _now_iso()
    for event in events:
        state["telemetry"].append({**event, "receivedAt": received_at})
    state["telemetry"] = state["telemetry"][-5000:]
    _write_state(state)
    return {"accepted": len(events), "receivedAt": received_at}


def _project_learning_event_to_teacher_live(state: Dict[str, Any], event: Dict[str, Any], received_at: str) -> None:
    session_id = str(event.get("sessionId") or "").strip()
    if not session_id:
        return

    teacher_live = state.setdefault("teacher_live", {})
    sessions = teacher_live.setdefault("sessions", {})
    session = sessions.get(session_id)
    if not session or str(session.get("status") or "") != "active":
        return

    outcome = str(event.get("outcome") or "").strip().lower()
    if outcome not in {"correct", "wrong", "pending"}:
        return

    task_id = str(event.get("taskId") or "unknown").strip() or "unknown"
    lesson_id = str(event.get("lessonId") or "general").strip() or "general"
    classroom = str(event.get("classroom") or "general").strip() or "general"
    user_id = str(event.get("userId") or "unknown").strip() or "unknown"
    mistake_tag = str(event.get("mistakeTag") or "general_concept").strip() or "general_concept"

    participants = session.setdefault("participants", {})
    if user_id not in participants:
        session["studentsJoined"] = int(session.get("studentsJoined") or 0) + 1
        participants[user_id] = {
            "joinedAt": received_at,
            "classroom": classroom,
            "role": str(event.get("role") or "student"),
            "rosterMatched": None,
        }

    key = f"{task_id}::{lesson_id}"
    attempts = session.setdefault("attempts", {})
    stats = attempts.setdefault(key, {"ok": 0, "wrong": 0, "pending": 0})
    if outcome == "correct":
        stats["ok"] = int(stats.get("ok") or 0) + 1
    elif outcome == "wrong":
        stats["wrong"] = int(stats.get("wrong") or 0) + 1
    else:
        stats["pending"] = int(stats.get("pending") or 0) + 1

    event_payload = {
        "at": received_at,
        "sessionId": session_id,
        "teacherUserId": session.get("teacherUserId"),
        "studentId": user_id,
        "event": outcome,
        "taskId": task_id,
        "lessonId": lesson_id,
        "classroom": classroom,
        "mistakeTag": mistake_tag,
        "source": "learning_event",
    }

    session_events = session.setdefault("events", [])
    session_events.append(event_payload)
    session["events"] = session_events[-5000:]

    global_events = teacher_live.setdefault("events", [])
    global_events.append(event_payload)
    teacher_live["events"] = global_events[-5000:]

    session["updatedAt"] = received_at


def ingest_learning_events(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    state = _read_state()
    received_at = _now_iso()
    for event in events:
        payload = dict(event)
        base_payload = payload.get("payload") if isinstance(payload.get("payload"), dict) else {}
        duration_sec = base_payload.get("durationSec")
        flags: List[str] = []
        try:
            d = float(duration_sec) if duration_sec is not None else None
            if d is not None and d < 2.0:
                flags.append("too_fast_answer")
        except Exception:
            pass
        if flags:
            payload["integrityFlags"] = flags

        state["learning_events"].append({**payload, "receivedAt": received_at})
        _project_learning_event_to_teacher_live(state, payload, received_at)

    state["learning_events"] = state["learning_events"][-10000:]
    _write_state(state)
    return {"accepted": len(events), "receivedAt": received_at}
