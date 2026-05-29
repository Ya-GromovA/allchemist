from __future__ import annotations

import glob
import csv
import io
import json
import os
import re
import sqlite3
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.security.policies import ALL_KNOWN_ROLES, ROLE_SCOPES
from app.core.config import settings
from app.services.ui_labels import (
    ACCESS_SOURCE_LABELS_RU,
    FEATURE_LABELS_RU,
    MODULE_LABELS_RU,
    PLAN_LABELS_RU,
    ROLE_LABELS_RU,
    access_source_label,
    feature_label,
    module_label,
    plan_label,
    role_label,
)
from app.services.user_state_store import _create_session, _read_state, _write_state, attach_login_password
try:
    from app.services.pg_school_store import list_access_grants_pg, list_school_classes_pg, list_school_invites_pg, sync_school_domain_from_state
except Exception:
    def sync_school_domain_from_state(state: Dict[str, Any]) -> None:
        return None

    def list_access_grants_pg(user_id: str) -> List[Dict[str, Any]]:
        return []

    def list_school_classes_pg(school_id: str | None = None) -> List[Dict[str, Any]]:
        return []

    def list_school_invites_pg(school_id: str | None = None, role: str | None = None) -> List[Dict[str, Any]]:
        return []


_DATA_ROOT = Path(__file__).resolve().parents[2] / "data"
_USER_STATE_PATH = _DATA_ROOT / "user_state.json"
_SECURITY_STATUS_PATH = _DATA_ROOT / "security" / "backup_dry_run_status.json"
_SECURITY_HISTORY_PATH = _DATA_ROOT / "security" / "backup_dry_run_history.json"
_SECURITY_ALERT_ACK_PATH = _DATA_ROOT / "security" / "alerts_ack.json"
_SECURITY_MOBILE_SMOKE_PATH = _DATA_ROOT / "security" / "mobile_onboarding_smoke_status.json"
_GO_NO_GO_HISTORY_PATH = _DATA_ROOT / "security" / "go_no_go_history.json"
_HANDOVER_ARCHIVE_PATH = _DATA_ROOT / "security" / "handover_archive.json"


SCOPE_LABELS_RU = {
    "auth:me": "Проверка текущей сессии",
    "user:read_self": "Чтение своего профиля",
    "user:sync_self": "Синхронизация своих данных",
    "user:profile_self": "Профиль пользователя",
    "telemetry:write_self": "Отправка своих событий",
    "payments:admin": "Платежи и финансовые операции",
    "cabinet:teacher": "Кабинет учителя",
    "cabinet:parent": "Родительский кабинет",
    "admin:panel": "Вход в админ-панель",
    "admin:roles": "Управление ролями",
    "admin:rights": "Управление правами доступа",
    "admin:subscriptions": "Управление лицензиями и подписками",
}

PARTNER_ORGANIZATION_ID = "org_2070"
PARTNER_SCHOOL_ID = "school_2070"
PARTNER_SITE_ID = "site_2070_new_star"
PARTNER_LICENSE_ID = "license_2070_new_star_partner_2026"


def _label_role(value: str | None) -> str:
    return role_label(value)


def _label_scope(value: str | None) -> str:
    key = str(value or "").strip()
    return SCOPE_LABELS_RU.get(key, key or "—")


def _label_plan(value: str | None) -> str:
    return plan_label(value)


def _label_module(value: str | None) -> str:
    return module_label(value)


def _modules_label(values: List[str]) -> str:
    labels = [_label_module(value) for value in values if str(value or "").strip()]
    return ", ".join(labels) if labels else "Базовый доступ"


def _label_feature(value: str | None) -> str:
    return feature_label(value)


def _label_access_source(value: str | None) -> str:
    return access_source_label(value)


def _ensure_school_seed_state(state: Dict[str, Any]) -> None:
    organizations = state.setdefault("organizations", {})
    schools = state.setdefault("schools", {})
    school_sites = state.setdefault("school_sites", {})
    school_licenses = state.setdefault("school_licenses", {})
    organizations.setdefault(PARTNER_ORGANIZATION_ID, {
        "organizationId": PARTNER_ORGANIZATION_ID,
        "title": "Школа №2070",
        "type": "school_network",
        "createdAt": _now_iso(),
    })
    schools.setdefault(PARTNER_SCHOOL_ID, {
        "schoolId": PARTNER_SCHOOL_ID,
        "organizationId": PARTNER_ORGANIZATION_ID,
        "title": "Школа №2070",
        "status": "active",
        "createdAt": _now_iso(),
    })
    school_sites.setdefault(PARTNER_SITE_ID, {
        "siteId": PARTNER_SITE_ID,
        "schoolId": PARTNER_SCHOOL_ID,
        "title": "Новая звезда",
        "status": "active",
        "createdAt": _now_iso(),
    })
    school_licenses.setdefault(PARTNER_LICENSE_ID, {
        "licenseId": PARTNER_LICENSE_ID,
        "organizationId": PARTNER_ORGANIZATION_ID,
        "schoolId": PARTNER_SCHOOL_ID,
        "siteId": PARTNER_SITE_ID,
        "title": "Партнёрская школьная лицензия",
        "accessType": "partner_license",
        "status": "active",
        "priceRub": 0,
        "periodLabel": "Учебный год",
        "startsAt": "2026-09-01T00:00:00+03:00",
        "expiresAt": "2027-05-31T23:59:59+03:00",
        "modules": ["chemistry_core", "physics_core", "biology_core", "chemistry_pro_lab", "exam_pack"],
        "features": ["molecules_3d", "virtual_reactions", "virtual_labs", "ai_basic", "ai_extended", "offline_ai", "teacher_cabinet", "live_lesson", "lesson_demo", "parent_analytics", "exam_mode", "tickets_mode", "offline_mode"],
        "limits": {"students": 1200, "teachers": 120, "aiRequests": 250000, "devices": 3600},
        "partnerStatusLabel": "Партнёрский доступ",
        "schoolAccessLabel": "Полный доступ школы",
        "createdAt": _now_iso(),
    })


def _slugify_school_id(value: str, prefix: str) -> str:
    src = re.sub(r"[^a-z0-9]+", "_", str(value or "").lower()).strip("_")
    if not src:
        src = "school"
    return f"{prefix}_{src[:48]}"


def _active_access_grants_for_user(state: Dict[str, Any], user_id: str) -> List[Dict[str, Any]]:
    grants_map = state.setdefault("access_grants", {})
    raw = grants_map.get(user_id, []) if isinstance(grants_map, dict) else []
    rows = [row for row in raw if isinstance(row, dict)]
    now = datetime.now(timezone.utc)
    out: List[Dict[str, Any]] = []
    for row in rows:
        if str(row.get("status") or "active") != "active":
            continue
        expires_at = _parse_iso_datetime(row.get("expiresAt"))
        if expires_at and expires_at < now:
            continue
        out.append(row)
    return out


def _format_access_grant(grant: Dict[str, Any]) -> Dict[str, Any]:
    plan = str(grant.get("plan") or "").strip() or None
    module_id = str(grant.get("moduleId") or "").strip() or None
    feature = str(grant.get("feature") or "").strip() or None
    title = str(grant.get("title") or "").strip() or _label_access_source(grant.get("sourceType"))
    parts = [title]
    if plan:
        parts.append(_label_plan(plan))
    if module_id:
        parts.append(_label_module(module_id))
    if feature:
        parts.append(_label_feature(feature))
    return {
        "grantId": grant.get("grantId"),
        "sourceType": grant.get("sourceType"),
        "sourceLabelRu": _label_access_source(grant.get("sourceType")),
        "title": title,
        "status": grant.get("status") or "active",
        "statusLabelRu": "Активен" if str(grant.get("status") or "active") == "active" else "Неактивен",
        "plan": plan,
        "planLabelRu": _label_plan(plan) if plan else None,
        "moduleId": module_id,
        "moduleLabelRu": _label_module(module_id) if module_id else None,
        "feature": feature,
        "featureLabelRu": _label_feature(feature) if feature else None,
        "organizationId": grant.get("organizationId"),
        "schoolId": grant.get("schoolId"),
        "siteId": grant.get("siteId"),
        "licenseId": grant.get("licenseId"),
        "priceRub": grant.get("priceRub"),
        "startsAt": grant.get("startsAt"),
        "expiresAt": grant.get("expiresAt"),
        "summaryRu": " · ".join([part for part in parts if part]),
    }


def _apply_access_grants_to_entitlements(state: Dict[str, Any], user_id: str) -> None:
    ent = state.setdefault("entitlements", {}).setdefault(user_id, {"plans": ["free"], "modules": [], "ai_quota_left": 20})
    legacy_plans = [str(x) for x in ent.get("legacyPlans", []) if str(x).strip()]
    legacy_modules = [str(x) for x in ent.get("legacyModules", []) if str(x).strip()]
    if not legacy_plans and ent.get("plans"):
        legacy_plans = [str(x) for x in ent.get("plans", []) if str(x).strip() and str(x) != "free"]
        ent["legacyPlans"] = sorted(set(legacy_plans))
    if not legacy_modules and ent.get("modules"):
        legacy_modules = [str(x) for x in ent.get("modules", []) if str(x).strip()]
        ent["legacyModules"] = sorted(set(legacy_modules))

    plans = set(legacy_plans)
    modules = set(legacy_modules)
    features = set(str(x) for x in ent.get("features", []) if str(x).strip())
    ai_quota = max(int(ent.get("ai_quota_left", 20) or 20), 20)

    for grant in _active_access_grants_for_user(state, user_id):
        if grant.get("plan"):
            plans.add(str(grant.get("plan")))
        if grant.get("moduleId"):
            modules.add(str(grant.get("moduleId")))
        if grant.get("feature"):
            features.add(str(grant.get("feature")))
        if isinstance(grant.get("features"), list):
            features.update(str(x) for x in grant.get("features", []) if str(x).strip())
        if isinstance(grant.get("modules"), list):
            modules.update(str(x) for x in grant.get("modules", []) if str(x).strip())
        if isinstance(grant.get("plans"), list):
            plans.update(str(x) for x in grant.get("plans", []) if str(x).strip())

    ent["plans"] = sorted(plans) if plans else ["free"]
    ent["modules"] = sorted(modules)
    ent["features"] = sorted(features)
    ent["ai_quota_left"] = ai_quota


