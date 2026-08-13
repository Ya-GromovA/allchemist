from __future__ import annotations

import json
import logging
import os
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import psycopg
from psycopg.rows import dict_row

logger = logging.getLogger(__name__)

# Result of the most recent sync, so divergence is observable instead of silent.
_SYNC_STATUS: Dict[str, Any] = {
    "ranAt": None,
    "ok": None,
    "rowsWritten": 0,
    "rowsFailed": 0,
    "failures": [],
}


def last_sync_status() -> Dict[str, Any]:
    """Outcome of the most recent sync_school_domain_from_state call.

    `rowsFailed > 0` means the database is known to diverge from the JSON state.
    Before this existed such divergence was undetectable from inside the app.
    """
    return dict(_SYNC_STATUS)


def _dsn() -> str:
    host = os.getenv("POSTGRES_HOST", "synapse-db")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "synapse")
    user = os.getenv("POSTGRES_USER", "synapse")
    password = os.getenv("POSTGRES_PASSWORD", "synapse_password")
    return f"host={host} port={port} dbname={db} user={user} password={password}"


@contextmanager
def _conn():
    conn = psycopg.connect(_dsn(), row_factory=dict_row, connect_timeout=3)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _j(value: Any) -> str:
    return json.dumps(value if value is not None else [], ensure_ascii=False)


def _write_row(cur, conn, entity: str, key: Any, sql: str, params: Tuple) -> bool:
    """Write one row inside its own SAVEPOINT.

    Returning False instead of propagating means a single malformed row can no
    longer roll back every other row in the batch -- the specific defect that
    left the database holding 2 organizations while the state held 7.
    """
    try:
        cur.execute("SAVEPOINT row_sp")
        cur.execute(sql, params)
        cur.execute("RELEASE SAVEPOINT row_sp")
        _SYNC_STATUS["rowsWritten"] += 1
        return True
    except Exception as exc:
        try:
            cur.execute("ROLLBACK TO SAVEPOINT row_sp")
            cur.execute("RELEASE SAVEPOINT row_sp")
        except Exception:
            logger.exception(
                "pg_school_store: savepoint rollback failed for %s key=%r", entity, key
            )
        _SYNC_STATUS["rowsFailed"] += 1
        detail = {"entity": entity, "key": str(key), "error": str(exc).strip()}
        if len(_SYNC_STATUS["failures"]) < 50:
            _SYNC_STATUS["failures"].append(detail)
        logger.error(
            "pg_school_store: refusing to hide sync failure -- entity=%s key=%r error=%s",
            entity, key, str(exc).strip(),
        )
        return False


