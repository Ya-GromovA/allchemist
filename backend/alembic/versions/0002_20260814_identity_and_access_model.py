"""identity and access model

Adds the twenty tables that carry identity, authentication, roles, scoped role
assignments, sessions, consents, family links, entitlements, feature flags,
throttling and audit. Until now all of this lived in
``backend/data/user_state.json``.

Additive only, by design
------------------------
This revision touches no existing table and drops nothing. The old code keeps
running unchanged against the same schema it ran against before, because the
release order is:

    0002 (add)  ->  data migration  ->  switch reads/writes  ->  0003 (foreign
    keys from the legacy tables to ``users``)

Splitting it that way is what makes the release reversible: at every point
between the steps, both the previous and the next version of the application
can serve traffic. ``0003`` is deliberately a separate revision, because adding
``school_memberships.user_id -> users.user_id`` before the users exist would
fail, and adding it while the old code can still write a membership for an
unknown user would break that old code.

Written by hand. ``--autogenerate`` is refused by ``alembic/env.py``; the model
layer in ``app/models`` is verified against the result of this revision by
``tools/db/model_schema_check.sh``, which materialises the metadata into a
throwaway database and diffs the catalogue fingerprints.

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


TZ = postgresql.TIMESTAMP(timezone=True)
UUID = postgresql.UUID(as_uuid=False)
JSONB = postgresql.JSONB(astext_type=sa.Text())
UUID_DEFAULT = sa.text("gen_random_uuid()")


def _any_of(column: str, values: tuple[str, ...]) -> str:
    rendered = ", ".join(f"'{value}'::text" for value in values)
    return f"{column} = ANY (ARRAY[{rendered}])"


USER_STATUSES = ("active", "suspended", "deleted")
IDENTIFIER_KINDS = ("login", "phone", "email")
PASSWORD_ALGORITHMS = ("argon2id", "bcrypt", "pbkdf2_sha256")
PERMISSION_EFFECTS = ("allow", "deny")
SCOPE_TYPES = ("global", "organization", "school", "site", "class")
FLAG_SCOPE_TYPES = ("global", "organization", "school", "site", "class", "user")
CONSENT_TYPES = ("terms", "privacy", "personal_data", "parent_approval", "marketing")
LINK_STATUSES = ("pending", "confirmed", "revoked")
ENTITLEMENT_KINDS = ("plan", "module", "feature")
ENTITLEMENT_SOURCES = ("grant", "manual", "trial", "legacy")
AUDIT_RESULTS = ("ok", "denied", "failed")


# --------------------------------------------------------------------------- #
# Seed data
#
# The role -> permission matrix reproduces `app/security/policies.py::ROLE_SCOPES`
# exactly as it stood on 2026-08-14. Moving the matrix into the database is a
# change of storage, not a change of policy: nobody gains or loses access in
# this revision. Any actual policy change is a separate, individually approved
# revision.
# --------------------------------------------------------------------------- #

ROLES: tuple[tuple[str, str, str, int], ...] = (
    ("student", "Ученик", "Учится, выполняет задания, ведёт свой прогресс.", 10),
    ("learner", "Самостоятельный ученик", "Учится вне школы, без класса и учителя.", 15),
    ("teacher", "Учитель", "Ведёт предмет в классе, видит прогресс своих учеников.", 30),
    (
        "homeroom_teacher",
        "Классный руководитель",
        "Отвечает за класс целиком, включая состав и связь с родителями.",
        35,
    ),
    ("parent", "Родитель", "Видит прогресс своего ребёнка и подтверждает согласия.", 20),
    ("school_admin", "Администратор школы", "Управляет школой: классы, приглашения, лицензия.", 60),
    ("content_editor", "Редактор контента", "Готовит и правит учебный контент до публикации.", 50),
    ("support", "Поддержка", "Помогает пользователям, видит служебные данные без правки.", 55),
    ("admin", "Администратор платформы", "Управляет платформой в пределах своих полномочий.", 80),
    ("owner", "Владелец", "Полные права на платформу.", 100),
)

PERMISSIONS: tuple[tuple[str, str, str, str], ...] = (
    ("auth:me", "Прочитать свой профиль сессии", "Кто я и с какой ролью вошёл.", "self"),
    ("user:read_self", "Прочитать свои данные", "Свой профиль и настройки.", "self"),
    ("user:sync_self", "Синхронизировать свои данные", "Обмен состоянием с устройством.", "self"),
    ("user:profile_self", "Изменить свой профиль", "Имя, настройки, устройства.", "self"),
    ("telemetry:write_self", "Отправлять свою телеметрию", "События своего обучения.", "self"),
    ("payments:admin", "Управлять платежами", "Просмотр и обработка платежей.", "billing"),
    ("cabinet:teacher", "Кабинет учителя", "Классы, задания, прогресс учеников.", "cabinet"),
    ("cabinet:parent", "Кабинет родителя", "Прогресс своего ребёнка.", "cabinet"),
    ("admin:panel", "Админ-панель", "Доступ к служебной панели.", "admin"),
    ("admin:roles", "Управление ролями", "Назначение и снятие ролей.", "admin"),
    ("admin:rights", "Управление правами", "Правка матрицы прав.", "admin"),
    ("admin:subscriptions", "Управление подписками", "Лицензии, тарифы, доступы.", "admin"),
    ("content:manage", "Управление контентом", "Создание и правка учебного контента.", "content"),
)

_ALL_ROLES = tuple(role[0] for role in ROLES)

ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "auth:me": _ALL_ROLES,
    "user:read_self": _ALL_ROLES,
    "user:sync_self": _ALL_ROLES,
    "user:profile_self": _ALL_ROLES,
    "telemetry:write_self": _ALL_ROLES,
    "payments:admin": ("teacher", "homeroom_teacher", "school_admin", "admin", "owner"),
    "cabinet:teacher": ("teacher", "homeroom_teacher"),
    "cabinet:parent": ("parent",),
    "admin:panel": ("support", "school_admin", "admin", "owner"),
    "admin:roles": ("school_admin", "admin", "owner"),
    "admin:rights": ("school_admin", "admin", "owner"),
    "admin:subscriptions": ("school_admin", "admin", "owner"),
    "content:manage": ("content_editor", "school_admin", "admin", "owner"),
}

# Every feature string that production licences and entitlements already hand
# out. Registering them enabled keeps behaviour identical: today a feature is
# available as soon as it is granted, and the flag layer is what will later let
# a feature be switched off platform-wide without editing every licence.
FEATURE_FLAGS: tuple[tuple[str, str, str], ...] = (
    ("ai_basic", "AI-наставник: базовый", "Базовые ответы AI-наставника."),
    ("ai_extended", "AI-наставник: расширенный", "Расширенные разборы и подсказки."),
    ("exam_mode", "Режим экзамена", "Экзаменационные сценарии и таймеры."),
    ("lesson_demo", "Демо-урок", "Показательный урок без лицензии."),
    ("live_lesson", "Live-урок", "Совместный урок учителя и класса."),
    ("molecules_3d", "3D-молекулы", "Просмотр молекул в 3D."),
    ("offline_ai", "AI офлайн", "Ответы AI без сети, на устройстве."),
    ("offline_mode", "Офлайн-режим", "Работа приложения без сети."),
    ("parent_analytics", "Аналитика для родителя", "Отчёты о прогрессе ребёнка."),
    ("teacher_cabinet", "Кабинет учителя", "Инструменты учителя."),
    ("tickets_mode", "Режим билетов", "Подготовка по билетам."),
    ("virtual_labs", "Виртуальные лаборатории", "Лабораторные работы в браузере."),
    ("virtual_reactions", "Виртуальные реакции", "Интерактивные химические реакции."),
)


def upgrade() -> None:
    _create_identity_tables()
    _create_role_tables()
    _create_session_tables()
    _create_consent_tables()
    _create_entitlement_tables()
    _create_ops_tables()
    _seed_reference_data()


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS audit_log_append_only ON public.audit_log")
    op.execute("DROP TRIGGER IF EXISTS auth_attempt_events_append_only ON public.auth_attempt_events")
    op.execute("DROP FUNCTION IF EXISTS public.reject_mutation()")

    for table in (
        "audit_log",
        "auth_lockouts",
        "auth_attempt_events",
        "otp_challenges",
        "user_app_state",
        "feature_flag_overrides",
        "feature_flags",
        "user_entitlement_items",
        "user_entitlements",
        "parent_child_links",
        "consents",
        "refresh_tokens",
        "user_sessions",
        "role_assignments",
        "role_permissions",
        "permissions",
        "roles",
        "user_credentials",
        "user_identifiers",
        "users",
    ):
        op.drop_table(table)


# --------------------------------------------------------------------------- #
# Identity
# --------------------------------------------------------------------------- #


def _create_identity_tables() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'active'"), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("is_demo", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_test", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("last_login_at", TZ, nullable=True),
        sa.Column("deleted_at", TZ, nullable=True),
        sa.CheckConstraint(_any_of("status", USER_STATUSES), name="users_status_check"),
        sa.CheckConstraint(
            "(status <> 'deleted'::text) OR (deleted_at IS NOT NULL)",
            name="users_deleted_at_check",
        ),
        sa.PrimaryKeyConstraint("user_id", name="users_pkey"),
    )
    op.create_index("idx_users_status", "users", ["status"])

    op.create_table(
        "user_identifiers",
        sa.Column("identifier_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("value_normalized", sa.Text(), nullable=False),
        sa.Column("is_primary", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("verified_at", TZ, nullable=True),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(_any_of("kind", IDENTIFIER_KINDS), name="user_identifiers_kind_check"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name="user_identifiers_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("identifier_id", name="user_identifiers_pkey"),
        sa.UniqueConstraint("kind", "value_normalized", name="uq_user_identifiers_kind_value"),
    )
    op.create_index("idx_user_identifiers_user", "user_identifiers", ["user_id"])
    op.create_index(
        "uq_user_identifiers_primary",
        "user_identifiers",
        ["user_id", "kind"],
        unique=True,
        postgresql_where=sa.text("is_primary"),
    )

    op.create_table(
        "user_credentials",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("algorithm", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("needs_rehash", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("must_change", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("updated_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            _any_of("algorithm", PASSWORD_ALGORITHMS), name="user_credentials_algorithm_check"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name="user_credentials_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name="user_credentials_pkey"),
    )


# --------------------------------------------------------------------------- #
# Roles, permissions, scoped assignments
# --------------------------------------------------------------------------- #


def _create_role_tables() -> None:
    op.create_table(
        "roles",
        sa.Column("role_key", sa.Text(), nullable=False),
        sa.Column("title_ru", sa.Text(), nullable=False),
        sa.Column("description_ru", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("rank", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("is_system", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("role_key", name="roles_pkey"),
    )

    op.create_table(
        "permissions",
        sa.Column("permission_key", sa.Text(), nullable=False),
        sa.Column("title_ru", sa.Text(), nullable=False),
        sa.Column("description_ru", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("category", sa.Text(), server_default=sa.text("'general'"), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("permission_key", name="permissions_pkey"),
    )

    op.create_table(
        "role_permissions",
        sa.Column("role_key", sa.Text(), nullable=False),
        sa.Column("permission_key", sa.Text(), nullable=False),
        sa.Column("effect", sa.Text(), server_default=sa.text("'allow'"), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(_any_of("effect", PERMISSION_EFFECTS), name="role_permissions_effect_check"),
        sa.ForeignKeyConstraint(
            ["permission_key"],
            ["permissions.permission_key"],
            name="role_permissions_permission_key_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["role_key"],
            ["roles.role_key"],
            name="role_permissions_role_key_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("role_key", "permission_key", name="role_permissions_pkey"),
    )
    op.create_index("idx_role_permissions_permission", "role_permissions", ["permission_key"])

    op.create_table(
        "role_assignments",
        sa.Column("assignment_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("role_key", sa.Text(), nullable=False),
        sa.Column("scope_type", sa.Text(), server_default=sa.text("'global'"), nullable=False),
        sa.Column("organization_id", sa.Text(), nullable=True),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("class_id", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("granted_by", sa.Text(), nullable=True),
        sa.Column("granted_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", TZ, nullable=True),
        sa.Column("revoked_at", TZ, nullable=True),
        sa.Column("revoked_reason", sa.Text(), nullable=True),
        sa.CheckConstraint(_any_of("scope_type", SCOPE_TYPES), name="role_assignments_scope_type_check"),
        sa.CheckConstraint(
            "(scope_type = 'global'::text AND organization_id IS NULL AND school_id IS NULL "
            "AND site_id IS NULL AND class_id IS NULL) "
            "OR (scope_type = 'organization'::text AND organization_id IS NOT NULL) "
            "OR (scope_type = 'school'::text AND school_id IS NOT NULL) "
            "OR (scope_type = 'site'::text AND site_id IS NOT NULL) "
            "OR (scope_type = 'class'::text AND class_id IS NOT NULL)",
            name="role_assignments_scope_shape_check",
        ),
        sa.ForeignKeyConstraint(
            ["class_id"], ["school_classes.class_id"], name="role_assignments_class_id_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.organization_id"],
            name="role_assignments_organization_id_fkey",
        ),
        sa.ForeignKeyConstraint(
            ["role_key"], ["roles.role_key"], name="role_assignments_role_key_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["school_id"], ["schools.school_id"], name="role_assignments_school_id_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["site_id"], ["school_sites.site_id"], name="role_assignments_site_id_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name="role_assignments_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("assignment_id", name="role_assignments_pkey"),
    )
    op.create_index("idx_role_assignments_class", "role_assignments", ["class_id"])
    op.create_index("idx_role_assignments_organization", "role_assignments", ["organization_id"])
    op.create_index("idx_role_assignments_school", "role_assignments", ["school_id"])
    op.create_index("idx_role_assignments_user", "role_assignments", ["user_id"])
    op.create_index(
        "uq_role_assignments_active",
        "role_assignments",
        [
            "user_id",
            "role_key",
            "scope_type",
            sa.text("COALESCE(organization_id, ''::text)"),
            sa.text("COALESCE(school_id, ''::text)"),
            sa.text("COALESCE(site_id, ''::text)"),
            sa.text("COALESCE(class_id, ''::text)"),
            sa.text("COALESCE(subject, ''::text)"),
        ],
        unique=True,
        postgresql_where=sa.text("revoked_at IS NULL"),
    )


# --------------------------------------------------------------------------- #
# Sessions
# --------------------------------------------------------------------------- #


def _create_session_tables() -> None:
    op.create_table(
        "user_sessions",
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("role_key", sa.Text(), nullable=True),
        sa.Column("access_jti", sa.Text(), nullable=True),
        sa.Column("access_expires_at", TZ, nullable=True),
        sa.Column("expires_at", TZ, nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("last_seen_at", TZ, nullable=True),
        sa.Column("revoked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("revoked_at", TZ, nullable=True),
        sa.Column("revoked_reason", sa.Text(), nullable=True),
        sa.Column("device_id", sa.Text(), nullable=True),
        sa.Column("ip_hash", sa.Text(), nullable=True),
        sa.Column("user_agent_hash", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["role_key"], ["roles.role_key"], name="user_sessions_role_key_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.user_id"], name="user_sessions_user_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("session_id", name="user_sessions_pkey"),
    )
    op.create_index("idx_user_sessions_access_jti", "user_sessions", ["access_jti"])
    op.create_index("idx_user_sessions_expires", "user_sessions", ["expires_at"])
    op.create_index("idx_user_sessions_user", "user_sessions", ["user_id"])

    op.create_table(
        "refresh_tokens",
        sa.Column("token_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("issued_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", TZ, nullable=False),
        sa.Column("used_at", TZ, nullable=True),
        sa.Column("replaced_by_token_id", UUID, nullable=True),
        sa.Column("revoked_at", TZ, nullable=True),
        sa.ForeignKeyConstraint(
            ["replaced_by_token_id"],
            ["refresh_tokens.token_id"],
            name="refresh_tokens_replaced_by_token_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["user_sessions.session_id"],
            name="refresh_tokens_session_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("token_id", name="refresh_tokens_pkey"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index("idx_refresh_tokens_session", "refresh_tokens", ["session_id"])


# --------------------------------------------------------------------------- #
# Consents and family links
# --------------------------------------------------------------------------- #


def _create_consent_tables() -> None:
    op.create_table(
        "consents",
        sa.Column("consent_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("consent_type", sa.Text(), nullable=False),
        sa.Column("document_version", sa.Text(), nullable=False),
        sa.Column("accepted_at", TZ, nullable=False),
        sa.Column("accepted_by_user_id", sa.Text(), nullable=True),
        sa.Column("subject_role", sa.Text(), nullable=True),
        sa.Column("revoked_at", TZ, nullable=True),
        sa.Column("evidence", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(_any_of("consent_type", CONSENT_TYPES), name="consents_type_check"),
        sa.ForeignKeyConstraint(
            ["accepted_by_user_id"],
            ["users.user_id"],
            name="consents_accepted_by_user_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.user_id"], name="consents_user_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("consent_id", name="consents_pkey"),
        sa.UniqueConstraint(
            "user_id", "consent_type", "document_version", name="uq_consents_user_type_version"
        ),
    )
    op.create_index("idx_consents_user", "consents", ["user_id"])

    op.create_table(
        "parent_child_links",
        sa.Column("link_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("parent_user_id", sa.Text(), nullable=False),
        sa.Column("child_user_id", sa.Text(), nullable=False),
        sa.Column("relation", sa.Text(), server_default=sa.text("'parent'"), nullable=False),
        sa.Column("status", sa.Text(), server_default=sa.text("'pending'"), nullable=False),
        sa.Column("invite_code", sa.Text(), nullable=True),
        sa.Column("invited_at", TZ, nullable=True),
        sa.Column("confirmed_at", TZ, nullable=True),
        sa.Column("revoked_at", TZ, nullable=True),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            "parent_user_id <> child_user_id", name="parent_child_links_distinct_check"
        ),
        sa.CheckConstraint(_any_of("status", LINK_STATUSES), name="parent_child_links_status_check"),
        sa.ForeignKeyConstraint(
            ["child_user_id"],
            ["users.user_id"],
            name="parent_child_links_child_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_user_id"],
            ["users.user_id"],
            name="parent_child_links_parent_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("link_id", name="parent_child_links_pkey"),
        sa.UniqueConstraint("invite_code", name="uq_parent_child_links_invite_code"),
        sa.UniqueConstraint("parent_user_id", "child_user_id", name="uq_parent_child_links_pair"),
    )
    op.create_index("idx_parent_child_links_child", "parent_child_links", ["child_user_id"])


# --------------------------------------------------------------------------- #
# Entitlements and feature flags
# --------------------------------------------------------------------------- #


def _create_entitlement_tables() -> None:
    op.create_table(
        "user_entitlements",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("ai_quota_left", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("ai_quota_reset_at", TZ, nullable=True),
        sa.Column("updated_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("ai_quota_left >= 0", name="user_entitlements_quota_check"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name="user_entitlements_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name="user_entitlements_pkey"),
    )

    op.create_table(
        "user_entitlement_items",
        sa.Column("item_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), server_default=sa.text("'manual'"), nullable=False),
        sa.Column("grant_id", sa.Text(), nullable=True),
        sa.Column("starts_at", TZ, nullable=True),
        sa.Column("expires_at", TZ, nullable=True),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(_any_of("kind", ENTITLEMENT_KINDS), name="user_entitlement_items_kind_check"),
        sa.CheckConstraint(
            _any_of("source", ENTITLEMENT_SOURCES), name="user_entitlement_items_source_check"
        ),
        sa.ForeignKeyConstraint(
            ["grant_id"],
            ["access_grants.grant_id"],
            name="user_entitlement_items_grant_id_fkey",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name="user_entitlement_items_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("item_id", name="user_entitlement_items_pkey"),
        sa.UniqueConstraint("user_id", "kind", "value", name="uq_user_entitlement_items"),
    )
    op.create_index("idx_user_entitlement_items_grant", "user_entitlement_items", ["grant_id"])
    op.create_index("idx_user_entitlement_items_user", "user_entitlement_items", ["user_id"])

    op.create_table(
        "feature_flags",
        sa.Column("flag_key", sa.Text(), nullable=False),
        sa.Column("title_ru", sa.Text(), nullable=False),
        sa.Column("description_ru", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("flag_key", name="feature_flags_pkey"),
    )

    op.create_table(
        "feature_flag_overrides",
        sa.Column("override_id", UUID, server_default=UUID_DEFAULT, nullable=False),
        sa.Column("flag_key", sa.Text(), nullable=False),
        sa.Column("scope_type", sa.Text(), nullable=False),
        sa.Column("organization_id", sa.Text(), nullable=True),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("class_id", sa.Text(), nullable=True),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint(
            _any_of("scope_type", FLAG_SCOPE_TYPES), name="feature_flag_overrides_scope_type_check"
        ),
        sa.ForeignKeyConstraint(
            ["class_id"],
            ["school_classes.class_id"],
            name="feature_flag_overrides_class_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["flag_key"],
            ["feature_flags.flag_key"],
            name="feature_flag_overrides_flag_key_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.organization_id"],
            name="feature_flag_overrides_organization_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["school_id"],
            ["schools.school_id"],
            name="feature_flag_overrides_school_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["site_id"],
            ["school_sites.site_id"],
            name="feature_flag_overrides_site_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.user_id"],
            name="feature_flag_overrides_user_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("override_id", name="feature_flag_overrides_pkey"),
    )
    op.create_index(
        "uq_feature_flag_overrides_scope",
        "feature_flag_overrides",
        [
            "flag_key",
            "scope_type",
            sa.text("COALESCE(organization_id, ''::text)"),
            sa.text("COALESCE(school_id, ''::text)"),
            sa.text("COALESCE(site_id, ''::text)"),
            sa.text("COALESCE(class_id, ''::text)"),
            sa.text("COALESCE(user_id, ''::text)"),
        ],
        unique=True,
    )

    op.create_table(
        "user_app_state",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("content_versions", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("preferences", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.user_id"], name="user_app_state_user_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("user_id", name="user_app_state_pkey"),
    )


# --------------------------------------------------------------------------- #
# Throttling, OTP, audit
# --------------------------------------------------------------------------- #


def _create_ops_tables() -> None:
    op.create_table(
        "otp_challenges",
        sa.Column("phone_hash", sa.Text(), nullable=False),
        sa.Column("code_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", TZ, nullable=False),
        sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("locked_until", TZ, nullable=True),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("phone_hash", name="otp_challenges_pkey"),
    )

    op.create_table(
        "auth_attempt_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("attempt_key", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("result", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("occurred_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="auth_attempt_events_pkey"),
    )
    op.create_index(
        "idx_auth_attempt_events_key",
        "auth_attempt_events",
        ["attempt_key", sa.text("occurred_at DESC")],
    )

    op.create_table(
        "auth_lockouts",
        sa.Column("attempt_key", sa.Text(), nullable=False),
        sa.Column("locked_until", TZ, nullable=False),
        sa.Column("reason", sa.Text(), server_default=sa.text("''"), nullable=False),
        sa.Column("updated_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("attempt_key", name="auth_lockouts_pkey"),
    )

    op.create_table(
        "audit_log",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("occurred_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("actor_user_id", sa.Text(), nullable=True),
        sa.Column("actor_role", sa.Text(), nullable=True),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("object_type", sa.Text(), nullable=True),
        sa.Column("object_id", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), server_default=sa.text("'ok'"), nullable=False),
        sa.Column("denied_link", sa.Text(), nullable=True),
        sa.Column("organization_id", sa.Text(), nullable=True),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("class_id", sa.Text(), nullable=True),
        sa.Column("request_id", sa.Text(), nullable=True),
        sa.Column("correlation_id", sa.Text(), nullable=True),
        sa.Column("details", JSONB, server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.CheckConstraint(_any_of("result", AUDIT_RESULTS), name="audit_log_result_check"),
        sa.PrimaryKeyConstraint("id", name="audit_log_pkey"),
    )
    op.create_index("idx_audit_log_action", "audit_log", ["action"])
    op.create_index("idx_audit_log_actor", "audit_log", ["actor_user_id"])
    op.create_index("idx_audit_log_occurred_at", "audit_log", [sa.text("occurred_at DESC")])
    op.create_index("idx_audit_log_school", "audit_log", ["school_id"])

    # Append-only is a property of the table, not a habit of the service layer.
    # A statement-level trigger costs nothing on INSERT and makes an UPDATE or
    # DELETE fail loudly -- including one typed by an administrator at psql.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION public.reject_mutation() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
          RAISE EXCEPTION 'table %.% is append-only: % is not permitted',
            TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
            USING ERRCODE = 'restrict_violation';
        END;
        $$;
        """
    )
    op.execute(
        "CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON public.audit_log "
        "FOR EACH STATEMENT EXECUTE FUNCTION public.reject_mutation()"
    )
    op.execute(
        "CREATE TRIGGER auth_attempt_events_append_only BEFORE UPDATE OR DELETE "
        "ON public.auth_attempt_events FOR EACH STATEMENT EXECUTE FUNCTION public.reject_mutation()"
    )