def list_user_access_grants(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    sync_school_domain_from_state(state)
    try:
        pg_rows = list_access_grants_pg(user_id)
        if pg_rows:
            grants = []
            for row in pg_rows:
                grants.append(_format_access_grant({
                    "grantId": row.get("grant_id"),
                    "sourceType": row.get("source_type"),
                    "title": row.get("title"),
                    "status": row.get("status"),
                    "organizationId": row.get("organization_id"),
                    "schoolId": row.get("school_id"),
                    "siteId": row.get("site_id"),
                    "licenseId": row.get("license_id"),
                    "priceRub": row.get("price_rub"),
                    "plan": row.get("plan"),
                    "moduleId": row.get("module_id"),
                    "feature": row.get("feature"),
                    "plans": row.get("plans") or [],
                    "modules": row.get("modules") or [],
                    "features": row.get("features") or [],
                    "startsAt": row.get("starts_at").isoformat() if row.get("starts_at") else None,
                    "expiresAt": row.get("expires_at").isoformat() if row.get("expires_at") else None,
                }))
            return {"userId": user_id, "items": grants}
    except Exception:
        pass
    grants = [_format_access_grant(row) for row in _active_access_grants_for_user(state, user_id)]
    grants.sort(key=lambda x: (str(x.get("expiresAt") or "9999"), str(x.get("summaryRu") or "")))
    return {"userId": user_id, "items": grants}


def create_access_grant(user_id: str, source_type: str, title: str | None, plan: str | None, module_id: str | None, feature: str | None, organization_id: str | None, school_id: str | None, site_id: str | None, license_id: str | None, expires_at: str | None, price_rub: int | None, changed_by: str) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    if user_id not in state.setdefault("users", {}):
        raise ValueError("Пользователь не найден")

    source_key = str(source_type or "").strip()
    if source_key not in ACCESS_SOURCE_LABELS_RU:
        raise ValueError("Неизвестный источник доступа")

    resolved_license_id = license_id
    resolved_org_id = organization_id
    resolved_school_id = school_id
    resolved_site_id = site_id
    if source_key == "partner_license" and not resolved_license_id:
        resolved_license_id = PARTNER_LICENSE_ID
        resolved_org_id = resolved_org_id or PARTNER_ORGANIZATION_ID
        resolved_school_id = resolved_school_id or PARTNER_SCHOOL_ID
        resolved_site_id = resolved_site_id or PARTNER_SITE_ID

    grants_map = state.setdefault("access_grants", {})
    user_grants = grants_map.setdefault(user_id, [])
    grant = {
        "grantId": f"grant_{user_id}_{len(user_grants) + 1}",
        "userId": user_id,
        "sourceType": source_key,
        "title": (title or "").strip() or _label_access_source(source_key),
        "status": "active",
        "plan": plan,
        "moduleId": module_id,
        "feature": feature,
        "organizationId": resolved_org_id,
        "schoolId": resolved_school_id,
        "siteId": resolved_site_id,
        "licenseId": resolved_license_id,
        "priceRub": price_rub,
        "startsAt": _now_iso(),
        "expiresAt": expires_at,
        "createdAt": _now_iso(),
    }

    license_row = state.get("school_licenses", {}).get(resolved_license_id) if resolved_license_id else None
    if isinstance(license_row, dict):
        grant["plans"] = ["partner_school_full"] if source_key == "partner_license" else []
        grant["modules"] = list(license_row.get("modules", []))
        grant["features"] = list(license_row.get("features", []))
        grant["title"] = (title or "").strip() or str(license_row.get("title") or _label_access_source(source_key))
        grant["priceRub"] = license_row.get("priceRub") if price_rub is None else price_rub
        if not expires_at:
            grant["expiresAt"] = license_row.get("expiresAt")
    user_grants.append(grant)
    grants_map[user_id] = user_grants
    state["access_grants"] = grants_map
    _apply_access_grants_to_entitlements(state, user_id)

    audit = state.setdefault("admin_audit", [])
    audit.append({
        "at": _now_iso(),
        "action": "create_access_grant",
        "targetUserId": user_id,
        "sourceType": source_key,
        "plan": plan,
        "moduleId": module_id,
        "feature": feature,
        "schoolId": resolved_school_id,
        "licenseId": resolved_license_id,
        "changedBy": changed_by,
    })
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    sync_school_domain_from_state(state)
    return _format_access_grant(grant)


def list_schools_overview() -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    schools = state.get("schools", {})
    sites = state.get("school_sites", {})
    licenses = state.get("school_licenses", {})
    organizations = state.get("organizations", {})
    rows: List[Dict[str, Any]] = []
    for school_id, school in schools.items():
        school_sites = [row for row in sites.values() if isinstance(row, dict) and row.get("schoolId") == school_id]
        school_licenses = [row for row in licenses.values() if isinstance(row, dict) and row.get("schoolId") == school_id]
        org = organizations.get(school.get("organizationId"), {}) if isinstance(organizations, dict) else {}
        rows.append({
            "organizationId": school.get("organizationId"),
            "organizationTitle": org.get("title") or "—",
            "schoolId": school_id,
            "schoolTitle": school.get("title") or school_id,
            "status": school.get("status") or "active",
            "sites": [{"siteId": site.get("siteId"), "title": site.get("title"), "status": site.get("status") or "active"} for site in school_sites],
            "licenses": [{
                "licenseId": lic.get("licenseId"),
                "title": lic.get("title"),
                "accessType": lic.get("accessType"),
                "accessTypeLabelRu": _label_access_source(lic.get("accessType")),
                "status": lic.get("status"),
                "statusLabelRu": "Активна" if str(lic.get("status") or "") == "active" else "Неактивна",
                "priceRub": lic.get("priceRub"),
                "startsAt": lic.get("startsAt"),
                "expiresAt": lic.get("expiresAt"),
                "periodLabel": lic.get("periodLabel"),
                "partnerStatusLabel": lic.get("partnerStatusLabel"),
                "schoolAccessLabel": lic.get("schoolAccessLabel"),
                "modules": [{"value": value, "labelRu": _label_module(value)} for value in lic.get("modules", []) or []],
                "features": [{"value": value, "labelRu": _label_feature(value)} for value in lic.get("features", []) or []],
                "limits": lic.get("limits", {}),
            } for lic in school_licenses],
        })
    rows.sort(key=lambda x: str(x.get("schoolTitle") or ""))
    return {"items": rows}


def create_school(title: str, organization_title: str | None, site_title: str | None, status: str | None, changed_by: str) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    clean_title = str(title or "").strip()
    if not clean_title:
        raise ValueError("Название школы обязательно")
    clean_status = str(status or "active").strip() or "active"
    if clean_status not in {"active", "paused", "archived"}:
        raise ValueError("Некорректный статус школы")

    organizations = state.setdefault("organizations", {})
    schools = state.setdefault("schools", {})
    school_sites = state.setdefault("school_sites", {})

    base_school_id = _slugify_school_id(clean_title, "school")
    school_id = base_school_id
    suffix = 2
    while school_id in schools:
        school_id = f"{base_school_id}_{suffix}"
        suffix += 1

    org_title = str(organization_title or "").strip() or clean_title
    organization_id = _slugify_school_id(org_title, "org")
    if organization_id in organizations and organizations[organization_id].get("title") != org_title:
        organization_id = f"org_{school_id}"

    site_label = str(site_title or "").strip() or "Основная площадка"
    site_id = f"site_{school_id}_main"

    organizations.setdefault(organization_id, {
        "organizationId": organization_id,
        "title": org_title,
        "type": "school",
        "createdAt": _now_iso(),
    })
    schools[school_id] = {
        "schoolId": school_id,
        "organizationId": organization_id,
        "title": clean_title,
        "status": clean_status,
        "createdAt": _now_iso(),
    }
    school_sites[site_id] = {
        "siteId": site_id,
        "schoolId": school_id,
        "title": site_label,
        "status": "active",
        "createdAt": _now_iso(),
    }

    audit = state.setdefault("admin_audit", [])
    audit.append({"at": _now_iso(), "action": "create_school", "schoolId": school_id, "organizationId": organization_id, "changedBy": changed_by})
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    sync_school_domain_from_state(state)
    return {
        "organizationId": organization_id,
        "schoolId": school_id,
        "schoolTitle": clean_title,
        "status": clean_status,
        "sites": [{"siteId": site_id, "title": site_label, "status": "active"}],
        "licenses": [],
    }


def list_school_classes(school_id: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    sync_school_domain_from_state(state)
    try:
        pg_rows = list_school_classes_pg(school_id)
        if pg_rows:
            return {"items": pg_rows}
    except Exception:
        pass
    classes = state.setdefault("school_classes", {})
    memberships = state.setdefault("school_memberships", {})
    rows: List[Dict[str, Any]] = []
    for class_id, row in classes.items():
        if not isinstance(row, dict):
            continue
        if school_id and row.get("schoolId") != school_id:
            continue
        members = memberships.get(class_id, {}) if isinstance(memberships.get(class_id), dict) else {}
        rows.append({
            "classId": class_id,
            "schoolId": row.get("schoolId"),
            "siteId": row.get("siteId"),
            "title": row.get("title"),
            "subject": row.get("subject"),
            "teacherUserId": row.get("teacherUserId"),
            "studentCount": len([x for x in members.values() if isinstance(x, dict) and x.get("role") in {"student", "learner"}]),
            "teacherCount": len([x for x in members.values() if isinstance(x, dict) and x.get("role") in {"teacher", "homeroom_teacher"}]),
            "createdAt": row.get("createdAt"),
        })
    rows.sort(key=lambda x: str(x.get("title") or ""))
    return {"items": rows}


def create_school_class(class_id: str | None, school_id: str, site_id: str | None, title: str, subject: str | None, teacher_user_id: str | None, changed_by: str) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    if school_id not in state.setdefault("schools", {}):
        raise ValueError("Школа не найдена")
    class_key = str(class_id or "").strip() or f"class_{school_id}_{abs(hash((title, subject or '', teacher_user_id or ''))) % 100000}"
    row = {
        "classId": class_key,
        "schoolId": school_id,
        "siteId": site_id or PARTNER_SITE_ID,
        "title": str(title or "").strip(),
        "subject": str(subject or "").strip() or None,
        "teacherUserId": str(teacher_user_id or "").strip() or None,
        "createdAt": _now_iso(),
    }
    if not row["title"]:
        raise ValueError("Название класса обязательно")
    state.setdefault("school_classes", {})[class_key] = row
    if row["teacherUserId"]:
        members = state.setdefault("school_memberships", {}).setdefault(class_key, {})
        members[row["teacherUserId"]] = {"role": "teacher", "joinedAt": _now_iso()}
    audit = state.setdefault("admin_audit", [])
    audit.append({"at": _now_iso(), "action": "create_school_class", "classId": class_key, "schoolId": school_id, "changedBy": changed_by})
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    sync_school_domain_from_state(state)
    return row


def list_school_invites(school_id: str | None = None, role: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    sync_school_domain_from_state(state)
    try:
        pg_rows = list_school_invites_pg(school_id, role)
        if pg_rows:
            rows = []
            for view in pg_rows:
                view = dict(view)
                view["roleLabelRu"] = _label_role(view.get("role"))
                view["statusLabelRu"] = {"pending": "Не активирован", "activated": "Активирован", "revoked": "Отозван", "expired": "Истёк"}.get(str(view.get("status") or "pending"), str(view.get("status") or "pending"))
                rows.append(view)
            return {"items": rows}
    except Exception:
        pass
    invites = state.setdefault("school_invite_codes", {})
    rows: List[Dict[str, Any]] = []
    for code, row in invites.items():
        if not isinstance(row, dict):
            continue
        if school_id and row.get("schoolId") != school_id:
            continue
        if role and row.get("role") != role:
            continue
        view = dict(row)
        view["roleLabelRu"] = _label_role(view.get("role"))
        view["statusLabelRu"] = {"pending": "Не активирован", "activated": "Активирован", "revoked": "Отозван", "expired": "Истёк"}.get(str(view.get("status") or "pending"), str(view.get("status") or "pending"))
        rows.append(view)
    rows.sort(key=lambda x: str(x.get("createdAt") or ""), reverse=True)
    return {"items": rows}


def create_school_invite_code(class_id: str | None, school_id: str, site_id: str | None, role: str, title: str | None, subject: str | None, expires_at: str | None, max_activations: int, teacher_user_id: str | None, student_label: str | None, changed_by: str) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    allowed = {"teacher", "homeroom_teacher", "student", "learner"}
    normalized_role = str(role or "").strip().lower()
    if normalized_role not in allowed:
        raise ValueError("Для приглашения поддерживаются только учительские и ученические роли")
    if school_id not in state.setdefault("schools", {}):
        raise ValueError("Школа не найдена")
    code_prefix = "TCH" if normalized_role in {"teacher", "homeroom_teacher"} else "STD"
    code = f"{code_prefix}-2070-NZ-{abs(hash((class_id or '', normalized_role, title or '', student_label or '', _now_iso()))) % 10000:04d}"
    row = {
        "code": code,
        "schoolId": school_id,
        "siteId": site_id or PARTNER_SITE_ID,
        "classId": class_id,
        "role": normalized_role,
        "title": title or ("Приглашение учителя" if normalized_role in {"teacher", "homeroom_teacher"} else "Приглашение ученика"),
        "subject": subject,
        "teacherUserId": teacher_user_id,
        "studentLabel": student_label,
        "status": "pending",
        "maxActivations": max(1, int(max_activations or 1)),
        "activations": 0,
        "expiresAt": expires_at,
        "createdAt": _now_iso(),
        "createdBy": changed_by,
    }
    state.setdefault("school_invite_codes", {})[code] = row
    audit = state.setdefault("admin_audit", [])
    audit.append({"at": _now_iso(), "action": "create_school_invite_code", "code": code, "role": normalized_role, "schoolId": school_id, "classId": class_id, "changedBy": changed_by})
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    sync_school_domain_from_state(state)
    return row


def preview_school_invite_code(code: str) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    normalized_code = str(code or "").strip().upper()
    if not normalized_code:
        raise ValueError("Введите код доступа")

    invite = state.setdefault("school_invite_codes", {}).get(normalized_code)
    if not isinstance(invite, dict):
        raise ValueError("Код не найден")

    status = str(invite.get("status") or "pending")
    if status == "revoked":
        raise ValueError("Код отозван. Обратитесь к учителю или администратору школы.")
    if status == "activated" and int(invite.get("activations") or 0) >= int(invite.get("maxActivations") or 1):
        raise ValueError("Код уже был использован. Обратитесь к учителю или администратору школы.")

    expires_at = _parse_iso_datetime(invite.get("expiresAt"))
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise ValueError("Срок действия кода истёк. Обратитесь к учителю или администратору школы за новым кодом.")

    school_id = invite.get("schoolId")
    site_id = invite.get("siteId")
    class_id = invite.get("classId")
    license_id = str(invite.get("licenseId") or PARTNER_LICENSE_ID)
    school = state.setdefault("schools", {}).get(school_id, {}) if school_id else {}
    site = state.setdefault("school_sites", {}).get(site_id, {}) if site_id else {}
    class_row = state.setdefault("school_classes", {}).get(class_id, {}) if class_id else {}
    license_row = state.setdefault("school_licenses", {}).get(license_id, {})
    modules = list(license_row.get("modules", [])) if isinstance(license_row, dict) else []
    features = list(license_row.get("features", [])) if isinstance(license_row, dict) else []
    role = str(invite.get("role") or "student").strip().lower() or "student"

    return {
        "code": normalized_code,
        "status": "pending",
        "statusLabelRu": "Готов к активации",
        "schoolId": school_id,
        "schoolTitle": school.get("title") or "Школа",
        "siteId": site_id,
        "siteTitle": site.get("title") or "Площадка",
        "classId": class_id,
        "classTitle": class_row.get("title") or invite.get("title") or class_id,
        "role": role,
        "roleLabelRu": _label_role(role),
        "expiresAt": invite.get("expiresAt") or license_row.get("expiresAt"),
        "licenseTitle": license_row.get("title") or "Школьная лицензия",
        "modules": modules,
        "features": features,
        "modulesLabelRu": _modules_label(modules),
        "messageRu": "Код найден. Проверьте данные доступа и создайте логин с паролем.",
    }


def activate_school_invite_code(code: str, phone: str, user_id: str | None, display_name: str | None, login: str | None = None, password: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)
    normalized_code = str(code or "").strip().upper()
    if not normalized_code:
        raise ValueError("Код приглашения обязателен")
    normalized_phone = _normalize_phone(phone)
    if not normalized_phone:
        raise ValueError("Телефон обязателен")

    invite = state.setdefault("school_invite_codes", {}).get(normalized_code)
    if not isinstance(invite, dict):
        raise ValueError("Код приглашения не найден")

    status = str(invite.get("status") or "pending")
    if status in {"revoked", "expired"}:
        raise ValueError("Код приглашения недействителен")
    if status == "activated" and int(invite.get("activations") or 0) >= int(invite.get("maxActivations") or 1):
        raise ValueError("Код приглашения уже использован")

    expires_at = _parse_iso_datetime(invite.get("expiresAt"))
    if expires_at and expires_at < datetime.now(timezone.utc):
        invite["status"] = "expired"
        state["school_invite_codes"][normalized_code] = invite
        _write_state(state)
        sync_school_domain_from_state(state)
        raise ValueError("Срок действия кода истёк")

    resolved_user_id = state.setdefault("phones", {}).get(normalized_phone)
    if not resolved_user_id:
        resolved_user_id = str(user_id or "").strip() or f"u_invite_{normalized_phone[-6:]}"
        state["phones"][normalized_phone] = resolved_user_id

    users = state.setdefault("users", {})
    user = users.get(resolved_user_id, {}) if isinstance(users.get(resolved_user_id), dict) else {}
    user["userId"] = resolved_user_id
    user["phone"] = normalized_phone
    user.setdefault("createdAt", _now_iso())
    if display_name:
        user["displayName"] = str(display_name).strip()
    users[resolved_user_id] = user

    login_result: Dict[str, Any] = {}
    if login or password:
        if not login or not password:
            raise ValueError("Для создания аккаунта нужны логин и пароль")
        login_result = attach_login_password(state, resolved_user_id, login, password, display_name)

    role = str(invite.get("role") or "student").strip().lower() or "student"
    consent_roles = {"student", "learner", "teacher", "homeroom_teacher", "parent"}
    if role in consent_roles:
        state.setdefault("consents", {})[resolved_user_id] = {
            "userId": resolved_user_id,
            "role": role,
            "version": "school-invite",
            "acceptedAt": _now_iso(),
            "parentApproved": True,
        }
        state.setdefault("role_overrides", {}).pop(resolved_user_id, None)
    else:
        state.setdefault("role_overrides", {})[resolved_user_id] = role

    class_id = invite.get("classId")
    if class_id:
        members = state.setdefault("school_memberships", {}).setdefault(class_id, {})
        members[resolved_user_id] = {
            "role": role,
            "joinedAt": _now_iso(),
            "schoolId": invite.get("schoolId"),
            "siteId": invite.get("siteId"),
        }

    state.setdefault("entitlements", {}).setdefault(resolved_user_id, {"plans": ["free"], "modules": [], "ai_quota_left": 20})
    partner_exists = False
    for row in _active_access_grants_for_user(state, resolved_user_id):
        if str(row.get("sourceType") or "") == "partner_license" and str(row.get("schoolId") or "") == str(invite.get("schoolId") or ""):
            partner_exists = True
            break
    if not partner_exists:
        license_id = str(invite.get("licenseId") or PARTNER_LICENSE_ID)
        license_row = state.get("school_licenses", {}).get(license_id, {})
        grants = state.setdefault("access_grants", {}).setdefault(resolved_user_id, [])
        grants.append({
            "grantId": f"grant_{resolved_user_id}_{len(grants) + 1}",
            "userId": resolved_user_id,
            "sourceType": "partner_license",
            "title": str(license_row.get("title") or "Партнёрская школьная лицензия"),
            "status": "active",
            "organizationId": invite.get("organizationId") or PARTNER_ORGANIZATION_ID,
            "schoolId": invite.get("schoolId"),
            "siteId": invite.get("siteId"),
            "licenseId": license_id,
            "priceRub": license_row.get("priceRub", 0),
            "plans": ["partner_school_full"],
            "modules": list(license_row.get("modules", [])),
            "features": list(license_row.get("features", [])),
            "startsAt": _now_iso(),
            "expiresAt": license_row.get("expiresAt"),
            "createdAt": _now_iso(),
        })
        state["access_grants"][resolved_user_id] = grants
        _apply_access_grants_to_entitlements(state, resolved_user_id)

    invite["activations"] = int(invite.get("activations") or 0) + 1
    invite["activatedAt"] = _now_iso()
    invite["activatedByUserId"] = resolved_user_id
    invite["status"] = "activated" if invite["activations"] >= int(invite.get("maxActivations") or 1) else "pending"
    state["school_invite_codes"][normalized_code] = invite

    tokens = _create_session(state, user_id=resolved_user_id, role=role)
    audit = state.setdefault("admin_audit", [])
    audit.append({"at": _now_iso(), "action": "activate_school_invite_code", "code": normalized_code, "targetUserId": resolved_user_id, "role": role, "classId": class_id, "schoolId": invite.get("schoolId")})
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    sync_school_domain_from_state(state)
    return {
        "userId": resolved_user_id,
        "phone": normalized_phone,
        "login": login_result.get("login"),
        "role": role,
        "roleLabelRu": _label_role(role),
        "schoolId": invite.get("schoolId"),
        "siteId": invite.get("siteId"),
        "classId": class_id,
        **tokens,
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    src = str(value).strip()
    if not src:
        return None
    if src.endswith("Z"):
        src = src[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(src)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def _mobile_readiness_context() -> Dict[str, Any]:
    mobile_root = Path("/root/synapse/mobile")
    package_json = mobile_root / "package.json"
    eas_json = mobile_root / "eas.json"
    onboarding_screen = mobile_root / "app/screens/OnboardingRoleScreen.tsx"
    root_navigator = mobile_root / "app/navigation/RootNavigator.tsx"
    content_update_service = mobile_root / "app/services/contentUpdateService.ts"

    package_data: Dict[str, Any] = {}
    eas_data: Dict[str, Any] = {}
    root_nav_text = ""
    content_update_text = ""

    if package_json.exists():
        try:
            parsed = json.loads(package_json.read_text(encoding="utf-8"))
            if isinstance(parsed, dict):
                package_data = parsed
        except Exception:
            package_data = {}

    if eas_json.exists():
        try:
            parsed = json.loads(eas_json.read_text(encoding="utf-8"))
            if isinstance(parsed, dict):
                eas_data = parsed
        except Exception:
            eas_data = {}

    if root_navigator.exists():
        root_nav_text = root_navigator.read_text(encoding="utf-8", errors="ignore")
    if content_update_service.exists():
        content_update_text = content_update_service.read_text(encoding="utf-8", errors="ignore")

    scripts = package_data.get("scripts") if isinstance(package_data.get("scripts"), dict) else {}
    eas_build = eas_data.get("build") if isinstance(eas_data.get("build"), dict) else {}
    demo_apk = eas_build.get("demo-apk") if isinstance(eas_build.get("demo-apk"), dict) else {}
    demo_android = demo_apk.get("android") if isinstance(demo_apk.get("android"), dict) else {}

    onboarding_wired = (
        'name="Onboarding"' in root_nav_text
        and "OnboardingRoleScreen" in root_nav_text
        and "initialRouteName={onboardingDone ? \"MainTabs\" : \"Onboarding\"}" in root_nav_text
    )
    first_run_sync_ready = (
        "content_meta" in content_update_text
        and "API_BASE_URL" in content_update_text
        and "packs/index" in content_update_text
    )
    apk_demo_ready = (
        demo_android.get("buildType") == "apk"
        and bool(demo_apk.get("distribution"))
        and bool(demo_apk.get("env"))
    )
    apk_scripts_ready = bool(scripts.get("apk:preflight")) and bool(scripts.get("apk:build:demo"))

    return {
        "mobileRoot": mobile_root,
        "mobileRootExists": mobile_root.exists(),
        "onboardingScreenExists": onboarding_screen.exists(),
        "onboardingNavigatorWired": onboarding_wired,
        "firstRunSyncReady": first_run_sync_ready,
        "apkDemoProfileReady": apk_demo_ready,
        "apkScriptsReady": apk_scripts_ready,
        "apkScriptsValue": "ready" if apk_scripts_ready else "missing",
    }


def _read_mobile_onboarding_smoke_status() -> Dict[str, Any]:
    if not _SECURITY_MOBILE_SMOKE_PATH.exists():
        return {
            "exists": False,
            "status": "never-run",
            "lastRunAt": None,
            "lastRunBy": None,
            "notes": None,
        }
    try:
        data = json.loads(_SECURITY_MOBILE_SMOKE_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data["exists"] = True
            return data
    except Exception:
        pass
    return {
        "exists": True,
        "status": "invalid",
        "lastRunAt": None,
        "lastRunBy": None,
        "notes": None,
    }


def _write_mobile_onboarding_smoke_status(payload: Dict[str, Any]) -> None:
    _SECURITY_MOBILE_SMOKE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SECURITY_MOBILE_SMOKE_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _mobile_smoke_sla(days: int = 7) -> Dict[str, Any]:
    smoke = _read_mobile_onboarding_smoke_status()
    status = str(smoke.get("status") or "never-run")
    if status != "ok":
        return {
            "ok": False,
            "ageHours": None,
            "lastRunAt": smoke.get("lastRunAt"),
            "status": status,
        }
    dt = _parse_iso_datetime(smoke.get("lastRunAt"))
    if not dt:
        return {
            "ok": False,
            "ageHours": None,
            "lastRunAt": smoke.get("lastRunAt"),
            "status": "invalid",
        }
    age_hours = (datetime.now(timezone.utc) - dt).total_seconds() / 3600.0
    return {
        "ok": age_hours <= days * 24,
        "ageHours": round(age_hours, 1),
        "lastRunAt": smoke.get("lastRunAt"),
        "status": status,
    }


def content_ingestion_status() -> Dict[str, Any]:
    packs_dir = Path(os.getenv("CONTENT_PACKS_DIR", "/root/synapse/content_packs"))
    import_script = Path("/root/synapse/backend/app/scripts/import_content_packs.py")
    seed_token_set = bool(str(os.getenv("CONTENT_SEED_TOKEN", "")).strip())

    files = sorted(packs_dir.glob("*.json")) if packs_dir.exists() and packs_dir.is_dir() else []
    pack_files = [p for p in files if "_pack_" in p.name]

    valid_json = 0
    parse_errors: List[str] = []
    latest_pack_at: str | None = None
    for p in pack_files:
        try:
            json.loads(p.read_text(encoding="utf-8"))
            valid_json += 1
            ts = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat()
            if not latest_pack_at or ts > latest_pack_at:
                latest_pack_at = ts
        except Exception as exc:
            parse_errors.append(f"{p.name}: {type(exc).__name__}")

    packs_ok = len(pack_files) > 0
    json_ok = packs_ok and valid_json == len(pack_files)
    level = "green" if packs_ok and json_ok and import_script.exists() and seed_token_set else "yellow"
    if parse_errors or not packs_ok:
        level = "red"

    return {
        "generatedAt": _now_iso(),
        "level": level,
        "packsDir": str(packs_dir),
        "packsDirExists": packs_dir.exists() and packs_dir.is_dir(),
        "packFiles": len(pack_files),
        "validJsonFiles": valid_json,
        "parseErrorCount": len(parse_errors),
        "parseErrors": parse_errors[:10],
        "latestPackAt": latest_pack_at,
        "importScriptExists": import_script.exists(),
        "seedTokenConfigured": seed_token_set,
    }


def _read_backup_dry_run_history() -> List[Dict[str, Any]]:
    if not _SECURITY_HISTORY_PATH.exists():
        return []
    try:
        raw = json.loads(_SECURITY_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(raw, list):
        return []
    rows = [row for row in raw if isinstance(row, dict)]

    def _sort_key(row: Dict[str, Any]) -> float:
        dt = _parse_iso_datetime(row.get("finishedAt") or row.get("startedAt"))
        return dt.timestamp() if dt else 0.0

    rows.sort(key=_sort_key, reverse=True)
    return rows


def _write_backup_dry_run_history(items: List[Dict[str, Any]]) -> None:
    _SECURITY_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SECURITY_HISTORY_PATH.write_text(json.dumps(items[:100], ensure_ascii=False, indent=2), encoding="utf-8")


def _read_go_no_go_history() -> List[Dict[str, Any]]:
    if not _GO_NO_GO_HISTORY_PATH.exists():
        return []
    try:
        raw = json.loads(_GO_NO_GO_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []
    if not isinstance(raw, list):
        return []
    rows = [row for row in raw if isinstance(row, dict)]

    def _sort_key(row: Dict[str, Any]) -> float:
        dt = _parse_iso_datetime(row.get("recordedAt") or row.get("generatedAt"))
        return dt.timestamp() if dt else 0.0

    rows.sort(key=_sort_key, reverse=True)
    return rows


def _write_go_no_go_history(items: List[Dict[str, Any]]) -> None:
    _GO_NO_GO_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _GO_NO_GO_HISTORY_PATH.write_text(json.dumps(items[:200], ensure_ascii=False, indent=2), encoding="utf-8")


def _go_no_go_signature(entry: Dict[str, Any]) -> str:
    gates = entry.get("gates") if isinstance(entry.get("gates"), list) else []
    signature = {
        "status": str(entry.get("status") or "no-go"),
        "passedGates": int(entry.get("passedGates") or 0),
        "totalGates": int(entry.get("totalGates") or 0),
        "blockers": [str(b) for b in (entry.get("blockers") or [])],
        "gates": [
            {
                "key": str(g.get("key") or ""),
                "ok": bool(g.get("ok")),
                "value": str(g.get("value") or ""),
            }
            for g in gates
            if isinstance(g, dict)
        ],
    }
    return json.dumps(signature, ensure_ascii=False, sort_keys=True)


def _record_go_no_go_snapshot(summary: Dict[str, Any]) -> Dict[str, Any]:
    entry = {
        "recordedAt": _now_iso(),
        "generatedAt": summary.get("generatedAt") or _now_iso(),
        "go": bool(summary.get("go")),
        "status": str(summary.get("status") or "no-go"),
        "passedGates": int(summary.get("passedGates") or 0),
        "totalGates": int(summary.get("totalGates") or 0),
        "blockers": [str(b) for b in (summary.get("blockers") or [])],
        "gates": [g for g in (summary.get("gates") or []) if isinstance(g, dict)],
    }
    history = _read_go_no_go_history()
    if history and _go_no_go_signature(history[0]) == _go_no_go_signature(entry):
        return history[0]
    _write_go_no_go_history([entry] + history)
    return entry


def get_go_no_go_history(limit: int = 20) -> Dict[str, Any]:
    safe_limit = max(1, min(limit, 100))
    history = _read_go_no_go_history()
    latest = history[0] if history else None
    return {
        "generatedAt": _now_iso(),
        "total": len(history),
        "limit": safe_limit,
        "history": history[:safe_limit],
        "latestStatus": (latest or {}).get("status"),
        "latestRecordedAt": (latest or {}).get("recordedAt"),
    }


def list_handover_archive(limit: int = 20) -> Dict[str, Any]:
    safe_limit = max(1, min(limit, 100))
    if not _HANDOVER_ARCHIVE_PATH.exists():
        return {
            "generatedAt": _now_iso(),
            "total": 0,
            "limit": safe_limit,
            "history": [],
        }
    try:
        raw = json.loads(_HANDOVER_ARCHIVE_PATH.read_text(encoding="utf-8"))
    except Exception:
        raw = []
    rows = [row for row in raw if isinstance(row, dict)] if isinstance(raw, list) else []

    def _sort_key(row: Dict[str, Any]) -> float:
        dt = _parse_iso_datetime(row.get("archivedAt") or row.get("time"))
        return dt.timestamp() if dt else 0.0

    rows.sort(key=_sort_key, reverse=True)
    return {
        "generatedAt": _now_iso(),
        "total": len(rows),
        "limit": safe_limit,
        "history": rows[:safe_limit],
    }


def export_handover_archive_csv(limit: int = 1000) -> str:
    safe_limit = max(1, min(limit, 5000))
    rows = list_handover_archive(limit=safe_limit).get("history", [])
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["archivedAt", "changedBy", "time", "outgoing", "incoming", "incidents", "comment"])
    for row in rows:
        if not isinstance(row, dict):
            continue
        writer.writerow(
            [
                row.get("archivedAt") or "",
                row.get("changedBy") or "",
                row.get("time") or "",
                row.get("outgoing") or "",
                row.get("incoming") or "",
                row.get("incidents") or "",
                row.get("comment") or "",
            ]
        )
    return out.getvalue()


def archive_handover_report(payload: Dict[str, Any], *, changed_by: str) -> Dict[str, Any]:
    outgoing = str(payload.get("outgoing") or "").strip()
    incoming = str(payload.get("incoming") or "").strip()
    if not outgoing or not incoming:
        raise ValueError("Заполните сдающего и принимающего смену")

    entry = {
        "archivedAt": _now_iso(),
        "changedBy": changed_by,
        "time": str(payload.get("time") or "").strip() or None,
        "outgoing": outgoing,
        "incoming": incoming,
        "incidents": str(payload.get("incidents") or "").strip()[:4000] or None,
        "comment": str(payload.get("comment") or "").strip()[:4000] or None,
    }

    history_payload = list_handover_archive(limit=200)
    history = [row for row in history_payload.get("history", []) if isinstance(row, dict)]
    history.insert(0, entry)
    _HANDOVER_ARCHIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _HANDOVER_ARCHIVE_PATH.write_text(json.dumps(history[:200], ensure_ascii=False, indent=2), encoding="utf-8")

    state = _read_state()
    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": entry["archivedAt"],
            "action": "handover_archive",
            "changedBy": changed_by,
            "payload": {
                "time": entry.get("time"),
                "outgoing": outgoing,
                "incoming": incoming,
                "incidentsPresent": bool(entry.get("incidents")),
                "commentPresent": bool(entry.get("comment")),
            },
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)

    return {
        "saved": True,
        "entry": entry,
        "total": len(history[:200]),
    }
def _last_success_within(days: int) -> Dict[str, Any]:
    history = _read_backup_dry_run_history()
    for row in history:
        if row.get("status") != "ok":
            continue
        finished_at = _parse_iso_datetime(row.get("finishedAt"))
        if not finished_at:
            continue
        age_hours = (datetime.now(timezone.utc) - finished_at).total_seconds() / 3600.0
        return {
            "ok": age_hours <= days * 24,
            "ageHours": round(age_hours, 1),
            "finishedAt": row.get("finishedAt"),
        }
    return {"ok": False, "ageHours": None, "finishedAt": None}


def _parse_range_bound(value: str | None, *, field: str) -> datetime | None:
    src = str(value or "").strip()
    if not src:
        return None
    dt = _parse_iso_datetime(src)
    if not dt:
        raise ValueError(f"Invalid {field}. Use ISO datetime format")
    return dt


def _filter_history_rows(
    rows: List[Dict[str, Any]],
    *,
    from_date: str | None,
    to_date: str | None,
) -> List[Dict[str, Any]]:
    from_dt = _parse_range_bound(from_date, field="fromDate")
    to_dt = _parse_range_bound(to_date, field="toDate")
    if from_dt and to_dt and from_dt > to_dt:
        raise ValueError("fromDate must be less than or equal to toDate")

    out: List[Dict[str, Any]] = []
    for row in rows:
        row_dt = _parse_iso_datetime(row.get("finishedAt") or row.get("startedAt"))
        if not row_dt:
            continue
        if from_dt and row_dt < from_dt:
            continue
        if to_dt and row_dt > to_dt:
            continue
        out.append(row)
    return out


def _read_security_alert_acks() -> Dict[str, Dict[str, Any]]:
    if not _SECURITY_ALERT_ACK_PATH.exists():
        return {}
    try:
        raw = json.loads(_SECURITY_ALERT_ACK_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(raw, dict):
        return {}
    out: Dict[str, Dict[str, Any]] = {}
    for code, value in raw.items():
        if isinstance(code, str) and isinstance(value, dict):
            out[code] = value
    return out


def _write_security_alert_acks(data: Dict[str, Dict[str, Any]]) -> None:
    _SECURITY_ALERT_ACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SECURITY_ALERT_ACK_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _apply_alert_ack_state(alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    acks = _read_security_alert_acks()
    out: List[Dict[str, Any]] = []
    for alert in alerts:
        row = dict(alert)
        code = str(row.get("code") or "").strip()
        ack = acks.get(code, {}) if code else {}
        row["acknowledged"] = bool(ack.get("acknowledged"))
        row["ackBy"] = ack.get("ackBy")
        row["ackAt"] = ack.get("ackAt")
        row["ackComment"] = ack.get("ackComment")
        out.append(row)
    return out


def list_users(limit: int = 100, offset: int = 0, query: str | None = None) -> List[Dict[str, Any]]:
    state = _read_state()
    _ensure_school_seed_state(state)
    users = state.get("users", {})
    consents = state.get("consents", {})
    overrides = state.get("role_overrides", {})
    entitlements = state.get("entitlements", {})

    q = (query or "").strip().lower()
    rows: List[Dict[str, Any]] = []
    for user_id, user in users.items():
        phone = str(user.get("phone") or "")
        base_role = str(consents.get(user_id, {}).get("role") or "student")
        effective_role = str(overrides.get(user_id) or base_role)
        active_accesses = [_format_access_grant(row) for row in _active_access_grants_for_user(state, user_id)]
        row = {
            "userId": user_id,
            "phone": phone,
            "role": effective_role,
            "roleLabelRu": _label_role(effective_role),
            "baseRole": base_role,
            "baseRoleLabelRu": _label_role(base_role),
            "createdAt": user.get("createdAt"),
            "plans": sorted(set([str(x) for x in (entitlements.get(user_id, {}) or {}).get("plans", []) if str(x).strip()])),
            "modules": sorted(set([str(x) for x in (entitlements.get(user_id, {}) or {}).get("modules", []) if str(x).strip()])),
            "activeAccessCount": len(active_accesses),
            "activeAccesses": [x.get("summaryRu") for x in active_accesses[:4]],
        }
        if q and q not in user_id.lower() and q not in phone.lower() and q not in effective_role.lower() and q not in row["roleLabelRu"].lower():
            continue
        rows.append(row)

    rows = sorted(rows, key=lambda r: str(r.get("createdAt") or ""), reverse=True)
    return rows[max(0, offset) : max(0, offset) + max(1, min(limit, 1000))]


def admin_password_login(login: str, password: str) -> Dict[str, Any]:
    expected_login = str(settings.ADMIN_UI_LOGIN or "").strip()
    expected_password = str(settings.ADMIN_UI_PASSWORD or "").strip()
    if not expected_login or not expected_password:
        raise ValueError("Вход по логину/паролю для админки не настроен")

    submitted_login = str(login or "").strip()
    submitted_password = str(password or "").strip()
    if submitted_login != expected_login or submitted_password != expected_password:
        raise ValueError("Неверный логин или пароль")

    user_id = str(settings.ADMIN_UI_USER_ID or "admin_console").strip() or "admin_console"
    role = str(settings.ADMIN_UI_ROLE or "owner").strip().lower()
    if role not in ALL_KNOWN_ROLES:
        role = "owner"

    state = _read_state()
    users = state.setdefault("users", {})
    users.setdefault(
        user_id,
        {
            "userId": user_id,
            "phone": f"admin:{submitted_login}",
            "createdAt": _now_iso(),
        },
    )
    state.setdefault("role_overrides", {})[user_id] = role
    tokens = _create_session(state, user_id=user_id, role=role)

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "admin_password_login",
            "targetUserId": user_id,
            "role": role,
            "changedBy": "admin_ui_login",
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)

    return {
        "userId": user_id,
        "role": role,
        **tokens,
    }


def set_user_role(user_id: str, role: str, changed_by: str) -> Dict[str, Any]:
    normalized_role = role.strip().lower()
    state = _read_state()
    state.setdefault("role_overrides", {})[user_id] = normalized_role

    if user_id in state.get("consents", {}):
        state["consents"][user_id]["role"] = normalized_role

    for sid, session in state.get("sessions", {}).items():
        if session.get("userId") == user_id:
            session["role"] = normalized_role
            state["sessions"][sid] = session

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "set_user_role",
            "targetUserId": user_id,
            "role": normalized_role,
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]

    _write_state(state)
    return {"userId": user_id, "role": normalized_role, "changedBy": changed_by}


def set_scope_override(role: str, scope: str, allow: bool, changed_by: str) -> Dict[str, Any]:
    normalized_role = role.strip().lower()
    normalized_scope = scope.strip()

    state = _read_state()
    overrides = state.setdefault("scope_overrides", {})
    role_map = overrides.setdefault(normalized_role, {})
    role_map[normalized_scope] = bool(allow)
    overrides[normalized_role] = role_map
    state["scope_overrides"] = overrides

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "set_scope_override",
            "role": normalized_role,
            "scope": normalized_scope,
            "allow": bool(allow),
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]

    _write_state(state)
    return {"role": normalized_role, "scope": normalized_scope, "allow": bool(allow), "changedBy": changed_by}


def list_scope_overrides() -> Dict[str, Dict[str, bool]]:
    state = _read_state()
    data = state.get("scope_overrides", {})
    return data if isinstance(data, dict) else {}


def _effective_role_for_user(state: Dict[str, Any], user_id: str) -> str:
    consents = state.get("consents", {})
    overrides = state.get("role_overrides", {})
    base_role = str(consents.get(user_id, {}).get("role") or "student")
    return str(overrides.get(user_id) or base_role)


def _match_users_for_bulk(state: Dict[str, Any], query: str | None, role: str | None) -> List[str]:
    users = state.get("users", {})
    q = (query or "").strip().lower()
    wanted_role = (role or "").strip().lower()
    out: List[str] = []
    for user_id, user in users.items():
        phone = str(user.get("phone") or "")
        eff_role = _effective_role_for_user(state, user_id)
        if q and q not in user_id.lower() and q not in phone.lower() and q not in eff_role.lower():
            continue
        if wanted_role and eff_role != wanted_role:
            continue
        out.append(user_id)
    return out


def preview_bulk_subscriptions(
    *,
    query: str | None,
    role: str | None,
    limit: int = 200,
) -> Dict[str, Any]:
    state = _read_state()
    matched = _match_users_for_bulk(state, query=query, role=role)
    limited = matched[: max(1, min(limit, 1000))]
    return {
        "totalMatched": len(matched),
        "previewCount": len(limited),
        "previewUserIds": limited,
        "truncated": len(limited) < len(matched),
        "query": query,
        "role": role,
    }


def bulk_update_subscriptions(
    *,
    action: str,
    query: str | None,
    role: str | None,
    plan: str | None,
    module_id: str | None,
    changed_by: str,
    dry_run: bool,
    limit: int = 500,
) -> Dict[str, Any]:
    normalized_action = str(action or "").strip().lower()
    if normalized_action not in {"grant", "revoke"}:
        raise ValueError("Действие должно быть grant или revoke")
    if not (plan or module_id):
        raise ValueError("Укажите plan или moduleId")

    state = _read_state()
    matched = _match_users_for_bulk(state, query=query, role=role)
    selected = matched[: max(1, min(limit, 1000))]
    if dry_run:
        return {
            "dryRun": True,
            "action": normalized_action,
            "query": query,
            "role": role,
            "plan": plan,
            "moduleId": module_id,
            "totalMatched": len(matched),
            "selectedCount": len(selected),
            "selectedUserIds": selected,
            "truncated": len(selected) < len(matched),
        }

    entitlements = state.setdefault("entitlements", {})
    changed_users: List[str] = []
    for user_id in selected:
        ent = entitlements.setdefault(user_id, {"plans": ["free"], "modules": [], "ai_quota_left": 20})
        if normalized_action == "grant":
            if plan:
                ent["plans"] = sorted(set(ent.get("plans", []) + [plan]))
            if module_id:
                ent["modules"] = sorted(set(ent.get("modules", []) + [module_id]))
        else:
            if plan:
                ent["plans"] = [p for p in ent.get("plans", []) if p != plan]
                if not ent["plans"]:
                    ent["plans"] = ["free"]
            if module_id:
                ent["modules"] = [m for m in ent.get("modules", []) if m != module_id]
        changed_users.append(user_id)

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": f"bulk_{normalized_action}_subscription",
            "changedBy": changed_by,
            "query": query,
            "role": role,
            "plan": plan,
            "moduleId": module_id,
            "totalMatched": len(matched),
            "selectedCount": len(selected),
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)

    return {
        "dryRun": False,
        "action": normalized_action,
        "query": query,
        "role": role,
        "plan": plan,
        "moduleId": module_id,
        "totalMatched": len(matched),
        "selectedCount": len(selected),
        "changedCount": len(changed_users),
        "changedUserIds": changed_users,
        "truncated": len(selected) < len(matched),
    }


def grant_subscription(
    user_id: str,
    plan: str | None,
    module_id: str | None,
    changed_by: str,
) -> Dict[str, Any]:
    state = _read_state()
    ent = state.setdefault("entitlements", {}).setdefault(user_id, {"plans": ["free"], "modules": [], "ai_quota_left": 20})

    if plan:
        ent["plans"] = sorted(set(ent.get("plans", []) + [plan]))
    if module_id:
        ent["modules"] = sorted(set(ent.get("modules", []) + [module_id]))

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "grant_subscription",
            "targetUserId": user_id,
            "plan": plan,
            "moduleId": module_id,
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]

    _write_state(state)
    return {"userId": user_id, "plans": ent.get("plans", []), "modules": ent.get("modules", [])}


def revoke_subscription(
    user_id: str,
    plan: str | None,
    module_id: str | None,
    changed_by: str,
) -> Dict[str, Any]:
    state = _read_state()
    ent = state.setdefault("entitlements", {}).setdefault(user_id, {"plans": ["free"], "modules": [], "ai_quota_left": 20})

    if plan:
        ent["plans"] = [p for p in ent.get("plans", []) if p != plan]
        if not ent["plans"]:
            ent["plans"] = ["free"]
    if module_id:
        ent["modules"] = [m for m in ent.get("modules", []) if m != module_id]

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "revoke_subscription",
            "targetUserId": user_id,
            "plan": plan,
            "moduleId": module_id,
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]

    _write_state(state)
    return {"userId": user_id, "plans": ent.get("plans", []), "modules": ent.get("modules", [])}


def list_admin_audit(limit: int = 200) -> List[Dict[str, Any]]:
    return list_admin_audit_filtered(limit=limit)


def _normalized_audit_event(event: Dict[str, Any]) -> Dict[str, Any]:
    created_at = event.get("createdAt") or event.get("at") or _now_iso()
    actor_user_id = event.get("actorUserId") or event.get("changedBy") or "system"
    target_user_id = event.get("targetUserId")
    action = str(event.get("action") or "unknown")

    extra: Dict[str, Any] = {}
    for key, value in event.items():
        if key in {"createdAt", "at", "actorUserId", "changedBy", "targetUserId", "action", "payload"}:
            continue
        extra[key] = value

    payload = event.get("payload")
    if isinstance(payload, dict):
        merged_payload = {**payload, **extra}
    else:
        merged_payload = extra

    return {
        "createdAt": created_at,
        "actorUserId": actor_user_id,
        "action": action,
        "targetUserId": target_user_id,
        "payload": merged_payload,
    }


def list_admin_audit_filtered(
    *,
    limit: int = 200,
    offset: int = 0,
    actor_user_id: str | None = None,
    target_user_id: str | None = None,
    action: str | None = None,
) -> List[Dict[str, Any]]:
    state = _read_state()
    audit = state.get("admin_audit", [])
    normalized = [_normalized_audit_event(a) for a in audit]

    actor_q = (actor_user_id or "").strip().lower()
    target_q = (target_user_id or "").strip().lower()
    action_q = (action or "").strip().lower()

    rows: List[Dict[str, Any]] = []
    for row in normalized:
        actor_ok = not actor_q or actor_q in str(row.get("actorUserId") or "").lower()
        target_ok = not target_q or target_q in str(row.get("targetUserId") or "").lower()
        action_ok = not action_q or action_q in str(row.get("action") or "").lower()
        if actor_ok and target_ok and action_ok:
            rows.append(row)

    rows = list(reversed(rows))
    safe_limit = max(1, min(limit, 1000))
    safe_offset = max(0, offset)
    return rows[safe_offset : safe_offset + safe_limit]


def export_admin_audit_csv(
    *,
    limit: int = 1000,
    actor_user_id: str | None = None,
    target_user_id: str | None = None,
    action: str | None = None,
) -> str:
    rows = list_admin_audit_filtered(
        limit=limit,
        offset=0,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
    )
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["createdAt", "actorUserId", "action", "targetUserId", "payloadJson"])
    for row in rows:
        writer.writerow(
            [
                row.get("createdAt"),
                row.get("actorUserId"),
                row.get("action"),
                row.get("targetUserId") or "",
                json.dumps(row.get("payload") or {}, ensure_ascii=False),
            ]
        )
    return out.getvalue()


def admin_form_options() -> Dict[str, Any]:
    state = _read_state()
    _ensure_school_seed_state(state)

    plans: set[str] = {"free", "pro", "partner_school_full", "family_ai_pro", "student_full"}
    modules: set[str] = {"chemistry_core", "physics_core", "biology_core", "chemistry_pro_lab", "exam_pack", "organic_pro"}

    entitlements = state.get("entitlements", {})
    if isinstance(entitlements, dict):
        for ent in entitlements.values():
            if not isinstance(ent, dict):
                continue
            for plan in ent.get("plans", []) or []:
                if isinstance(plan, str) and plan.strip():
                    plans.add(plan.strip())
            for module in ent.get("modules", []) or []:
                if isinstance(module, str) and module.strip():
                    modules.add(module.strip())

    content_db_path = Path(os.getenv("SYNAPSE_CONTENT_DB", "/root/synapse/synapse.db"))
    if content_db_path.exists():
        try:
            con = sqlite3.connect(str(content_db_path))
            cur = con.cursor()
            tables = [r[0] for r in cur.execute("select name from sqlite_master where type='table'").fetchall()]
            if "modules" in tables:
                cols = [r[1] for r in cur.execute("pragma table_info(modules)").fetchall()]
                if "id" in cols:
                    for row in cur.execute("select id from modules where id is not null").fetchall():
                        mid = str(row[0]).strip()
                        if mid:
                            modules.add(mid)
            con.close()
        except Exception:
            pass

    role_values = ["student", "learner", "teacher", "homeroom_teacher", "parent", "content_editor", "support", "school_admin", "admin", "owner"]
    scope_values = sorted(ROLE_SCOPES.keys())
    plan_values = sorted(plans)
    module_values = sorted(modules)
    access_source_values = ["free", "personal_subscription", "family_subscription", "school_license", "university_license", "promo", "manual", "partner_license", "lifetime_purchase"]
    schools = list_schools_overview().get("items", [])

    return {
        "roles": role_values,
        "roleOptions": [{"value": value, "label": _label_role(value)} for value in role_values],
        "scopes": scope_values,
        "scopeOptions": [{"value": value, "label": _label_scope(value)} for value in scope_values],
        "plans": plan_values,
        "planOptions": [{"value": value, "label": _label_plan(value)} for value in plan_values],
        "modules": module_values,
        "moduleOptions": [{"value": value, "label": _label_module(value)} for value in module_values],
        "accessSourceOptions": [{"value": value, "label": _label_access_source(value)} for value in access_source_values],
        "schools": schools,
        "schoolOptions": [{"value": school.get("schoolId"), "label": f"{school.get('schoolTitle')} · {', '.join(site.get('title') for site in school.get('sites', []) if site.get('title'))}"} for school in schools],
        "bulkActions": ["grant", "revoke"],
    }


def rights_matrix() -> Dict[str, Any]:
    state = _read_state()
    overrides_raw = state.get("scope_overrides", {})
    overrides = overrides_raw if isinstance(overrides_raw, dict) else {}

    roles = sorted(ALL_KNOWN_ROLES)
    scopes = sorted(ROLE_SCOPES.keys())

    matrix: List[Dict[str, Any]] = []
    for scope in scopes:
        allowed = ROLE_SCOPES.get(scope, set())
        role_items: List[Dict[str, Any]] = []
        for role in roles:
            base_allow = role in allowed
            role_overrides = overrides.get(role, {}) if isinstance(overrides.get(role), dict) else {}
            has_override = scope in role_overrides
            override_value = role_overrides.get(scope)
            effective_allow = bool(override_value) if has_override else bool(base_allow)
            role_items.append(
                {
                    "role": role,
                    "baseAllow": bool(base_allow),
                    "hasOverride": bool(has_override),
                    "overrideAllow": None if not has_override else bool(override_value),
                    "effectiveAllow": bool(effective_allow),
                }
            )
        matrix.append({"scope": scope, "roles": role_items})

    return {"roles": roles, "scopes": scopes, "matrix": matrix}


def subscriptions_kpi() -> Dict[str, Any]:
    state = _read_state()
    users = state.get("users", {})
    entitlements = state.get("entitlements", {})

    total_users = len(users) if isinstance(users, dict) else 0
    total_with_entitlements = len(entitlements) if isinstance(entitlements, dict) else 0

    free_only = 0
    paid_any = 0
    with_modules = 0
    without_entitlements = 0

    plan_counter: Dict[str, int] = {}
    module_counter: Dict[str, int] = {}

    user_ids = list(users.keys()) if isinstance(users, dict) else []
    for user_id in user_ids:
        ent = entitlements.get(user_id, {}) if isinstance(entitlements, dict) else {}
        plans = [str(p) for p in (ent.get("plans", []) or []) if str(p).strip()]
        modules = [str(m) for m in (ent.get("modules", []) or []) if str(m).strip()]

        if not plans and not modules:
            without_entitlements += 1

        normalized_plans = sorted(set(plans or ["free"]))
        normalized_modules = sorted(set(modules))

        if normalized_plans == ["free"]:
            free_only += 1
        if any(p != "free" for p in normalized_plans):
            paid_any += 1
        if normalized_modules:
            with_modules += 1

        for plan in normalized_plans:
            plan_counter[plan] = plan_counter.get(plan, 0) + 1
        for module in normalized_modules:
            module_counter[module] = module_counter.get(module, 0) + 1

    top_plans = sorted(plan_counter.items(), key=lambda x: (-x[1], x[0]))[:10]
    top_modules = sorted(module_counter.items(), key=lambda x: (-x[1], x[0]))[:10]

    return {
        "generatedAt": _now_iso(),
        "users": {
            "total": total_users,
            "withEntitlements": total_with_entitlements,
            "withoutEntitlements": without_entitlements,
            "freeOnly": free_only,
            "paidAny": paid_any,
            "withModules": with_modules,
        },
        "topPlans": [{"plan": p, "users": c} for p, c in top_plans],
        "topModules": [{"moduleId": m, "users": c} for m, c in top_modules],
    }


def security_checklist() -> Dict[str, Any]:
    checks: List[Dict[str, Any]] = []
    alerts: List[Dict[str, Any]] = []

    def add(name: str, ok: bool, value: str, recommendation: str) -> None:
        checks.append(
            {
                "name": name,
                "ok": bool(ok),
                "value": value,
                "recommendation": recommendation,
            }
        )

    jwt_is_default = settings.JWT_SECRET in {"", "change-me-please"}
    add(
        "JWT secret",
        not jwt_is_default,
        "configured" if not jwt_is_default else "default",
        "Заменить JWT_SECRET на уникальный и хранить только в секретах окружения",
    )

    admin_secret_default = settings.ADMIN_BOOTSTRAP_SECRET in {"", "change-me-admin-bootstrap"}
    add(
        "Admin bootstrap secret",
        not admin_secret_default,
        "configured" if not admin_secret_default else "default",
        "Сменить ADMIN_BOOTSTRAP_SECRET и ограничить использование только на bootstrap",
    )

    admin_ui_login_set = bool(str(settings.ADMIN_UI_LOGIN or "").strip())
    admin_ui_password_set = bool(str(settings.ADMIN_UI_PASSWORD or "").strip())
    admin_ui_password_default = str(settings.ADMIN_UI_PASSWORD or "").strip() in {"", "admin123"}
    add(
        "Admin UI логин/пароль",
        admin_ui_login_set and admin_ui_password_set and (not admin_ui_password_default),
        "configured" if admin_ui_login_set and admin_ui_password_set and (not admin_ui_password_default) else "default",
        "Настроить ADMIN_UI_LOGIN/ADMIN_UI_PASSWORD и заменить пароль по умолчанию",
    )

    sms_ready = bool(settings.SMS_PROVIDER_URL and settings.SMS_PROVIDER_TOKEN)
    add(
        "SMS provider credentials",
        sms_ready,
        "configured" if sms_ready else "missing",
        "Заполнить SMS_PROVIDER_URL и SMS_PROVIDER_TOKEN для production OTP",
    )

    payment_ready = bool(
        settings.ROBOKASSA_MERCHANT_LOGIN
        or settings.TBANK_TERMINAL_KEY
        or settings.YOOKASSA_SHOP_ID
    )
    add(
        "Payment provider credentials",
        payment_ready,
        "configured" if payment_ready else "missing",
        "Подключить минимум один production payment provider credential set",
    )

    webhook_defaults = {
        settings.WEBHOOK_SECRET_ROBOKASSA in {"", "robokassa-secret"},
        settings.WEBHOOK_SECRET_TBANK in {"", "tbank-secret"},
        settings.WEBHOOK_SECRET_YOOKASSA in {"", "yookassa-secret"},
    }
    webhooks_ok = webhook_defaults == {False}
    add(
        "Webhook secrets",
        webhooks_ok,
        "configured" if webhooks_ok else "default",
        "Сменить WEBHOOK_SECRET_* значения на уникальные секреты",
    )

    state_exists = _USER_STATE_PATH.exists()
    add(
        "State file",
        state_exists,
        "exists" if state_exists else "missing",
        "Проверить backup/restore для user_state.json и ограничить доступ по правам",
    )

    backup_dir = Path("/root/synapse/content_packs")
    backup_dir_ok = backup_dir.exists() and backup_dir.is_dir()
    add(
        "Backup artifacts directory",
        backup_dir_ok,
        "exists" if backup_dir_ok else "missing",
        "Убедиться, что backup/snapshot артефакты регулярно попадают в /root/synapse/content_packs",
    )

    alerts_workflow = Path("/root/synapse/.github/workflows/auth-sync-ci.yml")
    alerts_ok = alerts_workflow.exists()
    alerts_has_schedule = False
    if alerts_ok:
        try:
            workflow_text = alerts_workflow.read_text(encoding="utf-8")
            alerts_has_schedule = "schedule:" in workflow_text
        except Exception:
            alerts_has_schedule = False
    add(
        "Alerts/CI baseline workflow",
        alerts_ok,
        "exists" if alerts_ok else "missing",
        "Поддерживать workflow c health/tests check и алертинг каналом",
    )
    add(
        "Alerts workflow schedule",
        alerts_ok and alerts_has_schedule,
        "enabled" if alerts_ok and alerts_has_schedule else "missing",
        "Добавить schedule в auth-sync-ci для регулярной проверки и раннего детекта сбоев",
    )

    alerts_channel = str(settings.ALERTS_CHANNEL_TARGET or "").strip()
    add(
        "Alerts delivery channel",
        bool(alerts_channel),
        alerts_channel if alerts_channel else "missing",
        "Заполнить ALERTS_CHANNEL_TARGET (email/slack/telegram webhook) и закрепить on-call",
    )

    maintenance_scripts = [
        Path("/root/synapse/backend/app/scripts/run_payment_maintenance.py"),
        Path("/root/synapse/backend/app/scripts/cleanup_webhook_storage.py"),
    ]
    maintenance_ok = all(p.exists() for p in maintenance_scripts)
    add(
        "Maintenance scripts baseline",
        maintenance_ok,
        "ready" if maintenance_ok else "incomplete",
        "Поддерживать run_payment_maintenance и cleanup_webhook_storage для операционной стабильности",
    )

    dry_run_status = get_backup_dry_run_status()
    dry_run_ok = dry_run_status.get("status") == "ok"
    add(
        "Backup restore dry-run status",
        dry_run_ok,
        str(dry_run_status.get("status")),
        "Запустить /admin/security/backup-dry-run/run и добиться статуса ok",
    )

    dry_run_sla = _last_success_within(7)
    add(
        "Backup restore last success SLA (<=7d)",
        bool(dry_run_sla.get("ok")),
        (
            f"{dry_run_sla.get('ageHours')}h"
            if dry_run_sla.get("ageHours") is not None
            else "missing"
        ),
        "Поддерживать успешный restore dry-run минимум раз в 7 дней",
    )
    if not dry_run_sla.get("ok"):
        alerts.append(
            {
                "code": "backup_dry_run_sla",
                "severity": "high",
                "title": "Просрочен успешный restore dry-run",
                "message": "Последний успешный dry-run старше 7 дней или отсутствует",
                "value": (
                    f"{dry_run_sla.get('ageHours')}h"
                    if dry_run_sla.get("ageHours") is not None
                    else "missing"
                ),
            }
        )

    if dry_run_status.get("status") == "failed":
        alerts.append(
            {
                "code": "backup_dry_run_failed",
                "severity": "high",
                "title": "Последний dry-run завершился ошибкой",
                "message": str(dry_run_status.get("error") or "Нет деталей ошибки"),
                "value": str(dry_run_status.get("finishedAt") or "unknown"),
            }
        )

    mobile_ctx = _mobile_readiness_context()
    add(
        "Mobile root workspace",
        bool(mobile_ctx.get("mobileRootExists")),
        "exists" if mobile_ctx.get("mobileRootExists") else "missing",
        "Поддерживать /root/synapse/mobile в актуальном состоянии для first-run/onboarding трека",
    )
    add(
        "Mobile onboarding route wiring",
        bool(mobile_ctx.get("onboardingScreenExists")) and bool(mobile_ctx.get("onboardingNavigatorWired")),
        "wired" if mobile_ctx.get("onboardingNavigatorWired") else "missing",
        "Проверить OnboardingRoleScreen и initialRouteName onboardingDone/MainTabs в RootNavigator",
    )
    add(
        "Mobile first-run content sync",
        bool(mobile_ctx.get("firstRunSyncReady")),
        "ready" if mobile_ctx.get("firstRunSyncReady") else "missing",
        "Проверить contentUpdateService: packs/index fetch + content_meta upsert",
    )
    add(
        "Mobile APK demo readiness",
        bool(mobile_ctx.get("apkDemoProfileReady")) and bool(mobile_ctx.get("apkScriptsReady")),
        "ready" if mobile_ctx.get("apkDemoProfileReady") and mobile_ctx.get("apkScriptsReady") else "incomplete",
        "Поддерживать demo-apk profile в eas.json и npm scripts apk:preflight/apk:build:demo",
    )

    content_ingestion = content_ingestion_status()
    add(
        "Content ingestion packs availability",
        bool(content_ingestion.get("packFiles", 0) > 0),
        str(content_ingestion.get("packFiles", 0)),
        "Проверить, что в content_packs лежат *_pack_*.json файлы",
    )
    add(
        "Content ingestion JSON validity",
        bool(content_ingestion.get("parseErrorCount", 0) == 0 and content_ingestion.get("packFiles", 0) > 0),
        (
            "ok"
            if content_ingestion.get("parseErrorCount", 0) == 0
            else f"errors={content_ingestion.get('parseErrorCount', 0)}"
        ),
        "Исправить битые content pack JSON перед импортом",
    )
    add(
        "Content seed token configured",
        bool(content_ingestion.get("seedTokenConfigured")),
        "configured" if content_ingestion.get("seedTokenConfigured") else "missing",
        "Заполнить CONTENT_SEED_TOKEN для защищенного /content/seed",
    )

    smoke = _read_mobile_onboarding_smoke_status()
    smoke_ok = str(smoke.get("status") or "") == "ok"
    add(
        "Mobile onboarding smoke evidence",
        smoke_ok,
        str(smoke.get("status") or "never-run"),
        "Зафиксировать smoke-run через /admin/security/mobile-onboarding/smoke после ручной проверки first-run flow",
    )
    smoke_sla = _mobile_smoke_sla(7)
    add(
        "Mobile onboarding smoke SLA (<=7d)",
        bool(smoke_sla.get("ok")),
        (
            f"{smoke_sla.get('ageHours')}h"
            if smoke_sla.get("ageHours") is not None
            else str(smoke_sla.get("status") or "missing")
        ),
        "Поддерживать успешный onboarding smoke минимум раз в 7 дней",
    )
    if str(smoke.get("status") or "") == "failed":
        alerts.append(
            {
                "code": "mobile_onboarding_smoke_failed",
                "severity": "high",
                "title": "Провален mobile onboarding smoke",
                "message": str(smoke.get("notes") or "Нет деталей"),
                "value": str(smoke.get("lastRunAt") or "unknown"),
            }
        )
    elif smoke_ok and not smoke_sla.get("ok"):
        alerts.append(
            {
                "code": "mobile_onboarding_smoke_stale",
                "severity": "medium",
                "title": "Просрочен mobile onboarding smoke",
                "message": "Последний успешный smoke старше 7 дней",
                "value": (
                    f"{smoke_sla.get('ageHours')}h"
                    if smoke_sla.get("ageHours") is not None
                    else "missing"
                ),
            }
        )

    if content_ingestion.get("parseErrorCount", 0) > 0:
        alerts.append(
            {
                "code": "content_ingestion_parse_errors",
                "severity": "high",
                "title": "Обнаружены ошибки парсинга content packs",
                "message": "; ".join(content_ingestion.get("parseErrors", [])[:3]) or "Проверьте JSON файлы",
                "value": str(content_ingestion.get("parseErrorCount")),
            }
        )
    elif content_ingestion.get("packFiles", 0) == 0:
        alerts.append(
            {
                "code": "content_ingestion_no_packs",
                "severity": "high",
                "title": "Не найдены content packs для импорта",
                "message": "В директории content_packs нет файлов *_pack_*.json",
                "value": "0",
            }
        )

    alerts = _apply_alert_ack_state(alerts)
    ok_count = sum(1 for c in checks if c["ok"])
    return {
        "generatedAt": _now_iso(),
        "okChecks": ok_count,
        "totalChecks": len(checks),
        "alertCount": len(alerts),
        "alerts": alerts,
        "checks": checks,
    }


def security_actions() -> Dict[str, Any]:
    actions: List[Dict[str, Any]] = []

    def add(title: str, command: str, ready: bool, note: str, owner: str, sla: str) -> None:
        actions.append(
            {
                "title": title,
                "command": command,
                "ready": bool(ready),
                "note": note,
                "owner": owner,
                "sla": sla,
            }
        )

    add(
        "Ротация JWT секрета",
        "Обновить JWT_SECRET в .env и перезапустить backend контейнер",
        settings.JWT_SECRET not in {"", "change-me-please"},
        "После смены секрета потребуется перелогин пользователей",
        "Backend on-call",
        "24h",
    )

    add(
        "Ротация bootstrap секрета",
        "Обновить ADMIN_BOOTSTRAP_SECRET в .env и ограничить доступ к endpoint bootstrap-owner",
        settings.ADMIN_BOOTSTRAP_SECRET not in {"", "change-me-admin-bootstrap"},
        "Bootstrap endpoint использовать только при первичной инициализации",
        "Security owner",
        "24h",
    )

    add(
        "Ротация пароля админ-панели",
        "Обновить ADMIN_UI_LOGIN/ADMIN_UI_PASSWORD в .env и перезапустить backend контейнер",
        bool(str(settings.ADMIN_UI_LOGIN or "").strip()) and str(settings.ADMIN_UI_PASSWORD or "").strip() not in {"", "admin123"},
        "Не использовать пароль по умолчанию admin123",
        "Security owner",
        "24h",
    )

    backup_artifacts_path = Path("/root/synapse/content_packs")
    add(
        "Проверка backup-артефактов",
        "Проверить наличие свежих snapshot в /root/synapse/content_packs и протестировать восстановление в staging",
        backup_artifacts_path.exists(),
        "Рекомендуется weekly restore dry-run",
        "SRE",
        "7d",
    )

    cleanup_script = Path("/root/synapse/backend/app/scripts/cleanup_webhook_storage.py")
    add(
        "Очистка webhook storage",
        "python -m app.scripts.cleanup_webhook_storage",
        cleanup_script.exists(),
        "Запускать регулярно по cron/CI",
        "Payments on-call",
        "3d",
    )

    maintenance_script = Path("/root/synapse/backend/app/scripts/run_payment_maintenance.py")
    add(
        "Платежное обслуживание",
        "python -m app.scripts.run_payment_maintenance",
        maintenance_script.exists(),
        "Проверять webhook dead letters и reconciliation",
        "Payments on-call",
        "1d",
    )

    workflow_file = Path("/root/synapse/.github/workflows/auth-sync-ci.yml")
    add(
        "CI baseline и алерты",
        "Проверить, что workflow auth-sync-ci запускается и репортит сбои в канал алертов",
        workflow_file.exists(),
        "Добавить integration alert channel (email/slack/telegram)",
        "Platform owner",
        "24h",
    )

    alert_channel = str(settings.ALERTS_CHANNEL_TARGET or "").strip()
    add(
        "Канал доставки алертов",
        "Настроить ALERTS_CHANNEL_TARGET в .env и проверить доставку тестового алерта",
        bool(alert_channel),
        "Канал должен быть привязан к on-call дежурству",
        "Security owner",
        "24h",
    )

    mobile_ctx = _mobile_readiness_context()
    add(
        "Mobile onboarding smoke",
        "Проверить first-run на устройстве: выбор роли -> OTP sync -> переход в MainTabs",
        bool(mobile_ctx.get("onboardingScreenExists")) and bool(mobile_ctx.get("onboardingNavigatorWired")),
        "Снять видео-доказательство onboarding flow на тестовом устройстве",
        "Mobile owner",
        "24h",
    )
    add(
        "APK demo preflight/build",
        "cd /root/synapse/mobile && npm run apk:preflight && npm run apk:build:demo",
        bool(mobile_ctx.get("apkDemoProfileReady")) and bool(mobile_ctx.get("apkScriptsReady")),
        "Убедиться, что app-apks содержит свежий demo APK артефакт",
        "Release owner",
        "3d",
    )

    ingestion = content_ingestion_status()
    add(
        "Content ingestion import run",
        "cd /root/synapse/backend && CONTENT_PACKS_DIR=/root/synapse/content_packs ./venv/bin/python -m app.scripts.import_content_packs",
        bool(ingestion.get("importScriptExists")) and bool(ingestion.get("packFiles", 0) > 0),
        "После импорта проверить /content/sections/* и smoke мобильного first-run",
        "Content owner",
        "24h",
    )

    ready_count = sum(1 for a in actions if a["ready"])
    return {
        "generatedAt": _now_iso(),
        "readyActions": ready_count,
        "totalActions": len(actions),
        "actions": actions,
    }


def _build_backup_evidence(checks: Dict[str, Any]) -> List[Dict[str, Any]]:
    labels = {
        "userStateExists": "Найден user_state.json",
        "userStateJsonValid": "JSON user_state.json валиден",
        "userStateRestoreReadable": "Копия user_state читается после restore",
        "contentDbQuickCheck": "SQLite quick_check для контентной БД",
        "contentPacksDirExists": "Директория content packs существует",
        "contentPacksReadable": "Директория content packs доступна для чтения",
    }
    items: List[Dict[str, Any]] = []
    for key, label in labels.items():
        value = checks.get(key)
        items.append({"key": key, "label": label, "ok": bool(value), "value": value})
    return items


def get_backup_dry_run_status() -> Dict[str, Any]:
    if not _SECURITY_STATUS_PATH.exists():
        return {
            "exists": False,
            "status": "never-run",
            "message": "Dry-run backup/restore еще не запускался",
        }
    try:
        data = json.loads(_SECURITY_STATUS_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data["exists"] = True
            checks = data.get("checks")
            if isinstance(checks, dict):
                data["evidence"] = _build_backup_evidence(checks)
            history = _read_backup_dry_run_history()
            data["history"] = history[:5]
            last_failed = next((h for h in history if h.get("status") == "failed"), None)
            if isinstance(last_failed, dict):
                data["lastFailedReason"] = last_failed.get("error")
            return data
    except Exception:
        pass
    return {
        "exists": True,
        "status": "invalid",
        "message": "Не удалось прочитать статус dry-run",
    }


def get_backup_dry_run_history(limit: int = 10, from_date: str | None = None, to_date: str | None = None) -> Dict[str, Any]:
    capped_limit = max(1, min(limit, 50))
    history = _filter_history_rows(
        _read_backup_dry_run_history(),
        from_date=from_date,
        to_date=to_date,
    )
    ok_runs = sum(1 for row in history if str(row.get("status")) == "ok")
    failed_runs = sum(1 for row in history if str(row.get("status")) == "failed")
    success_rate = round((ok_runs / len(history) * 100.0), 1) if history else None
    last_success = next((h for h in history if h.get("status") == "ok"), None)
    last_failed = next((h for h in history if h.get("status") == "failed"), None)
    return {
        "generatedAt": _now_iso(),
        "fromDate": from_date,
        "toDate": to_date,
        "totalRuns": len(history),
        "okRuns": ok_runs,
        "failedRuns": failed_runs,
        "successRate": success_rate,
        "history": history[:capped_limit],
        "lastSuccessAt": (last_success or {}).get("finishedAt"),
        "lastFailedAt": (last_failed or {}).get("finishedAt"),
        "lastFailedReason": (last_failed or {}).get("error"),
    }


def mobile_readiness_summary() -> Dict[str, Any]:
    ctx = _mobile_readiness_context()
    smoke = _read_mobile_onboarding_smoke_status()
    smoke_sla = _mobile_smoke_sla(7)
    checks = {
        "workspace": bool(ctx.get("mobileRootExists")),
        "onboarding": bool(ctx.get("onboardingScreenExists")) and bool(ctx.get("onboardingNavigatorWired")),
        "firstRunSync": bool(ctx.get("firstRunSyncReady")),
        "apkDemo": bool(ctx.get("apkDemoProfileReady")) and bool(ctx.get("apkScriptsReady")),
    }
    core_ok = all(checks.values())
    smoke_status = str(smoke.get("status") or "never-run")
    if smoke_status == "failed":
        level = "red"
    elif core_ok and smoke_status == "ok" and bool(smoke_sla.get("ok")):
        level = "green"
    else:
        level = "yellow"

    return {
        "generatedAt": _now_iso(),
        "level": level,
        "coreChecks": checks,
        "coreReady": core_ok,
        "smoke": smoke,
        "smokeSla": smoke_sla,
    }


def legal_compliance_status_summary() -> Dict[str, Any]:
    status_file = Path("/root/synapse/backend/app/web_admin/legal-rf-compliance-status-ru.md")
    if not status_file.exists():
        return {
            "generatedAt": _now_iso(),
            "level": "red",
            "source": str(status_file),
            "items": [],
            "counts": {"NOT_STARTED": 0, "IN_PROGRESS": 0, "READY_FOR_REVIEW": 0, "APPROVED": 0, "UNKNOWN": 0},
            "goNoGo": {
                "ok": False,
                "status": "no-go",
                "requiredApproved": [],
                "missingApproved": ["Файл legal-rf-compliance-status-ru.md не найден"],
            },
        }

    allowed = {"NOT_STARTED", "IN_PROGRESS", "READY_FOR_REVIEW", "APPROVED"}
    lines = status_file.read_text(encoding="utf-8", errors="ignore").splitlines()
    current_group = "Общее"
    items: List[Dict[str, Any]] = []

    for raw in lines:
        line = str(raw or "").strip()
        if not line:
            continue
        if line.startswith("## "):
            current_group = line[3:].strip() or "Общее"
            continue
        if not line.startswith("- "):
            continue
        body = line[2:].strip()
        if ":" not in body:
            continue
        left, right = body.rsplit(":", 1)
        title = left.strip()
        status = right.strip().upper()
        if not title:
            continue
        normalized = status if status in allowed else "UNKNOWN"
        items.append(
            {
                "group": current_group,
                "title": title,
                "status": normalized,
                "rawStatus": status,
            }
        )

    counts = {k: 0 for k in ["NOT_STARTED", "IN_PROGRESS", "READY_FOR_REVIEW", "APPROVED", "UNKNOWN"]}
    for item in items:
        st = str(item.get("status") or "UNKNOWN")
        counts[st] = int(counts.get(st) or 0) + 1

    required_approved = [
        "Пользовательское соглашение",
        "Политика обработки персональных данных",
        "Согласие на обработку ПДн",
        "Подписание go-live legal memo",
    ]
    title_to_status = {str(i.get("title") or ""): str(i.get("status") or "UNKNOWN") for i in items}
    missing_approved = [title for title in required_approved if title_to_status.get(title) != "APPROVED"]

    if not items:
        level = "red"
    elif not missing_approved and counts.get("UNKNOWN", 0) == 0:
        level = "green"
    elif counts.get("IN_PROGRESS", 0) > 0 or counts.get("READY_FOR_REVIEW", 0) > 0:
        level = "yellow"
    else:
        level = "red"

    return {
        "generatedAt": _now_iso(),
        "source": str(status_file),
        "version": next((l.split(":", 1)[1].strip() for l in lines if l.strip().lower().startswith("версия:")), None),
        "level": level,
        "items": items,
        "counts": counts,
        "goNoGo": {
            "ok": len(missing_approved) == 0,
            "status": "go" if len(missing_approved) == 0 else "no-go",
            "requiredApproved": required_approved,
            "missingApproved": missing_approved,
        },
    }


def set_legal_compliance_item_status(*, title: str, status: str, changed_by: str) -> Dict[str, Any]:
    item_title = str(title or "").strip()
    if not item_title:
        raise ValueError("Title is required")

    normalized_status = str(status or "").strip().upper()
    allowed_statuses = {"NOT_STARTED", "IN_PROGRESS", "READY_FOR_REVIEW", "APPROVED"}
    if normalized_status not in allowed_statuses:
        raise ValueError("Unsupported status. Use NOT_STARTED|IN_PROGRESS|READY_FOR_REVIEW|APPROVED")

    status_file = Path("/root/synapse/backend/app/web_admin/legal-rf-compliance-status-ru.md")
    if not status_file.exists():
        raise ValueError("Файл legal-rf-compliance-status-ru.md не найден")

    lines = status_file.read_text(encoding="utf-8", errors="ignore").splitlines()
    pattern = re.compile(r"^(\s*-\s*" + re.escape(item_title) + r"\s*:\s*)([A-Z_]+)\s*$")
    line_index = -1
    old_status = None

    for idx, raw in enumerate(lines):
        match = pattern.match(str(raw or ""))
        if not match:
            continue
        line_index = idx
        old_status = str(match.group(2) or "").strip().upper()
        prefix = str(match.group(1) or "")
        lines[idx] = prefix + normalized_status
        break

    if line_index < 0:
        raise ValueError("Пункт не найден в legal tracker")

    status_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    now = _now_iso()
    state = _read_state()
    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": now,
            "action": "legal_compliance_status_set",
            "title": item_title,
            "fromStatus": old_status,
            "toStatus": normalized_status,
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)

    return {
        "updated": True,
        "title": item_title,
        "fromStatus": old_status,
        "toStatus": normalized_status,
        "changedBy": changed_by,
        "updatedAt": now,
        "summary": legal_compliance_status_summary(),
    }


def list_legal_compliance_history(limit: int = 30) -> Dict[str, Any]:
    capped_limit = max(1, min(int(limit or 30), 200))
    state = _read_state()
    audit_rows = state.get("admin_audit") if isinstance(state.get("admin_audit"), list) else []
    rows = []
    for raw in reversed(audit_rows):
        if not isinstance(raw, dict):
            continue
        if str(raw.get("action") or "") != "legal_compliance_status_set":
            continue
        rows.append(
            {
                "at": raw.get("at"),
                "title": raw.get("title"),
                "fromStatus": raw.get("fromStatus"),
                "toStatus": raw.get("toStatus"),
                "changedBy": raw.get("changedBy"),
            }
        )
        if len(rows) >= capped_limit:
            break
    latest = rows[0] if rows else {}
    return {
        "generatedAt": _now_iso(),
        "count": len(rows),
        "latestAt": latest.get("at"),
        "history": rows,
    }


def production_go_no_go_summary() -> Dict[str, Any]:
    checklist = security_checklist()
    mobile = mobile_readiness_summary()
    content = content_ingestion_status()
    legal = legal_compliance_status_summary()
    alerts_payload = list_security_alerts_filtered(acked="unacked", severity="high")

    checks = [c for c in checklist.get("checks", []) if isinstance(c, dict)]

    def _check_ok(name: str) -> bool:
        row = next((c for c in checks if str(c.get("name")) == name), None)
        return bool((row or {}).get("ok"))

    security_hardening_ok = all(
        [
            _check_ok("JWT secret"),
            _check_ok("Admin bootstrap secret"),
            _check_ok("Admin UI логин/пароль"),
            _check_ok("Backup restore last success SLA (<=7d)"),
        ]
    )
    payments_ok = _check_ok("Payment provider credentials") and _check_ok("Webhook secrets")
    onboarding_ok = str(mobile.get("level") or "").lower() == "green"
    content_ok = str(content.get("level") or "").lower() == "green"
    unacked_high = int(alerts_payload.get("alertCount") or 0)

    doc_files = [
        Path("/root/synapse/backend/app/web_admin/admin-manual-ru-v3.docx"),
        Path("/root/synapse/backend/app/web_admin/admin-one-page-ru-v3.html"),
    ]
    governance_docs_ok = all(p.exists() for p in doc_files)
    legal_gate_ok = bool((legal.get("goNoGo") or {}).get("ok"))
    legal_missing = [x for x in ((legal.get("goNoGo") or {}).get("missingApproved") or []) if isinstance(x, str)]

    gates = [
        {
            "key": "high_alerts",
            "title": "Неподтвержденные high-алерты",
            "ok": unacked_high == 0,
            "value": str(unacked_high),
            "note": "Перед cutover должно быть 0 unacked high-alerts",
            "priority": "P0",
            "action": "Разобрать и подтвердить все high-алерты с комментарием",
            "owner": "Security on-call",
        },
        {
            "key": "security_hardening",
            "title": "Безопасность и секреты",
            "ok": security_hardening_ok,
            "value": "ok" if security_hardening_ok else "attention",
            "note": "JWT/admin secrets + SLA теста восстановления",
            "priority": "P0",
            "action": "Закрыть checklist secrets и обновить evidence по backup restore SLA",
            "owner": "Security owner",
        },
        {
            "key": "payments_readiness",
            "title": "Платежный контур",
            "ok": payments_ok,
            "value": "ok" if payments_ok else "attention",
            "note": "Проверка credentials и webhook secrets",
            "priority": "P1",
            "action": "Проверить payment credentials, webhook secrets и smoke webhook delivery",
            "owner": "Payments owner",
        },
        {
            "key": "mobile_onboarding",
            "title": "Mobile onboarding",
            "ok": onboarding_ok,
            "value": str(mobile.get("level") or "unknown"),
            "note": "Green уровень readiness + smoke SLA",
            "priority": "P1",
            "action": "Довести mobile readiness до green и обновить smoke evidence",
            "owner": "Mobile owner",
        },
        {
            "key": "content_ingestion",
            "title": "Контент и импорт паков",
            "ok": content_ok,
            "value": str(content.get("level") or "unknown"),
            "note": "Должны быть валидные content packs без parse errors",
            "priority": "P1",
            "action": "Устранить parse errors и подтвердить свежий import run",
            "owner": "Content owner",
        },
        {
            "key": "governance_docs",
            "title": "Документы и сменный регламент",
            "ok": governance_docs_ok,
            "value": "ok" if governance_docs_ok else "missing",
            "note": "Наличие инструкции v3 и printable one-page",
            "priority": "P2",
            "action": "Проверить доступность v3 документов и printable one-page в runtime",
            "owner": "Ops owner",
        },
        {
            "key": "legal_compliance",
            "title": "Юридический комплаенс РФ",
            "ok": legal_gate_ok,
            "value": str((legal.get("goNoGo") or {}).get("status") or "no-go"),
            "note": "Блокирующие документы и финальный legal memo должны быть APPROVED",
            "priority": "P0",
            "action": (
                "Довести до APPROVED: " + "; ".join(legal_missing[:4])
                if legal_missing
                else "Поддерживать legal-статусы в APPROVED"
            ),
            "owner": "Legal owner",
        },
    ]

    blockers = [g["title"] for g in gates if not g["ok"]]
    go = len(blockers) == 0

    priority_rank = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    failed_gates = [g for g in gates if not g.get("ok")]
    failed_gates.sort(key=lambda g: priority_rank.get(str(g.get("priority") or "P3"), 99))
    next_actions = [
        {
            "gate": g.get("title"),
            "priority": g.get("priority"),
            "owner": g.get("owner"),
            "action": g.get("action"),
        }
        for g in failed_gates[:3]
    ]

    latest_pack_dt = _parse_iso_datetime(content.get("latestPackAt"))
    latest_pack_age_hours = None
    if latest_pack_dt:
        latest_pack_age_hours = round((datetime.now(timezone.utc) - latest_pack_dt).total_seconds() / 3600.0, 1)

    evidence = {
        "mobile": {
            "level": mobile.get("level"),
            "smokeStatus": ((mobile.get("smoke") or {}).get("status") if isinstance(mobile.get("smoke"), dict) else None),
            "smokeLastRunAt": ((mobile.get("smoke") or {}).get("lastRunAt") if isinstance(mobile.get("smoke"), dict) else None),
            "smokeAgeHours": ((mobile.get("smokeSla") or {}).get("ageHours") if isinstance(mobile.get("smokeSla"), dict) else None),
            "smokeSlaOk": bool((mobile.get("smokeSla") or {}).get("ok")) if isinstance(mobile.get("smokeSla"), dict) else False,
        },
        "content": {
            "level": content.get("level"),
            "packFiles": int(content.get("packFiles") or 0),
            "parseErrorCount": int(content.get("parseErrorCount") or 0),
            "latestPackAt": content.get("latestPackAt"),
            "latestPackAgeHours": latest_pack_age_hours,
        },
        "legal": {
            "level": legal.get("level"),
            "status": (legal.get("goNoGo") or {}).get("status"),
            "missingApproved": legal_missing,
        },
    }

    summary = {
        "generatedAt": _now_iso(),
        "go": go,
        "status": "go" if go else "no-go",
        "totalGates": len(gates),
        "passedGates": sum(1 for g in gates if g["ok"]),
        "blockers": blockers,
        "gates": gates,
        "nextActions": next_actions,
        "evidence": evidence,
    }
    _record_go_no_go_snapshot(summary)
    return summary
def set_mobile_onboarding_smoke_result(*, status: str, notes: str | None, changed_by: str) -> Dict[str, Any]:
    normalized = str(status or "").strip().lower()
    if normalized not in {"ok", "failed"}:
        raise ValueError("Unsupported status. Use ok|failed")

    now = _now_iso()
    payload = {
        "status": normalized,
        "lastRunAt": now,
        "lastRunBy": changed_by,
        "notes": str(notes or "").strip() or None,
    }
    _write_mobile_onboarding_smoke_status(payload)

    state = _read_state()
    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": now,
            "action": "mobile_onboarding_smoke",
            "status": normalized,
            "notes": payload.get("notes"),
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)

    return {
        "updated": True,
        "status": normalized,
        "lastRunAt": now,
        "lastRunBy": changed_by,
        "notes": payload.get("notes"),
        "summary": mobile_readiness_summary(),
    }


