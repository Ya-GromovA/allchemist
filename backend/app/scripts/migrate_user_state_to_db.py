"""Move identity state out of ``backend/data/user_state.json`` and into the database.

Run it as::

    python -m app.scripts.migrate_user_state_to_db --dry-run
    python -m app.scripts.migrate_user_state_to_db --apply

Guarantees
----------
*Idempotent.* Every write is an upsert on a deterministic natural key, or an
existence check for the tables whose primary key is a generated UUID. Running
the script twice changes nothing the second time; running it after new data has
arrived picks up only what is new.

*Nothing is lost quietly.* Every collection in the JSON file is either mapped to
a table or listed, by name and by record count, under ``NOT MIGRATED`` with the
reason. Every individual record that cannot be mapped -- a consent for a user
that does not exist, a membership in a class that does not exist -- is printed
with its key and its reason. The exit code is non-zero if anything was
unresolved, so a partial migration cannot pass for a successful one.

*Transactional.* The whole import runs in one transaction. Either the database
ends up consistent, or it is untouched.

*Non-destructive.* The JSON file is only ever read. After the switch-over it
stays on disk as the rollback source; see ``docs/ops/identity-migration-*``.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import SessionLocal

STATE_PATH = Path(__file__).resolve().parents[2] / "data" / "user_state.json"

# Collections that hold no identity data and are deliberately left where they
# are in this revision. Listed explicitly so that "not migrated" is a decision
# on the record, not an oversight.
NOT_MIGRATED_REASONS: dict[str, str] = {
    "payments": (
        "платежи и их идемпотентность переносятся вместе со схемой биллинга; "
        "в ревизии 0002 таблиц платежей нет"
    ),
    "payment_idempotency": "часть биллинга, переносится вместе с payments",
    "payment_webhook_events": "часть биллинга, переносится вместе с payments",
    "payment_webhook_dead_letters": "часть биллинга, переносится вместе с payments",
    "teacher_live": "live-уроки — отдельный контекст, схемы live-сессий пока нет",
    "admin_demo_dashboard": "конфигурация демо-витрины админки, а не данные пользователей",
    "telemetry": "поток событий, переносится вместе со схемой аналитики",
    "learning_events": "поток событий, переносится вместе со схемой аналитики",
    "session_revocations": "журнал отзывов покрыт полями user_sessions.revoked_*",
    "scope_overrides": "точечные переопределения прав заменены таблицей role_permissions",
    "password_reset_codes": "коды сброса живут минуты; переносить истёкшие бессмысленно",
}

PHONE_RE = re.compile(r"^\+?\d{6,20}$")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_ts(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _norm_login(value: str) -> str:
    return str(value or "").strip().lower()


def _norm_phone(value: str) -> str:
    raw = str(value or "").strip()
    plus = raw.startswith("+")
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    return f"+{digits}" if plus else digits


def _password_algorithm(password_hash: str) -> Optional[str]:
    value = str(password_hash or "")
    if value.startswith("$argon2id$"):
        return "argon2id"
    if value.startswith("$2"):
        return "bcrypt"
    if value.startswith("pbkdf2_sha256$"):
        return "pbkdf2_sha256"
    return None


def _fingerprint(*parts: Any) -> str:
    payload = "\x1f".join("" if part is None else str(part) for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


@dataclass
class Report:
    """Everything the operator has to see before trusting the result."""

    source_counts: dict[str, int] = field(default_factory=dict)
    written: Counter = field(default_factory=Counter)
    skipped: list[tuple[str, str, str]] = field(default_factory=list)
    dropped_references: list[tuple[str, str, str]] = field(default_factory=list)
    reconstructed: list[tuple[str, str, str]] = field(default_factory=list)
    before: dict[str, int] = field(default_factory=dict)
    after: dict[str, int] = field(default_factory=dict)

    def skip(self, collection: str, key: str, reason: str) -> None:
        """A whole record that could not be written. Blocks ``--apply``."""
        self.skipped.append((collection, key, reason))

    def drop_reference(self, collection: str, key: str, reason: str) -> None:
        """A dangling pointer removed from a record that was otherwise written.

        Not the same as losing the record, so it does not block the migration --
        but it is a data-quality finding and is reported as one.
        """
        self.dropped_references.append((collection, key, reason))

    def rebuild(self, collection: str, key: str, reason: str) -> None:
        """A record that had to be reconstructed from another record.

        Separate from ``skip`` on purpose: nothing was lost, but a human has to
        see that the database now contains a row the JSON file never held.
        """
        self.reconstructed.append((collection, key, reason))

    @property
    def ok(self) -> bool:
        return not self.skipped

    def render(self) -> str:
        lines: list[str] = []
        lines.append("=" * 78)
        lines.append("ПЕРЕНОС user_state.json -> PostgreSQL")
        lines.append("=" * 78)

        lines.append("")
        lines.append("-- ИСТОЧНИК (записей в JSON) " + "-" * 48)
        for name in sorted(self.source_counts):
            lines.append(f"   {name:<32} {self.source_counts[name]:>6}")

        lines.append("")
        lines.append("-- ЗАПИСАНО В БД " + "-" * 60)
        for name in sorted(self.written):
            lines.append(f"   {name:<32} {self.written[name]:>6}")

        lines.append("")
        lines.append("-- СЧЁТЧИКИ ТАБЛИЦ (до -> после) " + "-" * 44)
        for name in sorted(self.after):
            before = self.before.get(name, 0)
            after = self.after[name]
            mark = "" if after >= before else "   <-- УМЕНЬШИЛОСЬ"
            lines.append(f"   {name:<32} {before:>6} -> {after:>6}{mark}")

        lines.append("")
        lines.append("-- НЕ ПЕРЕНОСИТСЯ В ЭТОЙ РЕВИЗИИ " + "-" * 44)
        for name, reason in sorted(NOT_MIGRATED_REASONS.items()):
            count = self.source_counts.get(name, 0)
            lines.append(f"   {name:<32} {count:>6}  {reason}")

        lines.append("")
        if self.dropped_references:
            lines.append(f"-- УБРАНЫ ВИСЯЧИЕ ССЫЛКИ: {len(self.dropped_references)} " + "-" * 32)
            for collection, key, reason in self.dropped_references:
                lines.append(f"   [{collection}] {key}: {reason}")
        else:
            lines.append("-- УБРАНЫ ВИСЯЧИЕ ССЫЛКИ: ничего " + "-" * 42)

        lines.append("")
        if self.reconstructed:
            lines.append(f"-- ВОССТАНОВЛЕНО ПО ССЫЛКАМ: {len(self.reconstructed)} " + "-" * 30)
            for collection, key, reason in self.reconstructed:
                lines.append(f"   [{collection}] {key}: {reason}")
        else:
            lines.append("-- ВОССТАНОВЛЕНО ПО ССЫЛКАМ: ничего " + "-" * 40)

        lines.append("")
        if self.skipped:
            lines.append(f"-- НЕ СОПОСТАВЛЕНО: {len(self.skipped)} " + "-" * 40)
            for collection, key, reason in self.skipped:
                lines.append(f"   [{collection}] {key}: {reason}")
        else:
            lines.append("-- НЕ СОПОСТАВЛЕНО: ничего " + "-" * 48)

        lines.append("")
        lines.append("ИТОГ: " + ("все записи сопоставлены" if self.ok else "есть несопоставленные записи"))
        return "\n".join(lines)


COUNTED_TABLES = (
    "users",
    "user_identifiers",
    "user_credentials",
    "role_assignments",
    "user_sessions",
    "refresh_tokens",
    "consents",
    "user_entitlements",
    "user_entitlement_items",
    "user_app_state",
    "otp_challenges",
    "auth_attempt_events",
    "auth_lockouts",
    "audit_log",
    "organizations",
    "schools",
    "school_sites",
    "school_classes",
    "school_licenses",
    "school_invite_codes",
    "school_memberships",
    "access_grants",
    "device_registry",
    "device_recovery_codes",
)


def _table_counts(session: Session) -> dict[str, int]:
    counts: dict[str, int] = {}
    for table in COUNTED_TABLES:
        counts[table] = session.execute(text(f"SELECT count(*) FROM public.{table}")).scalar_one()
    return counts


# --------------------------------------------------------------------------- #
# Individual steps. Each takes the loaded state and writes one bounded slice.
# --------------------------------------------------------------------------- #


def _migrate_tenancy(session: Session, state: dict[str, Any], report: Report) -> None:
    """Organizations, schools, sites, classes, licences, invitation codes.

    These tables already exist and are partially populated: a previous
    best-effort sync wrote some of them and swallowed every error. Here the
    write is an explicit upsert inside the migration transaction, so a failure
    is a failure and not a silently missing row.
    """
    for row in state.get("organizations", {}).values():
        if not isinstance(row, dict) or not row.get("organizationId"):
            continue
        session.execute(
            text(
                """
                INSERT INTO organizations (organization_id, title, created_at)
                VALUES (:organization_id, :title, COALESCE(:created_at, now()))
                ON CONFLICT (organization_id) DO UPDATE SET title = EXCLUDED.title
                """
            ),
            {
                "organization_id": row["organizationId"],
                "title": row.get("title") or "Организация",
                "created_at": _parse_ts(row.get("createdAt")),
            },
        )
        report.written["organizations"] += 1

    for row in state.get("schools", {}).values():
        if not isinstance(row, dict) or not row.get("schoolId"):
            continue
        session.execute(
            text(
                """
                INSERT INTO schools (school_id, organization_id, title, status, created_at)
                VALUES (:school_id, :organization_id, :title, :status, COALESCE(:created_at, now()))
                ON CONFLICT (school_id) DO UPDATE
                    SET organization_id = EXCLUDED.organization_id,
                        title = EXCLUDED.title,
                        status = EXCLUDED.status
                """
            ),
            {
                "school_id": row["schoolId"],
                "organization_id": row.get("organizationId"),
                "title": row.get("title") or "Школа",
                "status": row.get("status") or "active",
                "created_at": _parse_ts(row.get("createdAt")),
            },
        )
        report.written["schools"] += 1

    for row in state.get("school_sites", {}).values():
        if not isinstance(row, dict) or not row.get("siteId"):
            continue
        session.execute(
            text(
                """
                INSERT INTO school_sites (site_id, school_id, title, created_at)
                VALUES (:site_id, :school_id, :title, COALESCE(:created_at, now()))
                ON CONFLICT (site_id) DO UPDATE
                    SET school_id = EXCLUDED.school_id, title = EXCLUDED.title
                """
            ),
            {
                "site_id": row["siteId"],
                "school_id": row.get("schoolId"),
                "title": row.get("title") or "Площадка",
                "created_at": _parse_ts(row.get("createdAt")),
            },
        )
        report.written["school_sites"] += 1

    for row in state.get("school_classes", {}).values():
        if not isinstance(row, dict) or not row.get("classId"):
            continue
        session.execute(
            text(
                """
                INSERT INTO school_classes
                    (class_id, school_id, site_id, title, subject, teacher_user_id, created_at)
                VALUES
                    (:class_id, :school_id, :site_id, :title, :subject, :teacher_user_id,
                     COALESCE(:created_at, now()))
                ON CONFLICT (class_id) DO UPDATE
                    SET school_id = EXCLUDED.school_id,
                        site_id = EXCLUDED.site_id,
                        title = EXCLUDED.title,
                        subject = EXCLUDED.subject,
                        teacher_user_id = EXCLUDED.teacher_user_id
                """
            ),
            {
                "class_id": row["classId"],
                "school_id": row.get("schoolId"),
                "site_id": row.get("siteId"),
                "title": row.get("title") or "Класс",
                "subject": row.get("subject"),
                "teacher_user_id": row.get("teacherUserId"),
                "created_at": _parse_ts(row.get("createdAt")),
            },
        )
        report.written["school_classes"] += 1

    _reconstruct_dangling_classes(session, state, report)

    for row in state.get("school_licenses", {}).values():
        if not isinstance(row, dict) or not row.get("licenseId"):
            continue
        session.execute(
            text(
                """
                INSERT INTO school_licenses
                    (license_id, school_id, site_id, title, status, price_rub,
                     starts_at, expires_at, modules, features, limits, created_at)
                VALUES
                    (:license_id, :school_id, :site_id, :title, :status, :price_rub,
                     :starts_at, :expires_at, CAST(:modules AS jsonb), CAST(:features AS jsonb),
                     CAST(:limits AS jsonb), COALESCE(:created_at, now()))
                ON CONFLICT (license_id) DO UPDATE
                    SET school_id = EXCLUDED.school_id,
                        site_id = EXCLUDED.site_id,
                        title = EXCLUDED.title,
                        status = EXCLUDED.status,
                        price_rub = EXCLUDED.price_rub,
                        starts_at = EXCLUDED.starts_at,
                        expires_at = EXCLUDED.expires_at,
                        modules = EXCLUDED.modules,
                        features = EXCLUDED.features,
                        limits = EXCLUDED.limits
                """
            ),
            {
                "license_id": row["licenseId"],
                "school_id": row.get("schoolId"),
                "site_id": row.get("siteId"),
                "title": row.get("title") or "Лицензия",
                "status": row.get("status") or "active",
                "price_rub": int(row.get("priceRub") or 0),
                "starts_at": _parse_ts(row.get("startsAt")),
                "expires_at": _parse_ts(row.get("expiresAt")),
                "modules": json.dumps(row.get("modules") or [], ensure_ascii=False),
                "features": json.dumps(row.get("features") or [], ensure_ascii=False),
                "limits": json.dumps(row.get("limits") or {}, ensure_ascii=False),
                "created_at": _parse_ts(row.get("createdAt")),
            },
        )
        report.written["school_licenses"] += 1

    for row in state.get("school_invite_codes", {}).values():
        if not isinstance(row, dict) or not row.get("code"):
            continue
        session.execute(
            text(
                """
                INSERT INTO school_invite_codes
                    (code, school_id, site_id, class_id, role, title, subject, teacher_user_id,
                     student_label, status, max_activations, activations, expires_at, activated_at,
                     activated_by_user_id, created_at, created_by)
                VALUES
                    (:code, :school_id, :site_id, :class_id, :role, :title, :subject,
                     :teacher_user_id, :student_label, :status, :max_activations, :activations,
                     :expires_at, :activated_at, :activated_by_user_id,
                     COALESCE(:created_at, now()), :created_by)
                ON CONFLICT (code) DO UPDATE
                    SET school_id = EXCLUDED.school_id,
                        site_id = EXCLUDED.site_id,
                        class_id = EXCLUDED.class_id,
                        role = EXCLUDED.role,
                        title = EXCLUDED.title,
                        subject = EXCLUDED.subject,
                        teacher_user_id = EXCLUDED.teacher_user_id,
                        student_label = EXCLUDED.student_label,
                        status = EXCLUDED.status,
                        max_activations = EXCLUDED.max_activations,
                        activations = EXCLUDED.activations,
                        expires_at = EXCLUDED.expires_at,
                        activated_at = EXCLUDED.activated_at,
                        activated_by_user_id = EXCLUDED.activated_by_user_id
                """
            ),
            {
                "code": row["code"],
                "school_id": row.get("schoolId"),
                "site_id": row.get("siteId"),
                "class_id": row.get("classId"),
                "role": row.get("role") or "student",
                "title": row.get("title"),
                "subject": row.get("subject"),
                "teacher_user_id": row.get("teacherUserId"),
                "student_label": row.get("studentLabel"),
                "status": row.get("status") or "pending",
                "max_activations": int(row.get("maxActivations") or 1),
                "activations": int(row.get("activations") or row.get("activatedCount") or 0),
                "expires_at": _parse_ts(row.get("expiresAt")),
                "activated_at": _parse_ts(row.get("activatedAt")),
                "activated_by_user_id": row.get("activatedByUserId"),
                "created_at": _parse_ts(row.get("createdAt")),
                "created_by": row.get("createdBy"),
            },
        )
        report.written["school_invite_codes"] += 1


def _reconstruct_dangling_classes(
    session: Session, state: dict[str, Any], report: Report
) -> None:
    """Rebuild classes that are referenced but were never written down.

    The JSON file contains a class id -- ``qa_stage2_preview`` -- used by five
    memberships and one invitation code, while ``school_classes`` has no such
    entry. It was created implicitly by the invite-activation path, which never
    wrote the class record; the previous best-effort sync then swallowed the
    resulting failures, so nothing ever surfaced.

    Dropping the six referencing records would lose real data. Instead the class
    is rebuilt from the records that reference it -- school, site, subject and
    title all come from the invitation code, nothing is invented -- and the
    reconstruction is reported so it is a visible decision rather than a quiet
    repair.
    """
    declared = {
        str(row.get("classId"))
        for row in state.get("school_classes", {}).values()
        if isinstance(row, dict) and row.get("classId")
    }

    referenced: dict[str, dict[str, Any]] = {}
    for row in state.get("school_invite_codes", {}).values():
        if not isinstance(row, dict):
            continue
        class_id = row.get("classId")
        if class_id and class_id not in declared:
            referenced.setdefault(str(class_id), {}).update(
                {
                    "school_id": row.get("schoolId"),
                    "site_id": row.get("siteId"),
                    "subject": row.get("subject"),
                    "title": row.get("title"),
                    "source": f"school_invite_codes/{row.get('code')}",
                }
            )
    for class_id, members in state.get("school_memberships", {}).items():
        if class_id in declared or not isinstance(members, dict):
            continue
        entry = referenced.setdefault(str(class_id), {})
        entry.setdefault("source", "school_memberships")
        for member in members.values():
            if isinstance(member, dict):
                entry.setdefault("school_id", member.get("schoolId"))
                entry.setdefault("site_id", member.get("siteId"))

    for class_id, entry in sorted(referenced.items()):
        session.execute(
            text(
                """
                INSERT INTO school_classes
                    (class_id, school_id, site_id, title, subject, created_at)
                VALUES (:class_id, :school_id, :site_id, :title, :subject, now())
                ON CONFLICT (class_id) DO NOTHING
                """
            ),
            {
                "class_id": class_id,
                "school_id": entry.get("school_id"),
                "site_id": entry.get("site_id"),
                "title": entry.get("title") or class_id,
                "subject": entry.get("subject"),
            },
        )
        report.written["school_classes.reconstructed"] += 1
        report.rebuild(
            "school_classes",
            class_id,
            f"класс отсутствовал в school_classes, восстановлен по {entry.get('source')}",
        )


def _migrate_users(session: Session, state: dict[str, Any], report: Report) -> set[str]:
    """Accounts, identifiers and password material."""
    users: dict[str, Any] = state.get("users", {})
    known: set[str] = set()

    for user_id, row in users.items():
        if not isinstance(row, dict):
            report.skip("users", user_id, "запись не является объектом")
            continue
        session.execute(
            text(
                """
                INSERT INTO users
                    (user_id, status, display_name, is_demo, is_test,
                     created_at, updated_at, last_login_at)
                VALUES
                    (:user_id, 'active', :display_name, :is_demo, :is_test,
                     COALESCE(:created_at, now()), COALESCE(:updated_at, now()), :last_login_at)
                ON CONFLICT (user_id) DO UPDATE
                    SET display_name = EXCLUDED.display_name,
                        is_demo = EXCLUDED.is_demo,
                        is_test = EXCLUDED.is_test,
                        updated_at = EXCLUDED.updated_at,
                        last_login_at = GREATEST(
                            users.last_login_at, EXCLUDED.last_login_at
                        )
                """
            ),
            {
                "user_id": user_id,
                "display_name": row.get("displayName"),
                "is_demo": bool(row.get("demo")),
                "is_test": bool(row.get("isTestUser")),
                "created_at": _parse_ts(row.get("createdAt")),
                "updated_at": _parse_ts(row.get("updatedAt")) or _parse_ts(row.get("createdAt")),
                "last_login_at": _parse_ts(row.get("lastLoginAt")),
            },
        )
        known.add(user_id)
        report.written["users"] += 1

    # Identifiers. `logins` and `phones` are the authoritative lookup maps: four
    # accounts already carry two logins each, which is exactly why identifiers
    # are rows and not columns on `users`.
    for login, user_id in state.get("logins", {}).items():
        if user_id not in known:
            report.skip("logins", str(login), f"логин ссылается на неизвестного пользователя {user_id}")
            continue
        primary = _norm_login(users.get(user_id, {}).get("login") or "") == _norm_login(login)
        _upsert_identifier(session, user_id, "login", str(login), _norm_login(login), primary)
        report.written["user_identifiers.login"] += 1

    for phone, user_id in state.get("phones", {}).items():
        if user_id not in known:
            report.skip("phones", str(phone), f"телефон ссылается на неизвестного пользователя {user_id}")
            continue
        normalized = _norm_phone(phone)
        if not normalized:
            report.skip("phones", str(phone), "не удалось нормализовать номер")
            continue
        primary = _norm_phone(users.get(user_id, {}).get("phone") or "") == normalized
        _upsert_identifier(session, user_id, "phone", str(phone), normalized, primary)
        report.written["user_identifiers.phone"] += 1

    # A `users[].phone` that never made it into the `phones` map. Reported rather
    # than guessed at: `admin_console` carries the literal string "admin:admin"
    # there, which is a console marker and not a phone number.
    phone_owner = {value for value in state.get("phones", {}).values()}
    for user_id, row in users.items():
        if user_id in phone_owner or not isinstance(row, dict):
            continue
        raw_phone = str(row.get("phone") or "")
        if raw_phone and not PHONE_RE.match(raw_phone):
            report.skip(
                "users.phone",
                f"{user_id}={raw_phone}",
                "значение не является номером телефона и не заведено как идентификатор",
            )

    for user_id, row in users.items():
        if user_id not in known or not isinstance(row, dict):
            continue
        password_hash = row.get("passwordHash")
        if not password_hash:
            continue
        algorithm = _password_algorithm(password_hash)
        if algorithm is None:
            report.skip("users.passwordHash", user_id, "неизвестный формат хеша пароля")
            continue
        session.execute(
            text(
                """
                INSERT INTO user_credentials
                    (user_id, algorithm, password_hash, needs_rehash, must_change, updated_at)
                VALUES
                    (:user_id, :algorithm, :password_hash, :needs_rehash, false,
                     COALESCE(:updated_at, now()))
                ON CONFLICT (user_id) DO UPDATE
                    SET algorithm = EXCLUDED.algorithm,
                        password_hash = EXCLUDED.password_hash,
                        needs_rehash = EXCLUDED.needs_rehash,
                        updated_at = EXCLUDED.updated_at
                """
            ),
            {
                "user_id": user_id,
                "algorithm": algorithm,
                "password_hash": password_hash,
                # Argon2id is the target. Everything else is carried over as-is
                # and upgraded on the owner's next successful login, so the
                # migration locks nobody out.
                "needs_rehash": algorithm != "argon2id",
                "updated_at": _parse_ts(row.get("passwordUpdatedAt")),
            },
        )
        report.written["user_credentials"] += 1

    return known


def _upsert_identifier(
    session: Session, user_id: str, kind: str, value: str, normalized: str, primary: bool
) -> None:
    session.execute(
        text(
            """
            INSERT INTO user_identifiers
                (user_id, kind, value, value_normalized, is_primary)
            VALUES (:user_id, :kind, :value, :value_normalized, :is_primary)
            ON CONFLICT (kind, value_normalized) DO UPDATE
                SET user_id = EXCLUDED.user_id,
                    value = EXCLUDED.value,
                    is_primary = EXCLUDED.is_primary
            """
        ),
        {
            "user_id": user_id,
            "kind": kind,
            "value": value,
            "value_normalized": normalized,
            "is_primary": primary,
        },
    )


def _migrate_memberships_and_roles(
    session: Session, state: dict[str, Any], known_users: set[str], report: Report
) -> None:
    """Class memberships, and the scoped role assignments derived from them."""
    known_classes = {
        row[0] for row in session.execute(text("SELECT class_id FROM school_classes")).all()
    }

    for class_id, members in state.get("school_memberships", {}).items():
        if not isinstance(members, dict):
            continue
        if class_id not in known_classes:
            report.skip("school_memberships", str(class_id), "класс отсутствует в school_classes")
            continue
        for user_id, row in members.items():
            if not isinstance(row, dict):
                continue
            if user_id not in known_users:
                report.skip(
                    "school_memberships",
                    f"{class_id}/{user_id}",
                    "пользователь отсутствует в users",
                )
                continue
            session.execute(
                text(
                    """
                    INSERT INTO school_memberships
                        (class_id, user_id, role, school_id, site_id, joined_at)
                    VALUES (:class_id, :user_id, :role, :school_id, :site_id,
                            COALESCE(:joined_at, now()))
                    ON CONFLICT (class_id, user_id) DO UPDATE
                        SET role = EXCLUDED.role,
                            school_id = EXCLUDED.school_id,
                            site_id = EXCLUDED.site_id,
                            joined_at = EXCLUDED.joined_at
                    """
                ),
                {
                    "class_id": class_id,
                    "user_id": user_id,
                    "role": row.get("role") or "student",
                    "school_id": row.get("schoolId"),
                    "site_id": row.get("siteId"),
                    "joined_at": _parse_ts(row.get("joinedAt")),
                },
            )
            report.written["school_memberships"] += 1

            _upsert_role_assignment(
                session,
                user_id=user_id,
                role_key=row.get("role") or "student",
                scope_type="class",
                class_id=class_id,
                school_id=row.get("schoolId"),
                site_id=row.get("siteId"),
                granted_by="migration:school_memberships",
                granted_at=_parse_ts(row.get("joinedAt")),
                report=report,
            )

    # Global roles. `role_overrides` is the current authority; a consent record
    # is the fallback the API already uses when no override exists
    # (auth_sync.py: role_overrides -> consents.role -> "student"). Both are
    # written as explicit global assignments so the effective role after the
    # switch is byte-for-byte the one the API resolves today.
    consents = state.get("consents", {})
    for user_id, role_key in state.get("role_overrides", {}).items():
        if user_id not in known_users:
            report.skip("role_overrides", str(user_id), "пользователь отсутствует в users")
            continue
        _upsert_role_assignment(
            session,
            user_id=user_id,
            role_key=str(role_key),
            scope_type="global",
            granted_by="migration:role_overrides",
            report=report,
        )

    for user_id, consent in consents.items():
        if user_id not in known_users or not isinstance(consent, dict):
            continue
        if user_id in state.get("role_overrides", {}):
            continue
        role_key = str(consent.get("role") or "").strip().lower()
        if not role_key:
            continue
        _upsert_role_assignment(
            session,
            user_id=user_id,
            role_key=role_key,
            scope_type="global",
            granted_by="migration:consents",
            report=report,
        )


def _upsert_role_assignment(
    session: Session,
    *,
    user_id: str,
    role_key: str,
    scope_type: str,
    organization_id: Optional[str] = None,
    school_id: Optional[str] = None,
    site_id: Optional[str] = None,
    class_id: Optional[str] = None,
    subject: Optional[str] = None,
    granted_by: str,
    granted_at: Optional[datetime] = None,
    report: Optional[Report] = None,
) -> None:
    """Insert one scoped assignment unless an identical live one already exists.

    The uniqueness rule lives in a partial unique index (active assignments
    only), which makes ``ON CONFLICT`` inference awkward to spell; at this data
    volume an explicit existence check is both clearer and exact.
    """
    role_exists = session.execute(
        text("SELECT 1 FROM roles WHERE role_key = :role_key"), {"role_key": role_key}
    ).first()
    if role_exists is None:
        if report is not None:
            report.skip("role_assignments", f"{user_id}:{role_key}", "роль отсутствует в справочнике roles")
        return

    # `global` assignments must carry no scope columns at all -- the CHECK
    # constraint enforces it, and passing a stray school_id here would fail.
    if scope_type == "global":
        organization_id = school_id = site_id = class_id = None

    existing = session.execute(
        text(
            """
            SELECT 1 FROM role_assignments
             WHERE user_id = :user_id
               AND role_key = :role_key
               AND scope_type = :scope_type
               AND COALESCE(organization_id, '') = COALESCE(:organization_id, '')
               AND COALESCE(school_id, '') = COALESCE(:school_id, '')
               AND COALESCE(site_id, '') = COALESCE(:site_id, '')
               AND COALESCE(class_id, '') = COALESCE(:class_id, '')
               AND COALESCE(subject, '') = COALESCE(:subject, '')
               AND revoked_at IS NULL
            """
        ),
        {
            "user_id": user_id,
            "role_key": role_key,
            "scope_type": scope_type,
            "organization_id": organization_id,
            "school_id": school_id,
            "site_id": site_id,
            "class_id": class_id,
            "subject": subject,
        },
    ).first()
    if existing is not None:
        return

    session.execute(
        text(
            """
            INSERT INTO role_assignments
                (user_id, role_key, scope_type, organization_id, school_id, site_id, class_id,
                 subject, granted_by, granted_at)
            VALUES
                (:user_id, :role_key, :scope_type, :organization_id, :school_id, :site_id,
                 :class_id, :subject, :granted_by, COALESCE(:granted_at, now()))
            """
        ),
        {
            "user_id": user_id,
            "role_key": role_key,
            "scope_type": scope_type,
            "organization_id": organization_id,
            "school_id": school_id,
            "site_id": site_id,
            "class_id": class_id,
            "subject": subject,
            "granted_by": granted_by,
            "granted_at": granted_at,
        },
    )
    if report is not None:
        report.written["role_assignments"] += 1


def _migrate_grants_and_entitlements(
    session: Session, state: dict[str, Any], known_users: set[str], report: Report
) -> None:
    # Every tenancy column on access_grants is a real foreign key. The JSON file
    # holds grants pointing at an organization and a licence that do not exist
    # (`test_university`, `test_school_quarter_license`) -- leftovers from test
    # runs that the old silent sync accepted. The grant itself is real and is
    # kept; the dangling pointer is dropped and reported, because a grant that
    # names a licence nobody can produce is worse than a grant that names none.
    known_licenses = {
        row[0] for row in session.execute(text("SELECT license_id FROM school_licenses")).all()
    }
    known_organizations = {
        row[0] for row in session.execute(text("SELECT organization_id FROM organizations")).all()
    }
    known_schools = {row[0] for row in session.execute(text("SELECT school_id FROM schools")).all()}
    known_sites = {row[0] for row in session.execute(text("SELECT site_id FROM school_sites")).all()}

    def _resolve(grant_id: str, field_name: str, value: Any, known: set[str]) -> Optional[str]:
        if not value:
            return None
        if value in known:
            return str(value)
        report.drop_reference(
            "access_grants",
            str(grant_id),
            f"{field_name}={value} отсутствует в справочнике; грант записан без этой ссылки",
        )
        return None

    for user_id, grants in state.get("access_grants", {}).items():
        if user_id not in known_users:
            report.skip("access_grants", str(user_id), "пользователь отсутствует в users")
            continue
        if not isinstance(grants, list):
            continue
        for grant in grants:
            if not isinstance(grant, dict) or not grant.get("grantId"):
                continue
            grant_id = str(grant["grantId"])
            license_id = _resolve(grant_id, "licenseId", grant.get("licenseId"), known_licenses)
            organization_id = _resolve(
                grant_id, "organizationId", grant.get("organizationId"), known_organizations
            )
            school_id = _resolve(grant_id, "schoolId", grant.get("schoolId"), known_schools)
            site_id = _resolve(grant_id, "siteId", grant.get("siteId"), known_sites)
            session.execute(
                text(
                    """
                    INSERT INTO access_grants
                        (grant_id, user_id, source_type, title, status, organization_id, school_id,
                         site_id, license_id, price_rub, plan, module_id, feature,
                         plans, modules, features, starts_at, expires_at, created_at)
                    VALUES
                        (:grant_id, :user_id, :source_type, :title, :status, :organization_id,
                         :school_id, :site_id, :license_id, :price_rub, :plan, :module_id, :feature,
                         CAST(:plans AS jsonb), CAST(:modules AS jsonb), CAST(:features AS jsonb),
                         :starts_at, :expires_at, COALESCE(:created_at, now()))
                    ON CONFLICT (grant_id) DO UPDATE
                        SET status = EXCLUDED.status,
                            title = EXCLUDED.title,
                            price_rub = EXCLUDED.price_rub,
                            plans = EXCLUDED.plans,
                            modules = EXCLUDED.modules,
                            features = EXCLUDED.features,
                            expires_at = EXCLUDED.expires_at
                    """
                ),
                {
                    "grant_id": grant_id,
                    "user_id": user_id,
                    "source_type": grant.get("sourceType") or "manual",
                    "title": grant.get("title"),
                    "status": grant.get("status") or "active",
                    "organization_id": organization_id,
                    "school_id": school_id,
                    "site_id": site_id,
                    "license_id": license_id,
                    "price_rub": grant.get("priceRub"),
                    "plan": grant.get("plan"),
                    "module_id": grant.get("moduleId"),
                    "feature": grant.get("feature"),
                    "plans": json.dumps(grant.get("plans") or [], ensure_ascii=False),
                    "modules": json.dumps(grant.get("modules") or [], ensure_ascii=False),
                    "features": json.dumps(grant.get("features") or [], ensure_ascii=False),
                    "starts_at": _parse_ts(grant.get("startsAt")),
                    "expires_at": _parse_ts(grant.get("expiresAt")),
                    "created_at": _parse_ts(grant.get("createdAt")),
                },
            )
            report.written["access_grants"] += 1

    for user_id, entitlement in state.get("entitlements", {}).items():
        if user_id not in known_users:
            report.skip(
                "entitlements",
                str(user_id),
                "пользователь отсутствует в users — набор доступов перенести не к кому",
            )
            continue
        if not isinstance(entitlement, dict):
            continue
        session.execute(
            text(
                """
                INSERT INTO user_entitlements (user_id, ai_quota_left, updated_at)
                VALUES (:user_id, :ai_quota_left, now())
                ON CONFLICT (user_id) DO UPDATE
                    SET ai_quota_left = EXCLUDED.ai_quota_left, updated_at = now()
                """
            ),
            {
                "user_id": user_id,
                "ai_quota_left": max(0, int(entitlement.get("ai_quota_left") or 0)),
            },
        )
        report.written["user_entitlements"] += 1

        items: list[tuple[str, str, str]] = []
        for value in entitlement.get("plans") or []:
            items.append(("plan", str(value), "grant"))
        for value in entitlement.get("legacyPlans") or []:
            items.append(("plan", str(value), "legacy"))
        for value in entitlement.get("modules") or []:
            items.append(("module", str(value), "grant"))
        for value in entitlement.get("features") or []:
            items.append(("feature", str(value), "grant"))

        for kind, value, source in items:
            if not value:
                continue
            session.execute(
                text(
                    """
                    INSERT INTO user_entitlement_items (user_id, kind, value, source)
                    VALUES (:user_id, :kind, :value, :source)
                    ON CONFLICT (user_id, kind, value) DO UPDATE SET source = EXCLUDED.source
                    """
                ),
                {"user_id": user_id, "kind": kind, "value": value, "source": source},
            )
            report.written["user_entitlement_items"] += 1


def _migrate_consents(
    session: Session, state: dict[str, Any], known_users: set[str], report: Report
) -> None:
    """One legacy consent record becomes one or two typed consent rows.

    The legacy shape is ``{role, version, acceptedAt, parentApproved}``: a
    single "the user accepted the terms" fact plus a flag for the guardian's
    approval. Those are two legally distinct consents, so they become two rows
    with the same document version -- which is what makes it possible to answer
    "did a parent approve this child, and when" without parsing a boolean out of
    a blob.
    """
    for user_id, consent in state.get("consents", {}).items():
        if not isinstance(consent, dict):
            continue
        if user_id not in known_users:
            report.skip(
                "consents",
                str(user_id),
                "согласие ссылается на пользователя, которого нет в users",
            )
            continue
        accepted_at = _parse_ts(consent.get("acceptedAt")) or _utc_now()
        version = str(consent.get("version") or "unknown")
        role = str(consent.get("role") or "").strip().lower() or None

        session.execute(
            text(
                """
                INSERT INTO consents
                    (user_id, consent_type, document_version, accepted_at, subject_role, evidence)
                VALUES (:user_id, 'terms', :version, :accepted_at, :role,
                        CAST(:evidence AS jsonb))
                ON CONFLICT (user_id, consent_type, document_version) DO UPDATE
                    SET accepted_at = EXCLUDED.accepted_at,
                        subject_role = EXCLUDED.subject_role
                """
            ),
            {
                "user_id": user_id,
                "version": version,
                "accepted_at": accepted_at,
                "role": role,
                "evidence": json.dumps(
                    {"source": "user_state.json:consents"}, ensure_ascii=False
                ),
            },
        )
        report.written["consents"] += 1

        if consent.get("parentApproved"):
            session.execute(
                text(
                    """
                    INSERT INTO consents
                        (user_id, consent_type, document_version, accepted_at, subject_role,
                         evidence)
                    VALUES (:user_id, 'parent_approval', :version, :accepted_at, :role,
                            CAST(:evidence AS jsonb))
                    ON CONFLICT (user_id, consent_type, document_version) DO UPDATE
                        SET accepted_at = EXCLUDED.accepted_at
                    """
                ),
                {
                    "user_id": user_id,
                    "version": version,
                    "accepted_at": accepted_at,
                    "role": role,
                    "evidence": json.dumps(
                        {
                            "source": "user_state.json:consents.parentApproved",
                            # The legacy flag records that approval happened, but
                            # not who gave it. That gap is preserved honestly
                            # instead of being filled with a guess.
                            "approver": "unknown",
                        },
                        ensure_ascii=False,
                    ),
                },
            )
            report.written["consents.parent_approval"] += 1


def _migrate_sessions(
    session: Session, state: dict[str, Any], known_users: set[str], report: Report
) -> None:
    for session_id, row in state.get("sessions", {}).items():
        if not isinstance(row, dict):
            continue
        user_id = row.get("userId")
        if user_id not in known_users:
            report.skip("sessions", str(session_id), f"сессия ссылается на неизвестного пользователя {user_id}")
            continue
        expires_at = _parse_ts(row.get("expiresAt"))
        if expires_at is None:
            report.skip("sessions", str(session_id), "у сессии нет срока действия")
            continue
        role_key = str(row.get("role") or "").strip().lower() or None
        if role_key is not None:
            exists = session.execute(
                text("SELECT 1 FROM roles WHERE role_key = :role_key"), {"role_key": role_key}
            ).first()
            if exists is None:
                report.skip("sessions", str(session_id), f"роль {role_key} отсутствует в справочнике")
                role_key = None

        session.execute(
            text(
                """
                INSERT INTO user_sessions
                    (session_id, user_id, role_key, access_jti, access_expires_at, expires_at,
                     created_at, revoked, revoked_at)
                VALUES
                    (:session_id, :user_id, :role_key, :access_jti, :access_expires_at,
                     :expires_at, COALESCE(:created_at, now()), :revoked, :revoked_at)
                ON CONFLICT (session_id) DO UPDATE
                    SET revoked = EXCLUDED.revoked,
                        revoked_at = EXCLUDED.revoked_at,
                        access_jti = EXCLUDED.access_jti,
                        access_expires_at = EXCLUDED.access_expires_at
                """
            ),
            {
                "session_id": session_id,
                "user_id": user_id,
                "role_key": role_key,
                "access_jti": row.get("accessJti"),
                "access_expires_at": _parse_ts(row.get("accessExpiresAt")),
                "expires_at": expires_at,
                "created_at": _parse_ts(row.get("createdAt")),
                "revoked": bool(row.get("revoked")),
                "revoked_at": _parse_ts(row.get("revokedAt")),
            },
        )
        report.written["user_sessions"] += 1

        refresh_hash = row.get("refreshHash")
        if refresh_hash:
            session.execute(
                text(
                    """
                    INSERT INTO refresh_tokens
                        (session_id, token_hash, issued_at, expires_at, revoked_at)
                    VALUES (:session_id, :token_hash, COALESCE(:issued_at, now()), :expires_at,
                            :revoked_at)
                    ON CONFLICT (token_hash) DO NOTHING
                    """
                ),
                {
                    "session_id": session_id,
                    "token_hash": refresh_hash,
                    "issued_at": _parse_ts(row.get("createdAt")),
                    "expires_at": expires_at,
                    "revoked_at": _parse_ts(row.get("revokedAt"))
                    or (_utc_now() if row.get("revoked") else None),
                },
            )
            report.written["refresh_tokens"] += 1


def _migrate_devices_and_app_state(
    session: Session, state: dict[str, Any], known_users: set[str], report: Report
) -> None:
    known_schools = {row[0] for row in session.execute(text("SELECT school_id FROM schools")).all()}
    known_classes = {
        row[0] for row in session.execute(text("SELECT class_id FROM school_classes")).all()
    }

    for user_id, devices in state.get("device_registry", {}).items():
        if user_id not in known_users:
            report.skip("device_registry", str(user_id), "пользователь отсутствует в users")
            continue
        if not isinstance(devices, dict):
            continue
        for device_id, row in devices.items():
            if not isinstance(row, dict):
                continue
            session.execute(
                text(
                    """
                    INSERT INTO device_registry
                        (user_id, device_id, label, platform, active, trusted_at, last_seen_at,
                         revoked_at)
                    VALUES (:user_id, :device_id, :label, :platform, :active, :trusted_at,
                            :last_seen_at, :revoked_at)
                    ON CONFLICT (user_id, device_id) DO UPDATE
                        SET label = EXCLUDED.label,
                            platform = EXCLUDED.platform,
                            active = EXCLUDED.active,
                            trusted_at = EXCLUDED.trusted_at,
                            last_seen_at = EXCLUDED.last_seen_at,
                            revoked_at = EXCLUDED.revoked_at
                    """
                ),
                {
                    "user_id": user_id,
                    "device_id": device_id,
                    "label": row.get("label"),
                    "platform": row.get("platform"),
                    "active": bool(row.get("active", True)),
                    "trusted_at": _parse_ts(row.get("trustedAt")),
                    "last_seen_at": _parse_ts(row.get("lastSeenAt")),
                    "revoked_at": _parse_ts(row.get("revokedAt")),
                },
            )
            report.written["device_registry"] += 1

    for code, row in state.get("device_recovery_codes", {}).items():
        if not isinstance(row, dict):
            continue
        user_id = row.get("userId")
        if user_id not in known_users:
            report.skip("device_recovery_codes", str(code), f"неизвестный пользователь {user_id}")
            continue
        school_id = row.get("schoolId") if row.get("schoolId") in known_schools else None
        class_id = row.get("classId") if row.get("classId") in known_classes else None
        session.execute(
            text(
                """
                INSERT INTO device_recovery_codes
                    (code, user_id, school_id, class_id, status, created_at, expires_at, used_at,
                     created_by)
                VALUES (:code, :user_id, :school_id, :class_id, :status,
                        COALESCE(:created_at, now()), :expires_at, :used_at, :created_by)
                ON CONFLICT (code) DO UPDATE
                    SET status = EXCLUDED.status,
                        expires_at = EXCLUDED.expires_at,
                        used_at = EXCLUDED.used_at
                """
            ),
            {
                "code": code,
                "user_id": user_id,
                "school_id": school_id,
                "class_id": class_id,
                "status": row.get("status") or "pending",
                "created_at": _parse_ts(row.get("createdAt")),
                "expires_at": _parse_ts(row.get("expiresAt")),
                "used_at": _parse_ts(row.get("usedAt")) or _parse_ts(row.get("activatedAt")),
                "created_by": row.get("createdBy"),
            },
        )
        report.written["device_recovery_codes"] += 1

    for user_id, row in state.get("device_sync", {}).items():
        if user_id not in known_users:
            report.skip("device_sync", str(user_id), "пользователь отсутствует в users")
            continue
        if not isinstance(row, dict):
            continue
        session.execute(
            text(
                """
                INSERT INTO user_app_state (user_id, content_versions, preferences, updated_at)
                VALUES (:user_id, CAST(:content_versions AS jsonb), CAST(:preferences AS jsonb),
                        COALESCE(:updated_at, now()))
                ON CONFLICT (user_id) DO UPDATE
                    SET content_versions = EXCLUDED.content_versions,
                        preferences = EXCLUDED.preferences,
                        updated_at = EXCLUDED.updated_at
                """
            ),
            {
                "user_id": user_id,
                "content_versions": json.dumps(row.get("contentVersions") or {}, ensure_ascii=False),
                "preferences": json.dumps(row.get("preferences") or {}, ensure_ascii=False),
                "updated_at": _parse_ts(row.get("updatedAt")),
            },
        )
        report.written["user_app_state"] += 1

        # `device_sync.purchases` is a per-user list of bought modules. It is an
        # entitlement, so it belongs with the other entitlement items rather
        # than in a client-state blob.
        for module_id in row.get("purchases") or []:
            if not module_id:
                continue
            session.execute(
                text(
                    """
                    INSERT INTO user_entitlement_items (user_id, kind, value, source)
                    VALUES (:user_id, 'module', :value, 'manual')
                    ON CONFLICT (user_id, kind, value) DO NOTHING
                    """
                ),
                {"user_id": user_id, "value": str(module_id)},
            )
            report.written["user_entitlement_items.purchases"] += 1


def _migrate_throttling(session: Session, state: dict[str, Any], report: Report) -> None:
    for phone, row in state.get("otp", {}).items():
        if not isinstance(row, dict):
            continue
        expires_at = _parse_ts(row.get("expiresAt"))
        if expires_at is None or not row.get("codeHash"):
            report.skip("otp", str(phone), "нет срока действия или хеша кода")
            continue
        session.execute(
            text(
                """
                INSERT INTO otp_challenges
                    (phone_hash, code_hash, expires_at, attempts, locked_until)
                VALUES (:phone_hash, :code_hash, :expires_at, :attempts, :locked_until)
                ON CONFLICT (phone_hash) DO UPDATE
                    SET code_hash = EXCLUDED.code_hash,
                        expires_at = EXCLUDED.expires_at,
                        attempts = EXCLUDED.attempts,
                        locked_until = EXCLUDED.locked_until
                """
            ),
            {
                # The phone number itself never reaches the table: an OTP table
                # must not double as a directory of who is signing in.
                "phone_hash": hashlib.sha256(_norm_phone(phone).encode("utf-8")).hexdigest(),
                "code_hash": row.get("codeHash"),
                "expires_at": expires_at,
                "attempts": int(row.get("attempts") or 0),
                "locked_until": _parse_ts(row.get("lockedUntil")),
            },
        )
        report.written["otp_challenges"] += 1

    seen_events = {
        row[0]
        for row in session.execute(
            text("SELECT correlation_id FROM audit_log WHERE correlation_id IS NOT NULL")
        ).all()
    }

    for attempt_key, row in state.get("login_attempts", {}).items():
        if not isinstance(row, dict):
            continue
        locked_until = _parse_ts(row.get("lockedUntil"))
        if locked_until is not None:
            session.execute(
                text(
                    """
                    INSERT INTO auth_lockouts (attempt_key, locked_until, reason, updated_at)
                    VALUES (:attempt_key, :locked_until, 'migrated from user_state.json', now())
                    ON CONFLICT (attempt_key) DO UPDATE
                        SET locked_until = EXCLUDED.locked_until, updated_at = now()
                    """
                ),
                {"attempt_key": attempt_key, "locked_until": locked_until},
            )
            report.written["auth_lockouts"] += 1

        for stamp in row.get("timestamps") or []:
            occurred_at = _parse_ts(stamp)
            if occurred_at is None:
                report.skip("login_attempts", f"{attempt_key}@{stamp}", "не разобрана метка времени")
                continue
            # auth_attempt_events is append-only, so idempotency is an existence
            # check rather than an upsert.
            exists = session.execute(
                text(
                    "SELECT 1 FROM auth_attempt_events "
                    " WHERE attempt_key = :attempt_key AND occurred_at = :occurred_at"
                ),
                {"attempt_key": attempt_key, "occurred_at": occurred_at},
            ).first()
            if exists is not None:
                continue
            session.execute(
                text(
                    """
                    INSERT INTO auth_attempt_events (attempt_key, kind, result, occurred_at)
                    VALUES (:attempt_key, :kind, 'failed', :occurred_at)
                    """
                ),
                {
                    "attempt_key": attempt_key,
                    "kind": str(attempt_key).split(":", 1)[0] or "unknown",
                    "occurred_at": occurred_at,
                },
            )
            report.written["auth_attempt_events"] += 1

    for phone, row in state.get("otp_requests", {}).items():
        if not isinstance(row, dict):
            continue
        attempt_key = "otp_request:" + hashlib.sha256(
            _norm_phone(phone).encode("utf-8")
        ).hexdigest()
        for stamp in row.get("timestamps") or []:
            occurred_at = _parse_ts(stamp)
            if occurred_at is None:
                report.skip("otp_requests", f"{phone}@{stamp}", "не разобрана метка времени")
                continue
            exists = session.execute(
                text(
                    "SELECT 1 FROM auth_attempt_events "
                    " WHERE attempt_key = :attempt_key AND occurred_at = :occurred_at"
                ),
                {"attempt_key": attempt_key, "occurred_at": occurred_at},
            ).first()
            if exists is not None:
                continue
            session.execute(
                text(
                    """
                    INSERT INTO auth_attempt_events (attempt_key, kind, result, occurred_at)
                    VALUES (:attempt_key, 'otp_request', 'ok', :occurred_at)
                    """
                ),
                {"attempt_key": attempt_key, "occurred_at": occurred_at},
            )
            report.written["auth_attempt_events.otp"] += 1

    _migrate_audit(session, state, report, seen_events)


def _migrate_audit(
    session: Session, state: dict[str, Any], report: Report, seen: set[str]
) -> None:
    """Fold the three legacy journals into the single append-only audit table.

    ``audit_log`` has no natural key, and its append-only trigger rules out
    ``ON CONFLICT DO UPDATE``. Idempotency therefore comes from a deterministic
    ``correlation_id``: the SHA-256 of the source record. Re-running the script
    inserts nothing.
    """
    batches: Iterable[tuple[str, list[Any], str]] = (
        ("auth_audit", state.get("auth_audit") or [], "auth"),
        ("admin_audit", state.get("admin_audit") or [], "admin"),
        ("payment_audit", state.get("payment_audit") or [], "payment"),
    )

    for collection, records, category in batches:
        for record in records:
            if not isinstance(record, dict):
                continue
            correlation_id = _fingerprint(
                collection, json.dumps(record, sort_keys=True, ensure_ascii=False)
            )
            if correlation_id in seen:
                continue
            seen.add(correlation_id)

            occurred_at = _parse_ts(record.get("at")) or _utc_now()
            raw_result = str(record.get("result") or "ok").lower()
            result = raw_result if raw_result in {"ok", "denied", "failed"} else "failed"

            session.execute(
                text(
                    """
                    INSERT INTO audit_log
                        (occurred_at, actor_user_id, actor_role, action, object_type, object_id,
                         result, correlation_id, details)
                    VALUES
                        (:occurred_at, :actor_user_id, :actor_role, :action, :object_type,
                         :object_id, :result, :correlation_id, CAST(:details AS jsonb))
                    """
                ),
                {
                    "occurred_at": occurred_at,
                    "actor_user_id": record.get("userId") or record.get("changedBy"),
                    "actor_role": record.get("role"),
                    "action": f"{category}:{record.get('action') or 'unknown'}",
                    "object_type": category,
                    "object_id": record.get("targetUserId") or record.get("paymentId"),
                    "result": result,
                    "correlation_id": correlation_id,
                    "details": json.dumps(record, ensure_ascii=False),
                },
            )
            report.written[f"audit_log.{collection}"] += 1


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #


def _source_counts(state: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for name, value in state.items():
        if isinstance(value, dict):
            if name in {"school_memberships", "device_registry"}:
                counts[name] = sum(
                    len(inner) for inner in value.values() if isinstance(inner, dict)
                )
            elif name == "access_grants":
                counts[name] = sum(len(inner) for inner in value.values() if isinstance(inner, list))
            else:
                counts[name] = len(value)
        elif isinstance(value, list):
            counts[name] = len(value)
        else:
            counts[name] = 1
    return counts


def migrate(session: Session, state: dict[str, Any]) -> Report:
    report = Report()
    report.source_counts = _source_counts(state)
    report.before = _table_counts(session)

    _migrate_tenancy(session, state, report)
    known_users = _migrate_users(session, state, report)
    _migrate_memberships_and_roles(session, state, known_users, report)
    _migrate_grants_and_entitlements(session, state, known_users, report)
    _migrate_consents(session, state, known_users, report)
    _migrate_sessions(session, state, known_users, report)
    _migrate_devices_and_app_state(session, state, known_users, report)
    _migrate_throttling(session, state, report)

    session.flush()
    report.after = _table_counts(session)
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="выполнить и откатить транзакцию")
    mode.add_argument("--apply", action="store_true", help="выполнить и зафиксировать транзакцию")
    parser.add_argument("--state", default=str(STATE_PATH), help="путь к user_state.json")
    parser.add_argument("--report", default=None, help="куда записать отчёт")
    parser.add_argument(
        "--allow-unmatched",
        action="store_true",
        help="зафиксировать транзакцию даже при несопоставленных записях",
    )
    args = parser.parse_args(argv)

    state_path = Path(args.state)
    if not state_path.is_file():
        print(f"файл состояния не найден: {state_path}", file=sys.stderr)
        return 2
    state = json.loads(state_path.read_text(encoding="utf-8"))

    session = SessionLocal()
    try:
        report = migrate(session, state)
        rendered = report.render()
        print(rendered)
        if args.report:
            Path(args.report).write_text(rendered + "\n", encoding="utf-8")

        if args.dry_run:
            session.rollback()
            print("\n--dry-run: транзакция откачена, база не изменена")
            return 0 if report.ok else 1

        if not report.ok and not args.allow_unmatched:
            session.rollback()
            print(
                "\nЕсть несопоставленные записи. Транзакция откачена. "
                "Разберите список выше или повторите с --allow-unmatched.",
                file=sys.stderr,
            )
            return 1

        session.commit()
        print("\n--apply: транзакция зафиксирована")
        return 0
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
