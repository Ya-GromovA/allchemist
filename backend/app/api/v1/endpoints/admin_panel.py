from typing import Any, Dict

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response

from app.schemas.content import (
    AdminBulkSubscriptionIn,
    AdminAccessGrantIn,
    AdminBootstrapOwnerIn,
    AdminInviteCodeIn,
    AdminPasswordResetCodeIn,
    AdminSchoolCreateIn,
    AdminSchoolClassIn,
    AdminCreateUserIn,
    AdminRoleSetIn,
    AdminScopeOverrideIn,
    AdminSubscriptionGrantIn,
    AdminSubscriptionRevokeIn,
)
from app.security.policies import can, normalize_role
from app.services.admin_panel_service import (
    admin_form_options,
    admin_password_login,
    bulk_update_subscriptions,
    bootstrap_owner,
    create_user_manual,
    content_ingestion_status,
    database_overview,
    export_admin_audit_csv,
    export_security_audit_csv,
    export_handover_archive_csv,
    grant_subscription,
    acknowledge_security_alert,
    list_admin_audit_filtered,
    list_scope_overrides,
    list_users,
    mobile_readiness_summary,
    production_go_no_go_summary,
    revoke_subscription,
    run_backup_restore_dry_run,
    security_actions,
    security_checklist,
    list_security_alerts,
    list_security_alerts_filtered,
    get_backup_dry_run_history,
    get_backup_dry_run_status,
    get_go_no_go_history,
    list_handover_archive,
    list_legal_compliance_history,
    legal_compliance_status_summary,
    set_legal_compliance_item_status,
    archive_handover_report,
    create_access_grant,
    create_school,
    create_school_class,
    create_school_invite_code,
    list_school_classes,
    list_school_invites,
    list_schools_overview,
    list_user_access_grants,
    rights_matrix,
    security_export_bundle,
    set_scope_override,
    set_mobile_onboarding_smoke_result,
    set_user_role,
    subscriptions_kpi,
)
from app.core.config import settings
from app.services.user_state_store import resolve_access_token, list_user_devices as store_list_user_devices, reset_user_devices as store_reset_user_devices
from app.services.user_state_store import create_password_reset_code as store_create_password_reset_code

router = APIRouter()


@router.post("/admin/bootstrap-owner", response_model=dict, tags=["admin"])
async def admin_bootstrap_owner(payload: AdminBootstrapOwnerIn):
    if not settings.ADMIN_BOOTSTRAP_SECRET:
        raise HTTPException(status_code=403, detail="Admin bootstrap is disabled")
    if payload.secret != settings.ADMIN_BOOTSTRAP_SECRET:
        raise HTTPException(status_code=403, detail="Invalid bootstrap secret")
    return bootstrap_owner(payload.user_id)


@router.post("/admin/auth/login-password", response_model=dict, tags=["admin"])
async def admin_auth_login_password(payload: Dict[str, Any]):
    try:
        return admin_password_login(
            login=str(payload.get("login") or ""),
            password=str(payload.get("password") or ""),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


def _require_auth_user(authorization: str | None = Header(default=None)) -> Dict[str, Any]:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header is required")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token is required")
    token = authorization[len("Bearer ") :].strip()
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


def _require_system_admin(auth_user: Dict[str, Any]) -> str:
    role = _require_scope(auth_user, "admin:panel")
    if role not in {"admin", "owner"}:
        raise HTTPException(status_code=403, detail="System admin role is required")
    return role