def list_security_alerts() -> Dict[str, Any]:
    checklist = security_checklist()
    alerts = [a for a in checklist.get("alerts", []) if isinstance(a, dict)]
    return {
        "generatedAt": checklist.get("generatedAt") or _now_iso(),
        "alertCount": len(alerts),
        "alerts": alerts,
    }


def list_security_alerts_filtered(
    *,
    acked: str | None = None,
    severity: str | None = None,
) -> Dict[str, Any]:
    payload = list_security_alerts()
    alerts = [a for a in payload.get("alerts", []) if isinstance(a, dict)]

    acked_norm = str(acked or "all").strip().lower()
    if acked_norm not in {"all", "acked", "unacked"}:
        raise ValueError("Unsupported acked filter. Use all|acked|unacked")

    severity_norm = str(severity or "all").strip().lower()
    allowed_severity = {"all", "high", "medium", "low"}
    if severity_norm not in allowed_severity:
        raise ValueError("Unsupported severity filter. Use all|high|medium|low")

    if acked_norm == "acked":
        alerts = [a for a in alerts if bool(a.get("acknowledged"))]
    elif acked_norm == "unacked":
        alerts = [a for a in alerts if not bool(a.get("acknowledged"))]

    if severity_norm != "all":
        alerts = [a for a in alerts if str(a.get("severity", "")).lower() == severity_norm]

    return {
        "generatedAt": payload.get("generatedAt") or _now_iso(),
        "acked": acked_norm,
        "severity": severity_norm,
        "alertCount": len(alerts),
        "alerts": alerts,
    }


