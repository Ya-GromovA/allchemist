from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response

from app.core.config import settings
from app.schemas.content import (
    AuthMeOut,
    AuthLogoutIn,
    AuthLoginIn,
    AuthLoginOut,
    AuthChangePasswordIn,
    AuthPasswordResetByCodeIn,
    AuthRoleSwitchIn,
    AuthRefreshIn,
    AuthRefreshOut,
    ConsentAcceptIn,
    ConsentOut,
    DeviceSyncIn,
    DeviceSyncOut,
    EntitlementOut,
    InviteActivateIn,
    InviteActivateOut,
    InvitePreviewIn,
    InvitePreviewOut,
    LearningBatchIn,
    PhoneCodeRequestIn,
    PhoneCodeRequestOut,
    PhoneCodeVerifyIn,
    PhoneCodeVerifyOut,
    PaymentCreateIn,
    PaymentCreateOut,
    PaymentStatusOut,
    PaymentWebhookIn,
    TelemetryBatchIn,
    UserProfileOut,
)
from app.security.policies import can, normalize_role
from app.services.payment_adapters import (
    apply_provider_webhook,
    cleanup_payment_webhook_storage,
    create_payment,
    export_payment_audit_csv,
    get_payment,
    list_payment_audit,
    list_payment_dead_letters,
    query_payment_audit,
    mark_payment_succeeded,
    reprocess_dead_letter,
)
from app.services.user_state_store import (
    _read_state,
    _write_state,
    get_consent as store_get_consent,
    get_device_sync as store_get_device_sync,
    get_entitlements as store_get_entitlements,
    ingest_learning_events as store_ingest_learning_events,
    ingest_telemetry as store_ingest_telemetry,
    change_password as store_change_password,
    login_with_password,
    reset_password_by_code,
    request_phone_code,
    refresh_session,
    resolve_access_token,
    revoke_session,
    save_consent,
    list_user_devices as store_list_user_devices,
    register_user_device as store_register_user_device,
    revoke_user_device as store_revoke_user_device,
    activate_device_recovery_code as store_activate_device_recovery_code,
    delete_user_data as store_delete_user_data,
    export_user_data as store_export_user_data,
    save_device_sync,
    verify_phone_code,
)
from app.services.admin_panel_service import activate_school_invite_code, list_user_access_grants, preview_school_invite_code
from app.services.ui_labels import role_label

router = APIRouter()