def sync_school_domain_from_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """Project the JSON state into the relational school domain.

    Row-level failures are isolated, counted and logged; they no longer abort the
    batch and no longer vanish. Infrastructure failures still raise, because then
    nothing was written at all and silence would be a lie.

    Returns the sync status dict (also available via last_sync_status()).
    """
    _SYNC_STATUS.update(
        {
            "ranAt": datetime.now(timezone.utc).isoformat(),
            "ok": None,
            "rowsWritten": 0,
            "rowsFailed": 0,
            "failures": [],
        }
    )

    try:
        with _conn() as conn:
            cur = conn.cursor()

            for row in state.get("organizations", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "organizations", row.get("organizationId"),
                    "INSERT INTO organizations (organization_id,title,created_at) VALUES (%s,%s,COALESCE(%s::timestamptz,now())) ON CONFLICT (organization_id) DO UPDATE SET title=EXCLUDED.title",
                    (row.get("organizationId"), row.get("title") or row.get("name") or "Организация", row.get("createdAt")),
                )

            for row in state.get("schools", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "schools", row.get("schoolId"),
                    "INSERT INTO schools (school_id,organization_id,title,status,created_at) VALUES (%s,%s,%s,%s,COALESCE(%s::timestamptz,now())) ON CONFLICT (school_id) DO UPDATE SET organization_id=EXCLUDED.organization_id,title=EXCLUDED.title,status=EXCLUDED.status",
                    (row.get("schoolId"), row.get("organizationId"), row.get("title") or "Школа", row.get("status") or "active", row.get("createdAt")),
                )

            for row in state.get("school_sites", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "school_sites", row.get("siteId"),
                    "INSERT INTO school_sites (site_id,school_id,title,created_at) VALUES (%s,%s,%s,COALESCE(%s::timestamptz,now())) ON CONFLICT (site_id) DO UPDATE SET school_id=EXCLUDED.school_id,title=EXCLUDED.title",
                    (row.get("siteId"), row.get("schoolId"), row.get("title") or "Площадка", row.get("createdAt")),
                )

            for row in state.get("school_licenses", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "school_licenses", row.get("licenseId"),
                    """
                    INSERT INTO school_licenses (license_id,school_id,site_id,title,status,price_rub,starts_at,expires_at,modules,features,limits,created_at)
                    VALUES (%s,%s,%s,%s,%s,%s,%s::timestamptz,%s::timestamptz,%s::jsonb,%s::jsonb,%s::jsonb,COALESCE(%s::timestamptz,now()))
                    ON CONFLICT (license_id) DO UPDATE SET school_id=EXCLUDED.school_id,site_id=EXCLUDED.site_id,title=EXCLUDED.title,status=EXCLUDED.status,price_rub=EXCLUDED.price_rub,starts_at=EXCLUDED.starts_at,expires_at=EXCLUDED.expires_at,modules=EXCLUDED.modules,features=EXCLUDED.features,limits=EXCLUDED.limits
                    """,
                    (row.get("licenseId"), row.get("schoolId"), row.get("siteId"), row.get("title") or "Лицензия", row.get("status") or "active", row.get("priceRub") or 0, row.get("startsAt"), row.get("expiresAt"), _j(row.get("modules") or []), _j(row.get("features") or []), _j(row.get("limits") or {}), row.get("createdAt")),
                )

            for row in state.get("school_classes", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "school_classes", row.get("classId"),
                    "INSERT INTO school_classes (class_id,school_id,site_id,title,subject,teacher_user_id,created_at) VALUES (%s,%s,%s,%s,%s,%s,COALESCE(%s::timestamptz,now())) ON CONFLICT (class_id) DO UPDATE SET school_id=EXCLUDED.school_id,site_id=EXCLUDED.site_id,title=EXCLUDED.title,subject=EXCLUDED.subject,teacher_user_id=EXCLUDED.teacher_user_id",
                    (row.get("classId"), row.get("schoolId"), row.get("siteId"), row.get("title") or "Класс", row.get("subject"), row.get("teacherUserId"), row.get("createdAt")),
                )

            for class_id, members in state.get("school_memberships", {}).items():
                if not isinstance(members, dict):
                    continue
                for user_id, row in members.items():
                    if not isinstance(row, dict):
                        continue
                    _write_row(
                        cur, conn, "school_memberships", (class_id, user_id),
                        "INSERT INTO school_memberships (class_id,user_id,role,school_id,site_id,joined_at) VALUES (%s,%s,%s,%s,%s,COALESCE(%s::timestamptz,now())) ON CONFLICT (class_id,user_id) DO UPDATE SET role=EXCLUDED.role,school_id=EXCLUDED.school_id,site_id=EXCLUDED.site_id,joined_at=EXCLUDED.joined_at",
                        (class_id, user_id, row.get("role") or "student", row.get("schoolId"), row.get("siteId"), row.get("joinedAt")),
                    )

            for row in state.get("school_invite_codes", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "school_invite_codes", row.get("code"),
                    """
                    INSERT INTO school_invite_codes (code,school_id,site_id,class_id,role,title,subject,teacher_user_id,student_label,status,max_activations,activations,expires_at,activated_at,activated_by_user_id,created_at,created_by)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::timestamptz,%s::timestamptz,%s,COALESCE(%s::timestamptz,now()),%s)
                    ON CONFLICT (code) DO UPDATE SET school_id=EXCLUDED.school_id,site_id=EXCLUDED.site_id,class_id=EXCLUDED.class_id,role=EXCLUDED.role,title=EXCLUDED.title,subject=EXCLUDED.subject,teacher_user_id=EXCLUDED.teacher_user_id,student_label=EXCLUDED.student_label,status=EXCLUDED.status,max_activations=EXCLUDED.max_activations,activations=EXCLUDED.activations,expires_at=EXCLUDED.expires_at,activated_at=EXCLUDED.activated_at,activated_by_user_id=EXCLUDED.activated_by_user_id
                    """,
                    (row.get("code"), row.get("schoolId"), row.get("siteId"), row.get("classId"), row.get("role") or "student", row.get("title"), row.get("subject"), row.get("teacherUserId"), row.get("studentLabel"), row.get("status") or "pending", row.get("maxActivations") or 1, row.get("activations") or 0, row.get("expiresAt"), row.get("activatedAt"), row.get("activatedByUserId"), row.get("createdAt"), row.get("createdBy")),
                )

            for user_id, rows in state.get("access_grants", {}).items():
                if not isinstance(rows, list):
                    continue
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    _write_row(
                        cur, conn, "access_grants", row.get("grantId"),
                        """
                        INSERT INTO access_grants (grant_id,user_id,source_type,title,status,organization_id,school_id,site_id,license_id,price_rub,plan,module_id,feature,plans,modules,features,starts_at,expires_at,created_at)
                        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s::timestamptz,%s::timestamptz,COALESCE(%s::timestamptz,now()))
                        ON CONFLICT (grant_id) DO UPDATE SET status=EXCLUDED.status,title=EXCLUDED.title,price_rub=EXCLUDED.price_rub,plans=EXCLUDED.plans,modules=EXCLUDED.modules,features=EXCLUDED.features,expires_at=EXCLUDED.expires_at
                        """,
                        (row.get("grantId"), user_id, row.get("sourceType") or "manual", row.get("title"), row.get("status") or "active", row.get("organizationId"), row.get("schoolId"), row.get("siteId"), row.get("licenseId"), row.get("priceRub"), row.get("plan"), row.get("moduleId"), row.get("feature"), _j(row.get("plans") or []), _j(row.get("modules") or []), _j(row.get("features") or []), row.get("startsAt"), row.get("expiresAt"), row.get("createdAt")),
                    )

            for user_id, devices in state.get("device_registry", {}).items():
                if not isinstance(devices, dict):
                    continue
                for device_id, row in devices.items():
                    if not isinstance(row, dict):
                        continue
                    _write_row(
                        cur, conn, "device_registry", (user_id, device_id),
                        "INSERT INTO device_registry (user_id,device_id,label,platform,active,trusted_at,last_seen_at,revoked_at) VALUES (%s,%s,%s,%s,%s,%s::timestamptz,%s::timestamptz,%s::timestamptz) ON CONFLICT (user_id,device_id) DO UPDATE SET label=EXCLUDED.label,platform=EXCLUDED.platform,active=EXCLUDED.active,trusted_at=EXCLUDED.trusted_at,last_seen_at=EXCLUDED.last_seen_at,revoked_at=EXCLUDED.revoked_at",
                        (user_id, device_id, row.get("label"), row.get("platform"), row.get("active", True), row.get("trustedAt"), row.get("lastSeenAt"), row.get("revokedAt")),
                    )

            for row in state.get("device_recovery_codes", {}).values():
                if not isinstance(row, dict):
                    continue
                _write_row(
                    cur, conn, "device_recovery_codes", row.get("code"),
                    "INSERT INTO device_recovery_codes (code,user_id,school_id,class_id,status,created_at,expires_at,used_at,created_by) VALUES (%s,%s,%s,%s,%s,COALESCE(%s::timestamptz,now()),%s::timestamptz,%s::timestamptz,%s) ON CONFLICT (code) DO UPDATE SET status=EXCLUDED.status,expires_at=EXCLUDED.expires_at,used_at=EXCLUDED.used_at",
                    (row.get("code"), row.get("userId"), row.get("schoolId"), row.get("classId"), row.get("status") or "pending", row.get("createdAt"), row.get("expiresAt"), row.get("usedAt"), row.get("createdBy")),
                )

    except Exception as exc:
        # Infrastructure failure: the database was unreachable or the commit
        # failed, so NOTHING was written.
        #
        # This is NOT swallowed. The original defect was not the absence of a
        # raise -- it was that a bare except-return discarded the error
        # without a trace, so a database diverging from the JSON state was
        # undetectable from inside the application. Here the full traceback is
        # logged at ERROR and the failure is recorded in last_sync_status(),
        # which is what makes divergence observable.
        #
        # It deliberately does not propagate: this function projects state that
        # has ALREADY been committed to JSON, and it is called at 18 live
        # request paths. Propagating would turn a projection problem into an
        # HTTP 500 for an operation that already succeeded, reporting the fault
        # in the wrong place and losing the real signal in a stack trace.
        _SYNC_STATUS["ok"] = False
        _SYNC_STATUS["failures"].append(
            {"entity": "connection", "key": "-", "error": str(exc).strip()}
        )
        logger.exception(
            "pg_school_store: school domain sync could not reach the database; "
            "relational school domain now DIVERGES from JSON state (%s)",
            str(exc).strip(),
        )
        return dict(_SYNC_STATUS)

    _SYNC_STATUS["ok"] = _SYNC_STATUS["rowsFailed"] == 0

    if _SYNC_STATUS["rowsFailed"]:
        logger.error(
            "pg_school_store: sync completed with divergence -- %d row(s) written, "
            "%d row(s) FAILED; database does not match JSON state",
            _SYNC_STATUS["rowsWritten"], _SYNC_STATUS["rowsFailed"],
        )
    else:
        logger.info(
            "pg_school_store: sync ok -- %d row(s) written", _SYNC_STATUS["rowsWritten"]
        )

    return dict(_SYNC_STATUS)