def acknowledge_security_alert(
    *,
    code: str,
    acknowledged: bool,
    comment: str | None,
    changed_by: str,
) -> Dict[str, Any]:
    normalized_code = str(code or "").strip()
    if not normalized_code:
        raise ValueError("alert code is required")

    alerts_payload = list_security_alerts()
    if not any(str(a.get("code")) == normalized_code for a in alerts_payload.get("alerts", [])):
        raise ValueError("alert code not found")

    acks = _read_security_alert_acks()
    now = _now_iso()
    if acknowledged:
        acks[normalized_code] = {
            "acknowledged": True,
            "ackBy": changed_by,
            "ackAt": now,
            "ackComment": str(comment or "").strip() or None,
        }
    else:
        acks.pop(normalized_code, None)
    _write_security_alert_acks(acks)

    state = _read_state()
    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": now,
            "action": "security_alert_ack",
            "alertCode": normalized_code,
            "acknowledged": bool(acknowledged),
            "comment": str(comment or "").strip() or None,
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)

    refreshed = list_security_alerts()
    row = next((a for a in refreshed.get("alerts", []) if str(a.get("code")) == normalized_code), None)
    return {
        "code": normalized_code,
        "acknowledged": bool(acknowledged),
        "changedBy": changed_by,
        "changedAt": now,
        "alert": row,
    }