def _require_auth_user(authorization: str | None = Header(default=None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")

    prefix = "Bearer "
    if not authorization.startswith(prefix):
        raise HTTPException(status_code=401, detail="Bearer token is required")

    token = authorization[len(prefix):].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Bearer token is required")

    try:
        return resolve_access_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


def _require_scope(auth_user: Dict[str, Any], scope: str) -> str:
    role = normalize_role(auth_user.get("role"))
    if not can(role, scope):
        raise HTTPException(status_code=403, detail="Insufficient role scope")
    return role


def _subject_label(subject: Any) -> str:
    value = str(subject or "chemistry").strip().lower()
    return {
        "chemistry": "химии",
        "physics": "физики",
        "biology": "биологии",
    }.get(value, value or "предмету")


def _teacher_class_assignments(state: Dict[str, Any], user_id: str, role: str) -> list[Dict[str, Any]]:
    classes = state.setdefault("school_classes", {})
    memberships = state.setdefault("school_memberships", {})
    rows: list[Dict[str, Any]] = []
    homeroom_only = role == "homeroom_teacher"

    for class_id, row in classes.items():
        if not isinstance(row, dict):
            continue
        members = memberships.get(class_id, {}) if isinstance(memberships.get(class_id), dict) else {}
        member = members.get(user_id) if isinstance(members.get(user_id), dict) else {}
        is_homeroom = member.get("role") == "homeroom_teacher" or row.get("homeroomTeacherUserId") == user_id
        is_teacher = member.get("role") == "teacher" or row.get("teacherUserId") == user_id
        if homeroom_only and not is_homeroom:
            continue
        if not homeroom_only and not (is_teacher or is_homeroom):
            continue

        title = str(row.get("title") or class_id)
        subject_label = _subject_label(row.get("subject"))
        role_label = "Классный руководитель" if is_homeroom else "Учитель"
        position = f"{role_label} {title}" if is_homeroom else f"Учитель {subject_label}"
        rows.append({
            "classId": str(class_id),
            "title": title,
            "subject": row.get("subject") or "chemistry",
            "subjectLabelRu": subject_label,
            "roleLabelRu": role_label,
            "positionLabelRu": position,
            "isHomeroom": is_homeroom,
        })
    return sorted(rows, key=lambda x: str(x.get("title") or ""))


def _build_role_data(role: str, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    state = _read_state()
    telemetry = [e for e in state.get("telemetry", []) if e.get("userId") == user_id]

    if role in {"teacher", "homeroom_teacher"}:
        assigned = sum(1 for e in telemetry if e.get("name") in {"assign_homework", "teacher_assign_homework"})
        live_demos = sum(1 for e in telemetry if e.get("name") in {"open_live_demo", "teacher_live_demo_start"})
        classrooms = preferences.get("classrooms")
        classrooms_count = len(classrooms) if isinstance(classrooms, list) else 0
        assignments = _teacher_class_assignments(state, user_id, role)
        primary_assignment = assignments[0] if assignments else None
        return {
            "quickActions": ["assign_homework", "open_live_demo", "class_analytics"],
            "roleLabelRu": "Классный руководитель" if role == "homeroom_teacher" else "Учитель",
            "positionLabelRu": primary_assignment.get("positionLabelRu") if primary_assignment else ("Классный руководитель" if role == "homeroom_teacher" else "Учитель химии"),
            "classAssignments": assignments,
            "classroomsCount": len(assignments) or classrooms_count,
            "assignedTasks": assigned,
            "liveDemos": live_demos,
        }

    if role == "parent":
        linked_children = preferences.get("linkedChildren")
        children = linked_children if isinstance(linked_children, list) else []
        progress_events = sum(1 for e in telemetry if e.get("name") in {"child_progress_open", "risk_zone_view"})
        return {
            "quickActions": ["child_progress", "risk_zones", "daily_plan_20min"],
            "roleLabelRu": "Родитель",
            "positionLabelRu": "Родитель",
            "linkedChildrenCount": len(children),
            "linkedChildren": children,
            "monitoringEvents": progress_events,
        }

    if role not in {"student", "learner"}:
        label = role_label(role)
        return {
            "quickActions": [],
            "roleLabelRu": label,
            "positionLabelRu": label,
        }

    practice_events = sum(1 for e in telemetry if e.get("name") in {"practice_started", "task_completed", "mini_exam_start"})
    return {
        "quickActions": ["continue_lesson", "practice_5_tasks", "mini_exam"],
        "roleLabelRu": "Учащийся",
        "positionLabelRu": "Учащийся",
        "recommendedMode": preferences.get("appMode", "standard"),
        "practiceEvents": practice_events,
    }


def _resolve_active_role(state: Dict[str, Any], user_id: str, fallback: str | None = None) -> str:
    role = state.get("role_overrides", {}).get(user_id) or state.get("consents", {}).get(user_id, {}).get("role") or fallback or "student"
    return normalize_role(role) or "student"


def _collect_memberships(state: Dict[str, Any], user_id: str) -> tuple[list[Dict[str, Any]], list[Dict[str, Any]]]:
    classes = state.setdefault("school_classes", {})
    memberships = state.setdefault("school_memberships", {})
    schools = state.setdefault("schools", {})
    sites = state.setdefault("school_sites", {})
    school_rows: list[Dict[str, Any]] = []
    class_rows: list[Dict[str, Any]] = []
    seen_schools: set[tuple[str, str, str]] = set()

    for class_id, members in memberships.items():
        if not isinstance(members, dict):
            continue
        member = members.get(user_id)
        if not isinstance(member, dict):
            continue
        class_row = classes.get(class_id, {}) if isinstance(classes.get(class_id), dict) else {}
        role = normalize_role(member.get("role") or class_row.get("role") or "student") or "student"
        school_id = str(member.get("schoolId") or class_row.get("schoolId") or "").strip()
        site_id = str(member.get("siteId") or class_row.get("siteId") or "").strip()
        school = schools.get(school_id, {}) if school_id and isinstance(schools.get(school_id), dict) else {}
        site = sites.get(site_id, {}) if site_id and isinstance(sites.get(site_id), dict) else {}
        row = {
            "classId": str(class_id),
            "classTitle": str(class_row.get("title") or member.get("title") or class_id),
            "schoolId": school_id or None,
            "schoolTitle": school.get("title") or None,
            "siteId": site_id or None,
            "siteTitle": site.get("title") or None,
            "role": role,
            "roleLabelRu": role_label(role),
            "subject": class_row.get("subject") or member.get("subject") or None,
            "subjectLabelRu": _subject_label(class_row.get("subject") or member.get("subject")) if (class_row.get("subject") or member.get("subject")) else None,
            "isHomeroom": role == "homeroom_teacher" or bool(class_row.get("homeroomTeacherUserId") == user_id),
        }
        class_rows.append(row)
        school_key = (school_id, site_id, role)
        if school_id and school_key not in seen_schools:
            seen_schools.add(school_key)
            school_rows.append({
                "schoolId": school_id,
                "schoolTitle": school.get("title") or None,
                "siteId": site_id or None,
                "siteTitle": site.get("title") or None,
                "role": role,
                "roleLabelRu": role_label(role),
            })

    class_rows.sort(key=lambda x: (str(x.get("classTitle") or ""), str(x.get("role") or "")))
    school_rows.sort(key=lambda x: (str(x.get("schoolTitle") or x.get("schoolId") or ""), str(x.get("role") or "")))
    return school_rows, class_rows


def _plan_label(plan: Any) -> str:
    value = str(plan or "").strip()
    return {
        "partner_school_full": "Полный школьный доступ",
        "basic": "Базовый доступ",
        "family_year": "Семейный доступ на год",
        "school_quarter": "Школьный доступ на 3 месяца",
        "pro_monthly": "Личный доступ на месяц",
        "trial": "Ознакомительный доступ",
        "lifetime": "Пожизненный доступ",
        "manual": "Ручная выдача доступа",
    }.get(value, "Доступ")


def _subscription_rows(entitlements: Dict[str, Any]) -> list[Dict[str, Any]]:
    rows = []
    for plan in entitlements.get("plans", []) or []:
        rows.append({"plan": str(plan), "titleRu": _plan_label(plan), "status": "active"})
    return rows


def _capabilities_for(role: str, entitlements: Dict[str, Any], class_memberships: list[Dict[str, Any]]) -> Dict[str, Any]:
    modules = set(entitlements.get("modules", []) or [])
    features = set(entitlements.get("features", []) or [])
    has_class = bool(class_memberships)
    return {
        "canStudy": role in {"student", "learner"} or bool(modules),
        "canViewChildProgress": role == "parent",
        "canTeach": role == "teacher" and has_class,
        "canLaunchLesson": role == "teacher" and has_class and ("teacher_live" in modules or "live_lesson" in features or "school_analytics" in features),
        "canManageHomeroom": role == "homeroom_teacher" and has_class,
        "canManageSchool": role == "school_admin",
        "canUseAi": "ai_basic" in modules or "ai_extended" in modules or "ai_mentor" in modules or role in {"teacher", "student", "learner", "parent"},
        "canManageContent": role in {"content_editor", "admin", "owner"},
        "canSupportUsers": role in {"support", "admin", "owner"},
        "canAdminSystem": role in {"admin", "owner"},
    }


def _build_auth_context(user_id: str, fallback_role: str | None = None) -> Dict[str, Any]:
    state = _read_state()
    user_row = state.get("users", {}).get(user_id, {}) if isinstance(state.get("users", {}).get(user_id), dict) else {}
    role = _resolve_active_role(state, user_id, fallback_role)
    entitlements = store_get_entitlements(user_id)
    grants = list_user_access_grants(user_id).get("items", [])
    school_memberships, class_memberships = _collect_memberships(state, user_id)
    role_values = {role}
    role_values.update(str(item) for item in state.get("user_role_modes", {}).get(user_id, []) if str(item or "").strip())
    consent_role = normalize_role(state.get("consents", {}).get(user_id, {}).get("role"))
    if consent_role:
        role_values.add(consent_role)
    role_values.update(str(row.get("role") or "") for row in class_memberships if row.get("role"))
    role_values.update(str(row.get("role") or "") for row in school_memberships if row.get("role"))
    available_roles = [
        {"role": item, "labelRu": role_label(item), "active": item == role}
        for item in sorted(role_values, key=lambda x: (x != role, role_label(x)))
        if item
    ]
    return {
        "displayName": str(user_row.get("displayName") or "").strip() or None,
        "role": role,
        "activeRole": role,
        "availableRoles": available_roles,
        "schoolMemberships": school_memberships,
        "classMemberships": class_memberships,
        "subscriptions": _subscription_rows(entitlements),
        "grants": grants,
        "capabilities": _capabilities_for(role, entitlements, class_memberships),
        "featureFlags": {
            "aiStatusIndicator": True,
            "modeSwitcher": len(available_roles) > 1,
            "deviceBinding": True,
            "schoolAccess": bool(school_memberships) or any(item.get("schoolId") for item in grants),
        },
    }


def _with_auth_context(data: Dict[str, Any], fallback_role: str | None = None) -> Dict[str, Any]:
    user_id = str(data.get("userId") or "").strip()
    if not user_id:
        return data
    context = _build_auth_context(user_id, fallback_role or data.get("role"))
    return {**data, **context}


def _switch_active_role(user_id: str, role: str) -> Dict[str, Any]:
    requested_role = normalize_role(role)
    context = _build_auth_context(user_id)
    allowed_roles = {str(item.get("role") or "") for item in context.get("availableRoles", []) if item.get("role")}
    if not requested_role or requested_role not in allowed_roles:
        raise ValueError("Этот режим работы не назначен вашему аккаунту")

    state = _read_state()
    consent_role = normalize_role(state.get("consents", {}).get(user_id, {}).get("role"))
    if requested_role == consent_role:
        state.setdefault("role_overrides", {}).pop(user_id, None)
    else:
        state.setdefault("role_overrides", {})[user_id] = requested_role
    state.setdefault("user_role_modes", {})[user_id] = sorted(allowed_roles)
    _write_state(state)
    return _build_auth_context(user_id, requested_role)


@router.get("/modules", response_model=dict, tags=["content"])
async def list_modules(authorization: str | None = Header(default=None)):
    role = "student"
    unlocked_modules = {"chemistry_core", "physics_core", "biology_preview"}

    if authorization and authorization.startswith("Bearer "):
        token = authorization[len("Bearer "):].strip()
        if token:
            try:
                auth_user = resolve_access_token(token)
                role = normalize_role(auth_user.get("role")) or "student"
                ent = store_get_entitlements(auth_user["userId"])
                unlocked_modules.update(ent.get("modules", []))
            except ValueError:
                pass

    modules = [
        {
            "id": "chemistry",
            "title": "Chemistry",
            "titleRu": "Химия",
            "description": "Уроки, реакции и тренажер задач.",
            "available": True,
        },
        {
            "id": "physics",
            "title": "Physics",
            "titleRu": "Физика",
            "description": "Базовый модуль задач и разборов.",
            "available": True,
        },
        {
            "id": "biology",
            "title": "Biology",
            "titleRu": "Биология",
            "description": "Стартовый preview и AI-поддержка.",
            "available": "biology_preview" in unlocked_modules,
        },
        {
            "id": "ai_mentor",
            "title": "AI Mentor",
            "titleRu": "AI Наставник",
            "description": "Контекстные объяснения и помощь по темам.",
            "available": True,
        },
    ]

    if role in {"teacher", "homeroom_teacher"}:
        modules.append(
            {
                "id": "teacher_live",
                "title": "Teacher Live",
                "titleRu": "Live-уроки учителя",
                "description": "QR-раздача задания и live-аналитика класса.",
                "available": True,
            }
        )

    return {"modules": modules, "role": role}


@router.post("/users/consents/accept", response_model=ConsentOut, tags=["users"])
async def accept_consent(payload: ConsentAcceptIn):
    allowed_roles = {"student", "learner", "teacher", "homeroom_teacher", "parent"}
    if payload.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Unsupported consent role")
    data = save_consent(
        user_id=payload.user_id,
        role=payload.role,
        version=payload.version,
        accepted_at=payload.accepted_at,
        parent_approved=payload.parent_approved,
    )
    return ConsentOut.model_validate(data)


@router.get("/users/consents", response_model=ConsentOut, tags=["users"])
async def get_consent(user_id: str = Query(..., alias="userId")):
    consent = store_get_consent(user_id)
    if not consent:
        raise HTTPException(status_code=404, detail="Consent not found")
    return ConsentOut.model_validate(consent)


@router.get("/users/entitlements", response_model=EntitlementOut, tags=["users"])
async def get_entitlements(
    user_id: str = Query(..., alias="userId"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:read_self")
    if auth_user["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    return EntitlementOut.model_validate(store_get_entitlements(user_id))


@router.get("/users/access", response_model=dict, tags=["users"])
async def get_user_access(
    user_id: str = Query(..., alias="userId"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:read_self")
    if auth_user["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    state = _read_state()
    entitlements = store_get_entitlements(user_id)
    grants = list_user_access_grants(user_id).get("items", [])
    schools = state.setdefault("schools", {})
    sites = state.setdefault("school_sites", {})
    licenses = state.setdefault("school_licenses", {})
    for grant in grants:
        school = schools.get(grant.get("schoolId"), {}) if isinstance(schools.get(grant.get("schoolId")), dict) else {}
        site = sites.get(grant.get("siteId"), {}) if isinstance(sites.get(grant.get("siteId")), dict) else {}
        license_row = licenses.get(grant.get("licenseId"), {}) if isinstance(licenses.get(grant.get("licenseId")), dict) else {}
        grant["schoolTitle"] = school.get("title")
        grant["siteTitle"] = site.get("title")
        grant["licenseTitle"] = license_row.get("title")
        grant["periodLabel"] = license_row.get("periodLabel")
    return {"userId": user_id, "items": grants, "entitlements": entitlements}


@router.post("/users/devices/sync", response_model=DeviceSyncOut, tags=["users"])
async def upload_device_sync(
    payload: DeviceSyncIn,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:sync_self")
    if auth_user["userId"] != payload.user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    snapshot = save_device_sync(
        user_id=payload.user_id,
        content_versions=payload.content_versions,
        purchases=payload.purchases,
        preferences=payload.preferences,
    )
    return DeviceSyncOut.model_validate(snapshot)


@router.get("/users/devices/sync", response_model=DeviceSyncOut, tags=["users"])
async def get_device_sync(
    user_id: str = Query(..., alias="userId"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:sync_self")
    if auth_user["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    return DeviceSyncOut.model_validate(store_get_device_sync(user_id))


@router.get("/users/devices", response_model=dict, tags=["users"])
async def get_user_devices(
    user_id: str = Query(..., alias="userId"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:read_self")
    if auth_user["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    return store_list_user_devices(user_id)


@router.post("/users/devices/register", response_model=dict, tags=["users"])
async def register_user_device(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:read_self")
    user_id = str(payload.get("userId") or auth_user["userId"])
    if auth_user["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    try:
        return store_register_user_device(
            user_id=user_id,
            role=auth_user.get("role"),
            device_id=str(payload.get("deviceId") or ""),
            label=str(payload.get("label") or payload.get("deviceName") or "").strip() or None,
            platform=str(payload.get("platform") or "").strip() or None,
            session_id=str(auth_user.get("sid") or "") or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/users/export", response_model=dict, tags=["users"])
async def export_current_user_data(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:profile_self")
    try:
        return store_export_user_data(auth_user["userId"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/users/delete", response_model=dict, tags=["users"])
async def delete_current_user_data(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:profile_self")
    confirmation = str(payload.get("confirmation") or "").strip().upper()
    if confirmation != "DELETE":
        raise HTTPException(status_code=400, detail="Для удаления аккаунта передайте confirmation=DELETE")
    try:
        return store_delete_user_data(auth_user["userId"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/users/devices/revoke", response_model=dict, tags=["users"])
async def revoke_user_device(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:read_self")
    user_id = str(payload.get("userId") or auth_user["userId"])
    if auth_user["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden for requested userId")
    try:
        return store_revoke_user_device(user_id=user_id, device_id=str(payload.get("deviceId") or ""))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/telemetry/events", response_model=dict, tags=["telemetry"])
async def ingest_telemetry(
    payload: TelemetryBatchIn,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "telemetry:write_self")
    auth_user_id = auth_user["userId"]
    normalized = []
    for event in payload.events:
        if event.user_id and event.user_id != auth_user_id:
            raise HTTPException(status_code=403, detail="Telemetry userId mismatch")
        normalized.append(
            {
                "name": event.name,
                "userId": event.user_id or auth_user_id,
                "role": event.role,
                "payload": event.payload,
            }
        )

    return store_ingest_telemetry(
        normalized
    )


@router.post("/learning/events", response_model=dict, tags=["learning"])
async def ingest_learning_events(
    payload: LearningBatchIn,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "telemetry:write_self")
    auth_user_id = auth_user["userId"]
    normalized = []
    for event in payload.events:
        if event.user_id and event.user_id != auth_user_id:
            raise HTTPException(status_code=403, detail="Learning event userId mismatch")
        normalized.append(
            {
                "eventType": event.event_type,
                "userId": event.user_id or auth_user_id,
                "role": event.role,
                "moduleId": event.module_id,
                "lessonId": event.lesson_id,
                "taskId": event.task_id,
                "outcome": event.outcome,
                "sessionId": event.session_id,
                "classroom": event.classroom,
                "mistakeTag": event.mistake_tag,
                "payload": event.payload,
            }
        )

    return store_ingest_learning_events(normalized)


@router.get("/auth/me", response_model=AuthMeOut, tags=["auth"])
async def auth_me(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    role = _require_scope(auth_user, "auth:me")
    context = _build_auth_context(auth_user["userId"], role)
    return AuthMeOut(
        userId=auth_user["userId"],
        **context,
        accessTokenExpiresAt=auth_user["accessExpiresAt"],
    )


@router.get("/users/profile", response_model=UserProfileOut, tags=["users"])
async def get_user_profile(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    role = _require_scope(auth_user, "user:profile_self")
    user_id = auth_user["userId"]
    entitlements = store_get_entitlements(user_id)
    sync = store_get_device_sync(user_id)
    state = _read_state()
    user_row = state.get("users", {}).get(user_id, {}) if isinstance(state.get("users", {}).get(user_id), dict) else {}

    preferences = sync.get("preferences", {})
    role_data = _build_role_data(role, user_id, preferences)
    context = _build_auth_context(user_id, role)

    return UserProfileOut(
        userId=user_id,
        displayName=context.get("displayName") or str(user_row.get("displayName") or "").strip() or None,
        role=context["role"],
        activeRole=context["activeRole"],
        availableRoles=context["availableRoles"],
        schoolMemberships=context["schoolMemberships"],
        classMemberships=context["classMemberships"],
        subscriptions=context["subscriptions"],
        grants=context["grants"],
        capabilities=context["capabilities"],
        featureFlags=context["featureFlags"],
        plans=entitlements.get("plans", []),
        modules=entitlements.get("modules", []),
        preferences=preferences,
        roleData=role_data,
    )


@router.post("/payments/create", response_model=PaymentCreateOut, tags=["payments"])
async def create_payment_checkout(
    payload: PaymentCreateIn,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:profile_self")
    try:
        payment = create_payment(
            user_id=auth_user["userId"],
            provider=payload.provider,
            module_id=payload.module_id,
            amount_rub=payload.amount_rub,
            return_url=payload.return_url,
            idempotency_key=payload.idempotency_key,
        )
        return PaymentCreateOut.model_validate(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/payments/{payment_id}", response_model=PaymentStatusOut, tags=["payments"])
async def get_payment_status(
    payment_id: str,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:profile_self")
    try:
        payment = get_payment(payment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    if payment.get("userId") != auth_user["userId"]:
        raise HTTPException(status_code=403, detail="Forbidden payment access")
    return PaymentStatusOut.model_validate(payment)


@router.post("/payments/{payment_id}/simulate-success", response_model=PaymentStatusOut, tags=["payments"])
async def simulate_payment_success(
    payment_id: str,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    if settings.ENV.lower() != "dev":
        raise HTTPException(status_code=403, detail="simulate-success disabled outside dev")
    _require_scope(auth_user, "payments:admin")
    try:
        payment = mark_payment_succeeded(payment_id, user_id=auth_user["userId"])
        return PaymentStatusOut.model_validate(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/payments/webhook/{provider}", response_model=PaymentStatusOut, tags=["payments"])
async def payment_webhook(provider: str, payload: PaymentWebhookIn, x_signature: str | None = Header(default=None)):
    if not x_signature:
        raise HTTPException(status_code=401, detail="Missing X-Signature header")
    try:
        payment = apply_provider_webhook(
            provider=provider,
            payment_id=payload.payment_id,
            status=payload.status,
            signature=x_signature,
            payload={
                "amountRub": payload.amount_rub,
                "moduleId": payload.module_id,
                "eventId": payload.event_id,
                **payload.payload,
            },
        )
        return PaymentStatusOut.model_validate(payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/payments/audit/log", response_model=list[dict], tags=["payments"])
async def payments_audit(
    limit: int = Query(default=100, ge=1, le=1000),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "user:profile_self")
    return list_payment_audit(limit=limit)


@router.get("/payments/audit/query", response_model=list[dict], tags=["payments"])
async def payments_audit_query(
    provider: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None, alias="dateFrom"),
    date_to: str | None = Query(default=None, alias="dateTo"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=200, ge=1, le=1000),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "payments:admin")
    return query_payment_audit(
        provider=provider,
        status=status,
        date_from=date_from,
        date_to=date_to,
        offset=offset,
        limit=limit,
    )


@router.get("/payments/audit/export.csv", response_class=Response, tags=["payments"])
async def payments_audit_export_csv(
    provider: str | None = Query(default=None),
    status: str | None = Query(default=None),
    date_from: str | None = Query(default=None, alias="dateFrom"),
    date_to: str | None = Query(default=None, alias="dateTo"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=1000, ge=1, le=5000),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "payments:admin")
    csv_text = export_payment_audit_csv(
        provider=provider,
        status=status,
        date_from=date_from,
        date_to=date_to,
        offset=offset,
        limit=limit,
    )
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=payment-audit.csv"},
    )


@router.get("/payments/admin/webhook/dead-letters", response_model=list[dict], tags=["payments"])
async def payments_dead_letters(
    limit: int = Query(default=100, ge=1, le=1000),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "payments:admin")
    return list_payment_dead_letters(limit=limit)


@router.post("/payments/admin/webhook/dead-letters/{dead_letter_id}/reprocess", response_model=PaymentStatusOut, tags=["payments"])
async def payments_dead_letter_reprocess(
    dead_letter_id: str,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "payments:admin")
    try:
        updated = reprocess_dead_letter(dead_letter_id)
        return PaymentStatusOut.model_validate(updated)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/payments/admin/webhook/cleanup", response_model=dict, tags=["payments"])
async def payments_webhook_cleanup(
    retention_sec: int = Query(default=604800, ge=3600, le=7776000),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "payments:admin")
    return cleanup_payment_webhook_storage(retention_sec=retention_sec)


@router.post("/auth/phone/request-code", response_model=PhoneCodeRequestOut, tags=["auth"])
async def auth_request_code(
    payload: PhoneCodeRequestIn,
    request: Request,
    x_internal_debug: str | None = Header(default=None, alias="X-Internal-Debug"),
):
    try:
        data = request_phone_code(payload.phone)
        client_host = (request.client.host if request.client else "") or ""
        is_local = client_host in {"127.0.0.1", "::1", "localhost", "testclient"}
        has_internal_secret = bool(x_internal_debug and x_internal_debug == settings.ADMIN_BOOTSTRAP_SECRET)
        expose_debug_code = settings.ENV.lower() == "dev" or is_local or has_internal_secret
        if "debugCode" in data and not expose_debug_code:
            data.pop("debugCode", None)
        return PhoneCodeRequestOut.model_validate(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/phone/verify", response_model=PhoneCodeVerifyOut, tags=["auth"])
async def auth_verify_code(payload: PhoneCodeVerifyIn):
    try:
        data = verify_phone_code(
            phone=payload.phone,
            code=payload.code,
            local_user_id=payload.local_user_id,
            local_purchases=payload.local_purchases,
            local_content_versions=payload.local_content_versions,
            local_preferences=payload.local_preferences,
        )
        return PhoneCodeVerifyOut.model_validate(_with_auth_context(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/login", response_model=AuthLoginOut, tags=["auth"])
async def auth_login_password(payload: AuthLoginIn):
    try:
        data = login_with_password(payload.login, payload.password)
        return AuthLoginOut.model_validate(_with_auth_context(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/invite/activate", response_model=InviteActivateOut, tags=["auth"])
async def auth_activate_invite(payload: InviteActivateIn):
    try:
        if (payload.password or payload.password_confirm) and payload.password != payload.password_confirm:
            raise ValueError("Пароли не совпадают")
        data = activate_school_invite_code(
            code=payload.code,
            phone=payload.phone,
            user_id=payload.user_id,
            display_name=payload.display_name,
            login=payload.login,
            password=payload.password,
        )
        return InviteActivateOut.model_validate(_with_auth_context(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/invite/preview", response_model=InvitePreviewOut, tags=["auth"])
async def auth_preview_invite(payload: InvitePreviewIn):
    try:
        return InvitePreviewOut.model_validate(preview_school_invite_code(payload.code))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/role/switch", response_model=AuthMeOut, tags=["auth"])
async def auth_switch_role(payload: AuthRoleSwitchIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    try:
        user_id = str(auth_user.get("userId") or "")
        context = _switch_active_role(user_id, payload.role)
        return AuthMeOut(
            userId=user_id,
            displayName=context.get("displayName"),
            role=context["role"],
            activeRole=context["activeRole"],
            availableRoles=context["availableRoles"],
            schoolMemberships=context["schoolMemberships"],
            classMemberships=context["classMemberships"],
            subscriptions=context["subscriptions"],
            grants=context["grants"],
            capabilities=context["capabilities"],
            featureFlags=context["featureFlags"],
            accessTokenExpiresAt=auth_user["accessExpiresAt"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/password-reset/by-code", response_model=AuthLoginOut, tags=["auth"])
async def auth_password_reset_by_code(payload: AuthPasswordResetByCodeIn):
    try:
        if payload.password != payload.password_confirm:
            raise ValueError("Пароли не совпадают")
        data = reset_password_by_code(payload.code, payload.login, payload.password)
        return AuthLoginOut.model_validate(_with_auth_context(data))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/change-password", response_model=dict, tags=["auth"])
async def auth_change_password(payload: AuthChangePasswordIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "user:profile_self")
    try:
        if payload.new_password != payload.new_password_confirm:
            raise ValueError("Пароли не совпадают")
        return store_change_password(auth_user["userId"], payload.current_password, payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/device-recovery/activate", response_model=dict, tags=["auth"])
async def auth_activate_device_recovery(payload: Dict[str, Any]):
    try:
        return store_activate_device_recovery_code(
            code=str(payload.get("code") or ""),
            phone=str(payload.get("phone") or ""),
            display_name=str(payload.get("displayName") or "").strip() or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/auth/refresh", response_model=AuthRefreshOut, tags=["auth"])
async def auth_refresh(payload: AuthRefreshIn):
    try:
        data = refresh_session(payload.refresh_token)
        return AuthRefreshOut.model_validate(data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e)) from e


@router.post("/auth/logout", response_model=dict, tags=["auth"])
async def auth_logout(payload: AuthLogoutIn):
    revoke_session(payload.refresh_token)
    return {"ok": True}