# --------------------------------------------------------------------------- #
# Reference data
# --------------------------------------------------------------------------- #


def _seed_reference_data() -> None:
    connection = op.get_bind()

    connection.execute(
        sa.text(
            "INSERT INTO roles (role_key, title_ru, description_ru, rank, is_system) "
            "VALUES (:role_key, :title_ru, :description_ru, :rank, true)"
        ),
        [
            {"role_key": key, "title_ru": title, "description_ru": description, "rank": rank}
            for key, title, description, rank in ROLES
        ],
    )

    connection.execute(
        sa.text(
            "INSERT INTO permissions (permission_key, title_ru, description_ru, category) "
            "VALUES (:permission_key, :title_ru, :description_ru, :category)"
        ),
        [
            {
                "permission_key": key,
                "title_ru": title,
                "description_ru": description,
                "category": category,
            }
            for key, title, description, category in PERMISSIONS
        ],
    )

    connection.execute(
        sa.text(
            "INSERT INTO role_permissions (role_key, permission_key, effect) "
            "VALUES (:role_key, :permission_key, 'allow')"
        ),
        [
            {"role_key": role_key, "permission_key": permission_key}
            for permission_key, role_keys in ROLE_PERMISSIONS.items()
            for role_key in role_keys
        ],
    )

    connection.execute(
        sa.text(
            "INSERT INTO feature_flags (flag_key, title_ru, description_ru, enabled) "
            "VALUES (:flag_key, :title_ru, :description_ru, true)"
        ),
        [
            {"flag_key": key, "title_ru": title, "description_ru": description}
            for key, title, description in FEATURE_FLAGS
        ],
    )