def _apply_security_export_mode(bundle: Dict[str, Any], mode: str) -> Dict[str, Any]:
    normalized_mode = (mode or "all").strip().lower()
    if normalized_mode == "all":
        return bundle

    checklist = dict(bundle.get("checklist", {}))
    actions = dict(bundle.get("actions", {}))
    history = dict(bundle.get("dryRunHistory", {}))
    mobile_readiness = dict(bundle.get("mobileReadiness", {}))
    mobile_smoke = dict(bundle.get("mobileSmoke", {}))
    content_ingestion = dict(bundle.get("contentIngestion", {}))
    go_no_go = dict(bundle.get("goNoGo", {}))

    checks = [c for c in checklist.get("checks", []) if isinstance(c, dict)]
    alerts = [a for a in checklist.get("alerts", []) if isinstance(a, dict)]
    action_rows = [a for a in actions.get("actions", []) if isinstance(a, dict)]
    history_rows = [h for h in history.get("history", []) if isinstance(h, dict)]

    if normalized_mode in {"alerts", "failures"}:
        checks = [c for c in checks if not c.get("ok")]
        action_rows = [a for a in action_rows if not a.get("ready")]
        history_rows = [h for h in history_rows if str(h.get("status")) != "ok"]
        if normalized_mode == "failures":
            alerts = [a for a in alerts if str(a.get("severity", "")).lower() == "high"]

        mobile_level = str(mobile_readiness.get("level") or "unknown").lower()
        if mobile_level == "green":
            mobile_readiness = {}

        smoke_status = str(mobile_smoke.get("status") or "unknown").lower()
        smoke_sla_ok = bool((bundle.get("mobileReadiness") or {}).get("smokeSla", {}).get("ok"))
        if smoke_status == "ok" and smoke_sla_ok:
            mobile_smoke = {}

        content_level = str(content_ingestion.get("level") or "unknown").lower()
        if content_level == "green":
            content_ingestion = {}

    checklist["checks"] = checks
    checklist["alerts"] = alerts
    checklist["totalChecks"] = len(checks)
    checklist["okChecks"] = sum(1 for c in checks if c.get("ok"))
    checklist["alertCount"] = len(alerts)

    actions["actions"] = action_rows
    actions["totalActions"] = len(action_rows)
    actions["readyActions"] = sum(1 for a in action_rows if a.get("ready"))

    history["history"] = history_rows
    history["totalRuns"] = len(history_rows)

    return {
        "generatedAt": bundle.get("generatedAt") or _now_iso(),
        "mode": normalized_mode,
        "fromDate": bundle.get("fromDate"),
        "toDate": bundle.get("toDate"),
        "checklist": checklist,
        "actions": actions,
        "dryRunHistory": history,
        "mobileReadiness": mobile_readiness,
        "mobileSmoke": mobile_smoke,
        "contentIngestion": content_ingestion,
        "goNoGo": go_no_go,
    }