@router.get("/admin/users", response_model=list[dict], tags=["admin"])
async def admin_users(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    query: str | None = Query(default=None),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:panel")
    return list_users(limit=limit, offset=offset, query=query)


@router.get("/admin/options", response_model=dict, tags=["admin"])
async def admin_options(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:panel")
    return admin_form_options()


@router.get("/admin/schools/overview", response_model=dict, tags=["admin"])
async def admin_schools_overview(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:panel")
    return list_schools_overview()


@router.post("/admin/schools", response_model=dict, tags=["admin"])
async def admin_create_school(payload: AdminSchoolCreateIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_system_admin(auth_user)
    try:
        return create_school(
            title=payload.title,
            organization_title=payload.organization_title,
            site_title=payload.site_title,
            status=payload.status,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/users/{user_id}/access", response_model=dict, tags=["admin"])
async def admin_user_access(user_id: str, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    return list_user_access_grants(user_id)


@router.post("/admin/access/grant", response_model=dict, tags=["admin"])
async def admin_access_grant(payload: AdminAccessGrantIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    try:
        return create_access_grant(
            user_id=payload.user_id,
            source_type=payload.source_type,
            title=payload.title,
            plan=payload.plan,
            module_id=payload.module_id,
            feature=payload.feature,
            organization_id=payload.organization_id,
            school_id=payload.school_id,
            site_id=payload.site_id,
            license_id=payload.license_id,
            expires_at=payload.expires_at,
            price_rub=payload.price_rub,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/schools/classes", response_model=dict, tags=["admin"])
async def admin_school_classes(
    school_id: str | None = Query(default=None, alias="schoolId"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:panel")
    return list_school_classes(school_id)


@router.post("/admin/schools/classes", response_model=dict, tags=["admin"])
async def admin_create_school_class(payload: AdminSchoolClassIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:panel")
    try:
        return create_school_class(
            class_id=payload.class_id,
            school_id=payload.school_id,
            site_id=payload.site_id,
            title=payload.title,
            subject=payload.subject,
            teacher_user_id=payload.teacher_user_id,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/schools/invites", response_model=dict, tags=["admin"])
async def admin_school_invites(
    school_id: str | None = Query(default=None, alias="schoolId"),
    role: str | None = Query(default=None),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:subscriptions")
    return list_school_invites(school_id=school_id, role=role)


@router.post("/admin/schools/invites", response_model=dict, tags=["admin"])
async def admin_create_school_invite(payload: AdminInviteCodeIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    try:
        return create_school_invite_code(
            class_id=payload.class_id,
            school_id=payload.school_id,
            site_id=payload.site_id,
            role=payload.role,
            title=payload.title,
            subject=payload.subject,
            expires_at=payload.expires_at,
            max_activations=payload.max_activations,
            teacher_user_id=payload.teacher_user_id,
            student_label=payload.student_label,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/admin/users/create", response_model=dict, tags=["admin"])
async def admin_create_user(payload: AdminCreateUserIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:panel")
    requested_role = normalize_role(payload.role)
    if requested_role == "owner" and normalize_role(auth_user.get("role")) != "owner":
        raise HTTPException(status_code=403, detail="Only owner can create owner role")
    try:
        return create_user_manual(
            user_id=payload.user_id,
            phone=payload.phone,
            role=payload.role,
            plan=payload.plan,
            module_id=payload.module_id,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/admin/users/{user_id}/password-reset-code", response_model=dict, tags=["admin"])
async def admin_create_password_reset_code(user_id: str, payload: AdminPasswordResetCodeIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    try:
        return store_create_password_reset_code(user_id=user_id, changed_by=auth_user["userId"], ttl_hours=payload.ttl_hours)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/admin/users/role", response_model=dict, tags=["admin"])
async def admin_set_role(payload: AdminRoleSetIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:roles")
    if payload.role == "owner" and normalize_role(auth_user.get("role")) != "owner":
        raise HTTPException(status_code=403, detail="Only owner can assign owner role")
    return set_user_role(payload.user_id, payload.role, changed_by=auth_user["userId"])


@router.post("/admin/users/{user_id}/devices/reset", response_model=dict, tags=["admin"])
async def admin_reset_user_devices(
    user_id: str,
    payload: Dict[str, Any],
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:subscriptions")
    return store_reset_user_devices(
        user_id=user_id,
        changed_by=auth_user["userId"],
        school_id=str(payload.get("schoolId") or "").strip() or None,
        class_id=str(payload.get("classId") or "").strip() or None,
    )


@router.get("/admin/users/{user_id}/devices", response_model=dict, tags=["admin"])
async def admin_user_devices(
    user_id: str,
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:subscriptions")
    return store_list_user_devices(user_id)


@router.get("/admin/rights/scopes", response_model=dict, tags=["admin"])
async def admin_get_scope_overrides(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return {"overrides": list_scope_overrides()}


@router.post("/admin/rights/scopes", response_model=dict, tags=["admin"])
async def admin_set_scope_override(payload: AdminScopeOverrideIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_system_admin(auth_user)
    return set_scope_override(payload.role, payload.scope, payload.allow, changed_by=auth_user["userId"])


@router.get("/admin/rights/matrix", response_model=dict, tags=["admin"])
async def admin_rights_matrix(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return rights_matrix()


@router.post("/admin/subscriptions/grant", response_model=dict, tags=["admin"])
async def admin_grant_subscription(payload: AdminSubscriptionGrantIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    return grant_subscription(
        user_id=payload.user_id,
        plan=payload.plan,
        module_id=payload.module_id,
        changed_by=auth_user["userId"],
    )


@router.post("/admin/subscriptions/revoke", response_model=dict, tags=["admin"])
async def admin_revoke_subscription(payload: AdminSubscriptionRevokeIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    return revoke_subscription(
        user_id=payload.user_id,
        plan=payload.plan,
        module_id=payload.module_id,
        changed_by=auth_user["userId"],
    )


@router.post("/admin/subscriptions/bulk", response_model=dict, tags=["admin"])
async def admin_bulk_subscriptions(payload: AdminBulkSubscriptionIn, auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    try:
        return bulk_update_subscriptions(
            action=payload.action,
            query=payload.query,
            role=payload.role,
            plan=payload.plan,
            module_id=payload.module_id,
            changed_by=auth_user["userId"],
            dry_run=payload.dry_run,
            limit=payload.limit,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/subscriptions/kpi", response_model=dict, tags=["admin"])
async def admin_subscriptions_kpi(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:subscriptions")
    return subscriptions_kpi()


@router.get("/admin/security/checklist", response_model=dict, tags=["admin"])
async def admin_security_checklist(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return security_checklist()


@router.get("/admin/security/actions", response_model=dict, tags=["admin"])
async def admin_security_actions(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return security_actions()


@router.get("/admin/security/alerts", response_model=dict, tags=["admin"])
async def admin_security_alerts(
    acked: str = Query(default="all"),
    severity: str = Query(default="all"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    try:
        return list_security_alerts_filtered(acked=acked, severity=severity)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.post("/admin/security/alerts/ack", response_model=dict, tags=["admin"])
async def admin_security_alerts_ack(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    try:
        return acknowledge_security_alert(
            code=str(payload.get("code") or ""),
            acknowledged=bool(payload.get("acknowledged", True)),
            comment=str(payload.get("comment") or "").strip() or None,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/security/mobile-readiness", response_model=dict, tags=["admin"])
async def admin_security_mobile_readiness(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return mobile_readiness_summary()


@router.post("/admin/security/mobile-onboarding/smoke", response_model=dict, tags=["admin"])
async def admin_security_mobile_onboarding_smoke(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    try:
        return set_mobile_onboarding_smoke_result(
            status=str(payload.get("status") or ""),
            notes=str(payload.get("notes") or "").strip() or None,
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/security/content-ingestion", response_model=dict, tags=["admin"])
async def admin_security_content_ingestion(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return content_ingestion_status()


@router.get("/admin/legal/compliance-status", response_model=dict, tags=["admin"])
async def admin_legal_compliance_status(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return legal_compliance_status_summary()


@router.post("/admin/legal/compliance-status", response_model=dict, tags=["admin"])
async def admin_legal_compliance_status_set(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    try:
        return set_legal_compliance_item_status(
            title=str(payload.get("title") or ""),
            status=str(payload.get("status") or ""),
            changed_by=auth_user["userId"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/legal/compliance-history", response_model=dict, tags=["admin"])
async def admin_legal_compliance_history(
    limit: int = Query(default=30, ge=1, le=200),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    return list_legal_compliance_history(limit=limit)


@router.get("/admin/security/go-no-go", response_model=dict, tags=["admin"])
async def admin_security_go_no_go(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return production_go_no_go_summary()




@router.get("/admin/security/go-no-go/history", response_model=dict, tags=["admin"])
async def admin_security_go_no_go_history(
    limit: int = Query(default=20, ge=1, le=100),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    return get_go_no_go_history(limit=limit)


@router.get("/admin/security/handover/archive", response_model=dict, tags=["admin"])
async def admin_security_handover_archive(
    limit: int = Query(default=20, ge=1, le=100),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    return list_handover_archive(limit=limit)


@router.post("/admin/security/handover/archive", response_model=dict, tags=["admin"])
async def admin_security_handover_archive_save(payload: Dict[str, Any], auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    try:
        return archive_handover_report(payload, changed_by=auth_user["userId"])
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

@router.get("/admin/security/handover/archive.csv", tags=["admin"])
async def admin_security_handover_archive_csv(
    limit: int = Query(default=1000, ge=1, le=5000),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    csv_text = export_handover_archive_csv(limit=limit)
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=handover-archive.csv"},
    )


@router.get("/admin/security/backup-dry-run", response_model=dict, tags=["admin"])
async def admin_security_backup_dry_run_status(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return get_backup_dry_run_status()


@router.post("/admin/security/backup-dry-run/run", response_model=dict, tags=["admin"])
async def admin_security_backup_dry_run_run(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:rights")
    return run_backup_restore_dry_run()


@router.get("/admin/security/backup-dry-run/history", response_model=dict, tags=["admin"])
async def admin_security_backup_dry_run_history(
    limit: int = Query(default=10, ge=1, le=50),
    from_date: str | None = Query(default=None, alias="fromDate"),
    to_date: str | None = Query(default=None, alias="toDate"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    try:
        return get_backup_dry_run_history(limit=limit, from_date=from_date, to_date=to_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/security/export.json", response_model=dict, tags=["admin"])
async def admin_security_export_json(
    limit: int = Query(default=50, ge=1, le=50),
    mode: str = Query(default="all"),
    from_date: str | None = Query(default=None, alias="fromDate"),
    to_date: str | None = Query(default=None, alias="toDate"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    mode_normalized = mode.strip().lower()
    if mode_normalized not in {"all", "alerts", "failures"}:
        raise HTTPException(status_code=400, detail="Unsupported mode. Use all|alerts|failures")
    try:
        return security_export_bundle(
            limit=limit,
            mode=mode_normalized,
            from_date=from_date,
            to_date=to_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/admin/security/export.csv", tags=["admin"])
async def admin_security_export_csv(
    limit: int = Query(default=50, ge=1, le=50),
    mode: str = Query(default="all"),
    from_date: str | None = Query(default=None, alias="fromDate"),
    to_date: str | None = Query(default=None, alias="toDate"),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:rights")
    mode_normalized = mode.strip().lower()
    if mode_normalized not in {"all", "alerts", "failures"}:
        raise HTTPException(status_code=400, detail="Unsupported mode. Use all|alerts|failures")
    try:
        csv_text = export_security_audit_csv(
            limit=limit,
            mode=mode_normalized,
            from_date=from_date,
            to_date=to_date,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=admin-security-audit.csv"},
    )


@router.get("/admin/audit", response_model=list[dict], tags=["admin"])
async def admin_audit(
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    actor_user_id: str | None = Query(default=None, alias="actorUserId"),
    target_user_id: str | None = Query(default=None, alias="targetUserId"),
    action: str | None = Query(default=None),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:panel")
    return list_admin_audit_filtered(
        limit=limit,
        offset=offset,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
    )


@router.get("/admin/audit/export.csv", tags=["admin"])
async def admin_audit_export_csv(
    limit: int = Query(default=1000, ge=1, le=5000),
    actor_user_id: str | None = Query(default=None, alias="actorUserId"),
    target_user_id: str | None = Query(default=None, alias="targetUserId"),
    action: str | None = Query(default=None),
    auth_user: Dict[str, Any] = Depends(_require_auth_user),
):
    _require_scope(auth_user, "admin:panel")
    csv_text = export_admin_audit_csv(
        limit=limit,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        action=action,
    )
    return Response(
        content=csv_text,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=admin-audit.csv"},
    )


@router.get("/admin/database/overview", response_model=dict, tags=["admin"])
async def admin_database_overview(auth_user: Dict[str, Any] = Depends(_require_auth_user)):
    _require_scope(auth_user, "admin:panel")
    return database_overview()