def list_school_classes_pg(school_id: str | None = None) -> List[Dict[str, Any]]:
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.class_id AS "classId", c.school_id AS "schoolId", c.site_id AS "siteId", c.title, c.subject, c.teacher_user_id AS "teacherUserId", c.created_at AS "createdAt",
            COUNT(*) FILTER (WHERE m.role IN ('student','learner')) AS "studentCount",
            COUNT(*) FILTER (WHERE m.role IN ('teacher','homeroom_teacher')) AS "teacherCount"
            FROM school_classes c LEFT JOIN school_memberships m ON m.class_id = c.class_id
            WHERE (%s IS NULL OR c.school_id = %s)
            GROUP BY c.class_id ORDER BY c.title
            """,
            (school_id, school_id),
        )
        return list(cur.fetchall())


def list_school_invites_pg(school_id: str | None = None, role: str | None = None) -> List[Dict[str, Any]]:
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT code, school_id AS "schoolId", site_id AS "siteId", class_id AS "classId", role, title, subject, teacher_user_id AS "teacherUserId", student_label AS "studentLabel", status, max_activations AS "maxActivations", activations, expires_at AS "expiresAt", created_at AS "createdAt", created_by AS "createdBy", activated_at AS "activatedAt", activated_by_user_id AS "activatedByUserId"
            FROM school_invite_codes WHERE (%s IS NULL OR school_id = %s) AND (%s IS NULL OR role = %s) ORDER BY created_at DESC
            """,
            (school_id, school_id, role, role),
        )
        return list(cur.fetchall())


def list_access_grants_pg(user_id: str) -> List[Dict[str, Any]]:
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM access_grants WHERE user_id=%s AND status='active' AND (expires_at IS NULL OR expires_at > now()) ORDER BY COALESCE(expires_at, '2999-01-01'::timestamptz)",
            (user_id,),
        )
        return list(cur.fetchall())


def list_user_devices_pg(user_id: str) -> List[Dict[str, Any]]:
    with _conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT device_id AS \"deviceId\", label, platform, active, trusted_at AS \"trustedAt\", last_seen_at AS \"lastSeenAt\", revoked_at AS \"revokedAt\" FROM device_registry WHERE user_id=%s ORDER BY COALESCE(last_seen_at, trusted_at) DESC NULLS LAST",
            (user_id,),
        )
        return list(cur.fetchall())