def security_export_bundle(
    limit: int = 50,
    mode: str = "all",
    from_date: str | None = None,
    to_date: str | None = None,
) -> Dict[str, Any]:
    base = {
        "generatedAt": _now_iso(),
        "mode": "all",
        "fromDate": from_date,
        "toDate": to_date,
        "checklist": security_checklist(),
        "actions": security_actions(),
        "dryRunHistory": get_backup_dry_run_history(
            limit=max(1, min(limit, 50)),
            from_date=from_date,
            to_date=to_date,
        ),
        "mobileReadiness": mobile_readiness_summary(),
        "mobileSmoke": _read_mobile_onboarding_smoke_status(),
        "contentIngestion": content_ingestion_status(),
        "goNoGo": production_go_no_go_summary(),
    }
    return _apply_security_export_mode(base, mode)


def export_security_audit_csv(
    limit: int = 50,
    mode: str = "all",
    from_date: str | None = None,
    to_date: str | None = None,
) -> str:
    bundle = security_export_bundle(limit=limit, mode=mode, from_date=from_date, to_date=to_date)
    checklist = bundle.get("checklist", {})
    actions = bundle.get("actions", {})
    history = bundle.get("dryRunHistory", {})
    mobile_readiness = bundle.get("mobileReadiness", {})
    mobile_smoke = bundle.get("mobileSmoke", {})
    content_ingestion = bundle.get("contentIngestion", {})
    go_no_go = bundle.get("goNoGo", {})

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(
        [
            "section",
            "name",
            "status",
            "value",
            "recommendation",
            "owner",
            "sla",
            "note",
            "timestamp",
            "error",
            "acknowledged",
            "ack_by",
            "ack_at",
            "ack_comment",
        ]
    )

    for check in checklist.get("checks", []):
        writer.writerow(
            [
                "checklist",
                check.get("name"),
                "ok" if check.get("ok") else "failed",
                check.get("value"),
                check.get("recommendation"),
                "",
                "",
                "",
                checklist.get("generatedAt"),
                "",
                "",
                "",
                "",
                "",
            ]
        )

    for alert in checklist.get("alerts", []):
        writer.writerow(
            [
                "alert",
                alert.get("title"),
                alert.get("severity"),
                alert.get("value"),
                alert.get("message"),
                "",
                "",
                "",
                checklist.get("generatedAt"),
                "",
                "1" if alert.get("acknowledged") else "0",
                alert.get("ackBy") or "",
                alert.get("ackAt") or "",
                alert.get("ackComment") or "",
            ]
        )

    for action in actions.get("actions", []):
        writer.writerow(
            [
                "action",
                action.get("title"),
                "ready" if action.get("ready") else "todo",
                action.get("command"),
                "",
                action.get("owner"),
                action.get("sla"),
                action.get("note"),
                actions.get("generatedAt"),
                "",
                "",
                "",
                "",
                "",
            ]
        )

    for row in history.get("history", []):
        writer.writerow(
            [
                "dry_run_history",
                "backup_restore_dry_run",
                row.get("status"),
                row.get("finishedAt") or row.get("startedAt"),
                "",
                "",
                "",
                "",
                row.get("finishedAt") or row.get("startedAt"),
                row.get("error") or "",
                "",
                "",
                "",
                "",
            ]
        )

    if isinstance(mobile_readiness, dict) and mobile_readiness:
        writer.writerow(
            [
                "mobile_readiness",
                "mobile_readiness_level",
                mobile_readiness.get("level"),
                "coreReady=" + str(mobile_readiness.get("coreReady")),
                "",
                "",
                "",
                "",
                mobile_readiness.get("generatedAt") or "",
                "",
                "",
                "",
                "",
                "",
            ]
        )

    if isinstance(mobile_smoke, dict) and mobile_smoke:
        writer.writerow(
            [
                "mobile_smoke",
                "mobile_onboarding_smoke",
                mobile_smoke.get("status"),
                mobile_smoke.get("lastRunAt") or "",
                "",
                mobile_smoke.get("lastRunBy") or "",
                "7d",
                mobile_smoke.get("notes") or "",
                mobile_smoke.get("lastRunAt") or "",
                "",
                "",
                "",
                "",
                "",
            ]
        )

    if isinstance(content_ingestion, dict) and content_ingestion:
        writer.writerow(
            [
                "content_ingestion",
                "content_ingestion_status",
                content_ingestion.get("level"),
                "packs=" + str(content_ingestion.get("packFiles", 0)) + ",valid=" + str(content_ingestion.get("validJsonFiles", 0)),
                "",
                "Content owner",
                "24h",
                "; ".join(content_ingestion.get("parseErrors", [])[:2]),
                content_ingestion.get("generatedAt") or "",
                "",
                "",
                "",
                "",
                "",
            ]
        )

    if isinstance(go_no_go, dict) and go_no_go:
        writer.writerow(
            [
                "go_no_go",
                "release_gate_summary",
                go_no_go.get("status"),
                "passed=" + str(go_no_go.get("passedGates", 0)) + "/" + str(go_no_go.get("totalGates", 0)),
                "; ".join(go_no_go.get("blockers", [])[:5]),
                "Release owner",
                "cutover",
                "",
                go_no_go.get("generatedAt") or "",
                "",
                "",
                "",
                "",
                "",
            ]
        )
        for gate in go_no_go.get("gates", []):
            if not isinstance(gate, dict):
                continue
            writer.writerow(
                [
                    "go_no_go_gate",
                    gate.get("title"),
                    "ok" if gate.get("ok") else "failed",
                    gate.get("value"),
                    gate.get("note"),
                    "",
                    "",
                    "",
                    go_no_go.get("generatedAt") or "",
                    "",
                    "",
                    "",
                    "",
                    "",
                ]
            )

    return out.getvalue()


def run_backup_restore_dry_run() -> Dict[str, Any]:
    started_at = _now_iso()
    checks: Dict[str, Any] = {}
    success = True
    error = None

    user_state_path = _USER_STATE_PATH
    content_db_path = Path(os.getenv("SYNAPSE_CONTENT_DB", "/root/synapse/synapse.db"))
    packs_dir = Path(os.getenv("CONTENT_PACKS_DIR", "/root/synapse/content_packs"))

    try:
        state_exists = user_state_path.exists()
        checks["userStateExists"] = state_exists
        if not state_exists:
            raise RuntimeError("user_state.json not found")

        raw = user_state_path.read_text(encoding="utf-8")
        parsed = json.loads(raw)
        checks["userStateJsonValid"] = isinstance(parsed, dict)

        with tempfile.TemporaryDirectory(prefix="synapse-backup-dry-run-") as td:
            tmp_state = Path(td) / "user_state.restore.json"
            shutil.copy2(user_state_path, tmp_state)
            restored = json.loads(tmp_state.read_text(encoding="utf-8"))
            checks["userStateRestoreReadable"] = isinstance(restored, dict)

            tmp_db = Path(td) / "synapse.restore.db"
            if content_db_path.exists():
                shutil.copy2(content_db_path, tmp_db)
                con = sqlite3.connect(str(tmp_db))
                result = con.execute("pragma quick_check").fetchone()
                con.close()
                checks["contentDbQuickCheck"] = bool(result and str(result[0]).lower() == "ok")
            else:
                checks["contentDbQuickCheck"] = False

        checks["contentPacksDirExists"] = packs_dir.exists() and packs_dir.is_dir()
        checks["contentPacksReadable"] = os.access(packs_dir, os.R_OK) if packs_dir.exists() else False

    except Exception as exc:
        success = False
        error = str(exc)

    finished_at = _now_iso()
    payload = {
        "status": "ok" if success else "failed",
        "startedAt": started_at,
        "finishedAt": finished_at,
        "checks": checks,
        "evidence": _build_backup_evidence(checks),
        "error": error,
    }

    _SECURITY_STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
    _SECURITY_STATUS_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    history = _read_backup_dry_run_history()
    history.insert(
        0,
        {
            "status": payload.get("status"),
            "startedAt": payload.get("startedAt"),
            "finishedAt": payload.get("finishedAt"),
            "error": payload.get("error"),
        },
    )
    _write_backup_dry_run_history(history)

    payload["exists"] = True
    return payload


def bootstrap_owner(user_id: str) -> Dict[str, Any]:
    state = _read_state()
    state.setdefault("role_overrides", {})[user_id] = "owner"

    if user_id in state.get("consents", {}):
        state["consents"][user_id]["role"] = "owner"

    for sid, session in state.get("sessions", {}).items():
        if session.get("userId") == user_id:
            session["role"] = "owner"
            state["sessions"][sid] = session

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "bootstrap_owner",
            "targetUserId": user_id,
            "changedBy": "bootstrap",
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    return {"userId": user_id, "role": "owner", "changedBy": "bootstrap"}


def _normalize_phone(phone: str) -> str:
    src = str(phone or "").strip()
    plus = src.startswith("+")
    digits = "".join(ch for ch in src if ch.isdigit())
    if not digits:
        return ""
    return f"+{digits}" if plus else digits


def create_user_manual(
    *,
    user_id: str | None,
    phone: str,
    role: str,
    plan: str | None,
    module_id: str | None,
    changed_by: str,
) -> Dict[str, Any]:
    state = _read_state()
    normalized_phone = _normalize_phone(phone)
    if not normalized_phone:
        raise ValueError("Телефон обязателен")

    normalized_role = str(role or "student").strip().lower() or "student"
    allowed_roles = {
        "student",
        "learner",
        "teacher",
        "homeroom_teacher",
        "parent",
        "content_editor",
        "support",
        "school_admin",
        "admin",
        "owner",
    }
    if normalized_role not in allowed_roles:
        raise ValueError("Неподдерживаемая роль")

    next_user_id = str(user_id or "").strip() or f"u_manual_{normalized_phone[-6:]}"
    user = state.setdefault("users", {}).get(next_user_id)
    if not user:
        state["users"][next_user_id] = {
            "userId": next_user_id,
            "phone": normalized_phone,
            "createdAt": _now_iso(),
        }
    else:
        user["phone"] = normalized_phone
        state["users"][next_user_id] = user

    state.setdefault("phones", {})[normalized_phone] = next_user_id

    ent = state.setdefault("entitlements", {}).setdefault(next_user_id, {"plans": ["free"], "modules": [], "ai_quota_left": 20})
    if plan:
        ent["plans"] = sorted(set(ent.get("plans", []) + [plan]))
    if module_id:
        ent["modules"] = sorted(set(ent.get("modules", []) + [module_id]))

    consent_roles = {"student", "learner", "teacher", "homeroom_teacher", "parent"}
    if normalized_role in consent_roles:
        state.setdefault("consents", {})[next_user_id] = {
            "userId": next_user_id,
            "role": normalized_role,
            "version": "manual-admin",
            "acceptedAt": _now_iso(),
            "parentApproved": True,
        }
        state.setdefault("role_overrides", {}).pop(next_user_id, None)
    else:
        state.setdefault("role_overrides", {})[next_user_id] = normalized_role

    audit = state.setdefault("admin_audit", [])
    audit.append(
        {
            "at": _now_iso(),
            "action": "create_user_manual",
            "targetUserId": next_user_id,
            "phone": normalized_phone,
            "role": normalized_role,
            "plan": plan,
            "moduleId": module_id,
            "changedBy": changed_by,
        }
    )
    state["admin_audit"] = audit[-5000:]
    _write_state(state)
    return {
        "userId": next_user_id,
        "phone": normalized_phone,
        "role": normalized_role,
        "plans": ent.get("plans", []),
        "modules": ent.get("modules", []),
        "changedBy": changed_by,
    }


def database_overview() -> Dict[str, Any]:
    state = _read_state()
    state_counts = {
        "users": len(state.get("users", {})),
        "phones": len(state.get("phones", {})),
        "consents": len(state.get("consents", {})),
        "entitlements": len(state.get("entitlements", {})),
        "sessions": len(state.get("sessions", {})),
        "telemetry": len(state.get("telemetry", [])),
        "payments": len(state.get("payments", {})),
        "deadLetters": len(state.get("payment_webhook_dead_letters", [])),
    }

    content_db_path = Path(os.getenv("SYNAPSE_CONTENT_DB", "/root/synapse/synapse.db"))
    content_tables: Dict[str, int] = {}
    if content_db_path.exists():
        con = sqlite3.connect(str(content_db_path))
        cur = con.cursor()
        tables = [r[0] for r in cur.execute("select name from sqlite_master where type='table' order by name").fetchall()]
        for t in tables:
            try:
                content_tables[t] = int(cur.execute(f"select count(*) from {t}").fetchone()[0])
            except Exception:
                continue
        con.close()

    packs_dir = Path(os.getenv("CONTENT_PACKS_DIR", "/root/synapse/content_packs"))
    packs = []
    if packs_dir.exists():
        for p in sorted(glob.glob(str(packs_dir / "*.json"))):
            pp = Path(p)
            packs.append({"file": pp.name, "sizeBytes": pp.stat().st_size})

    return {
        "generatedAt": _now_iso(),
        "state": state_counts,
        "contentDb": {
            "path": str(content_db_path),
            "exists": content_db_path.exists(),
            "tables": content_tables,
        },
        "contentPacks": {
            "dir": str(packs_dir),
            "count": len(packs),
            "files": packs,
        },
    }
