"""baseline production schema

Hand-written baseline for the Allchemist production database.

Authority: this revision was transcribed from ``pg_dump --schema-only`` taken
from the live ``synapse`` database on 2026-08-13, not from the SQLAlchemy model
layer (which only covers ``user_progress_server``) and not from
``app/db/init_db.py`` (which only covers four of the twenty-two tables).
``--autogenerate`` was not used and is blocked in ``alembic/env.py``.

Verification performed before stamping production: this revision was applied to
an empty database in a throwaway postgres:16 container, and the resulting
``pg_dump --schema-only`` was diffed against the dump of a restored production
clone. The diff was empty.

Known warts that are reproduced deliberately, because a baseline must describe
what production actually is, not what it should be:

* Duplicate indexes exist on several tables (for example
  ``idx_ai_knowledge_tags`` / ``idx_ai_knowledge_tags_gin``,
  ``idx_tasks_module`` / ``tasks_module_idx``,
  ``idx_user_progress_device`` / ``idx_user_progress_server_device``).
* Two trigger functions are defined but wired to no trigger
  (``ai_knowledge_tsvector_update``, ``trg_set_updated_at``).
* ``ai_knowledge`` carries two parallel full-text columns (``tsv``,
  ``search_tsv``).

Cleaning any of this up is a later, separate, individually verified revision.

Revision ID: 0001
Revises:
Create Date: 2026-08-13
"""

from __future__ import annotations

import textwrap

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


# --------------------------------------------------------------------------- #
# Trigger functions (verbatim from production)
#
# PostgreSQL stores a function body byte-for-byte, so these strings are passed
# through textwrap.dedent() before execution: the indentation below is Python
# source layout, not part of the body. Without the dedent the stored prosrc
# differs from production and the structural schema diff is non-empty.
# --------------------------------------------------------------------------- #

FUNCTIONS: dict[str, str] = {
    "set_updated_at": """
        CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$;
    """,
    "trg_set_updated_at": """
        CREATE OR REPLACE FUNCTION public.trg_set_updated_at() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$;
    """,
    "ai_knowledge_tsv_update": """
        CREATE OR REPLACE FUNCTION public.ai_knowledge_tsv_update() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
          NEW.updated_at = NOW();
          NEW.tsv =
            setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
            setweight(to_tsvector('simple', coalesce(NEW.body,'')), 'B');
          RETURN NEW;
        END
        $$;
    """,
    "ai_knowledge_tsvector_update": """
        CREATE OR REPLACE FUNCTION public.ai_knowledge_tsvector_update() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
          NEW.search_tsv := to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.content,''));
          RETURN NEW;
        END;
        $$;
    """,
    "tasks_tsvector_update": """
        CREATE OR REPLACE FUNCTION public.tasks_tsvector_update() RETURNS trigger
            LANGUAGE plpgsql
            AS $$
        BEGIN
          NEW.search_tsv := to_tsvector('simple', coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
          RETURN NEW;
        END;
        $$;
    """,
}


# (trigger name, table, timing/events, function)
TRIGGERS: list[tuple[str, str, str, str]] = [
    ("trg_modules_updated", "modules", "BEFORE UPDATE", "set_updated_at"),
    ("trg_lesson_blocks_updated", "lesson_blocks", "BEFORE UPDATE", "set_updated_at"),
    ("trg_tasks_updated", "tasks", "BEFORE UPDATE", "set_updated_at"),
    ("trg_tasks_tsv_update", "tasks", "BEFORE INSERT OR UPDATE", "tasks_tsvector_update"),
    ("trg_molecules_updated", "molecules", "BEFORE UPDATE", "set_updated_at"),
    ("trg_reactions_updated", "reactions", "BEFORE UPDATE", "set_updated_at"),
    ("trg_physics_scenarios_updated", "physics_scenarios", "BEFORE UPDATE", "set_updated_at"),
    ("trg_ai_knowledge_tsv_update", "ai_knowledge", "BEFORE INSERT OR UPDATE", "ai_knowledge_tsv_update"),
    ("set_updated_at_user_progress", "user_progress_server", "BEFORE UPDATE", "set_updated_at"),
]


# Tables in creation order (foreign-key parents first). downgrade() walks this
# list in reverse.
TABLES_IN_ORDER: list[str] = [
    "organizations",
    "schools",
    "school_sites",
    "school_classes",
    "school_licenses",
    "school_memberships",
    "school_invite_codes",
    "access_grants",
    "device_recovery_codes",
    "device_registry",
    "modules",
    "lesson_blocks",
    "tasks",
    "physics_scenarios",
    "molecules",
    "reactions",
    "content_sources",
    "content_blocks",
    "content_qa_events",
    "ai_docs",
    "ai_knowledge",
    "user_progress_server",
]


def _now() -> sa.TextClause:
    return sa.text("now()")


def _jsonb(default: str) -> sa.TextClause:
    return sa.text(f"'{default}'::jsonb")


def _text_default(value: str) -> sa.TextClause:
    return sa.text(f"'{value}'::text")


def _empty_text_array() -> sa.TextClause:
    return sa.text("'{}'::text[]")


# --------------------------------------------------------------------------- #
# upgrade
# --------------------------------------------------------------------------- #


def upgrade() -> None:
    _create_extensions()
    _create_functions()

    _create_org_and_school_tables()
    _create_access_and_device_tables()
    _create_learning_tables()
    _create_science_tables()
    _create_content_tables()
    _create_ai_tables()
    _create_progress_tables()

    _create_triggers()


def _create_extensions() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public")


def _create_functions() -> None:
    for body in FUNCTIONS.values():
        op.execute(textwrap.dedent(body).strip())


def _create_triggers() -> None:
    for name, table, timing, function in TRIGGERS:
        op.execute(
            f"CREATE TRIGGER {name} {timing} ON public.{table} "
            f"FOR EACH ROW EXECUTE FUNCTION public.{function}()"
        )


# --- organizations / schools ------------------------------------------------ #


def _create_org_and_school_tables() -> None:
    op.create_table(
        "organizations",
        sa.Column("organization_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.PrimaryKeyConstraint("organization_id", name="organizations_pkey"),
    )

    op.create_table(
        "schools",
        sa.Column("school_id", sa.Text(), nullable=False),
        sa.Column("organization_id", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default=_text_default("active"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.organization_id"],
            name="schools_organization_id_fkey",
        ),
        sa.PrimaryKeyConstraint("school_id", name="schools_pkey"),
    )

    op.create_table(
        "school_sites",
        sa.Column("site_id", sa.Text(), nullable=False),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.school_id"], name="school_sites_school_id_fkey"),
        sa.PrimaryKeyConstraint("site_id", name="school_sites_pkey"),
    )

    op.create_table(
        "school_classes",
        sa.Column("class_id", sa.Text(), nullable=False),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("teacher_user_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.school_id"], name="school_classes_school_id_fkey"),
        sa.ForeignKeyConstraint(["site_id"], ["school_sites.site_id"], name="school_classes_site_id_fkey"),
        sa.PrimaryKeyConstraint("class_id", name="school_classes_pkey"),
    )

    op.create_table(
        "school_licenses",
        sa.Column("license_id", sa.Text(), nullable=False),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default=_text_default("active"), nullable=False),
        sa.Column("price_rub", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("starts_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("modules", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("features", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("limits", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(["school_id"], ["schools.school_id"], name="school_licenses_school_id_fkey"),
        sa.ForeignKeyConstraint(["site_id"], ["school_sites.site_id"], name="school_licenses_site_id_fkey"),
        sa.PrimaryKeyConstraint("license_id", name="school_licenses_pkey"),
    )

    op.create_table(
        "school_memberships",
        sa.Column("class_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("joined_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["class_id"], ["school_classes.class_id"], name="school_memberships_class_id_fkey"
        ),
        sa.ForeignKeyConstraint(["school_id"], ["schools.school_id"], name="school_memberships_school_id_fkey"),
        sa.ForeignKeyConstraint(["site_id"], ["school_sites.site_id"], name="school_memberships_site_id_fkey"),
        sa.PrimaryKeyConstraint("class_id", "user_id", name="school_memberships_pkey"),
    )
    op.create_index("idx_school_memberships_user", "school_memberships", ["user_id"])

    op.create_table(
        "school_invite_codes",
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("class_id", sa.Text(), nullable=True),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("teacher_user_id", sa.Text(), nullable=True),
        sa.Column("student_label", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=_text_default("pending"), nullable=False),
        sa.Column("max_activations", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("activations", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("activated_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("activated_by_user_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["class_id"], ["school_classes.class_id"], name="school_invite_codes_class_id_fkey"
        ),
        sa.ForeignKeyConstraint(["school_id"], ["schools.school_id"], name="school_invite_codes_school_id_fkey"),
        sa.ForeignKeyConstraint(["site_id"], ["school_sites.site_id"], name="school_invite_codes_site_id_fkey"),
        sa.PrimaryKeyConstraint("code", name="school_invite_codes_pkey"),
    )
    op.create_index("idx_school_invites_school_status", "school_invite_codes", ["school_id", "status"])


# --- access grants / devices ------------------------------------------------ #


def _create_access_and_device_tables() -> None:
    op.create_table(
        "access_grants",
        sa.Column("grant_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=_text_default("active"), nullable=False),
        sa.Column("organization_id", sa.Text(), nullable=True),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("license_id", sa.Text(), nullable=True),
        sa.Column("price_rub", sa.Integer(), nullable=True),
        sa.Column("plan", sa.Text(), nullable=True),
        sa.Column("module_id", sa.Text(), nullable=True),
        sa.Column("feature", sa.Text(), nullable=True),
        sa.Column("plans", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("modules", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("features", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("starts_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["license_id"], ["school_licenses.license_id"], name="access_grants_license_id_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.organization_id"],
            name="access_grants_organization_id_fkey",
        ),
        sa.ForeignKeyConstraint(["school_id"], ["schools.school_id"], name="access_grants_school_id_fkey"),
        sa.ForeignKeyConstraint(["site_id"], ["school_sites.site_id"], name="access_grants_site_id_fkey"),
        sa.PrimaryKeyConstraint("grant_id", name="access_grants_pkey"),
    )
    op.create_index("idx_access_grants_user", "access_grants", ["user_id"])

    op.create_table(
        "device_recovery_codes",
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("class_id", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=_text_default("pending"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("expires_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("used_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(
            ["class_id"], ["school_classes.class_id"], name="device_recovery_codes_class_id_fkey"
        ),
        sa.ForeignKeyConstraint(
            ["school_id"], ["schools.school_id"], name="device_recovery_codes_school_id_fkey"
        ),
        sa.PrimaryKeyConstraint("code", name="device_recovery_codes_pkey"),
    )

    op.create_table(
        "device_registry",
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("device_id", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("platform", sa.Text(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("trusted_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("user_id", "device_id", name="device_registry_pkey"),
    )
    op.create_index("idx_device_registry_user", "device_registry", ["user_id"])


# --- modules / lessons / tasks ---------------------------------------------- #


def _create_learning_tables() -> None:
    op.create_table(
        "modules",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), server_default=_text_default(""), nullable=False),
        sa.Column("available", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="modules_pkey"),
    )
    op.create_index(
        "idx_modules_available_sort",
        "modules",
        [sa.text("available DESC"), "sort_order"],
    )

    op.create_table(
        "lesson_blocks",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("module_id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), server_default=_text_default(""), nullable=False),
        sa.Column("difficulty", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("sort_order", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("tasks_json", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=True),
        sa.ForeignKeyConstraint(
            ["module_id"], ["modules.id"], name="lesson_blocks_module_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="lesson_blocks_pkey"),
    )
    op.create_index("idx_lesson_blocks_module_sort", "lesson_blocks", ["module_id", "sort_order"])
    op.create_index("idx_lesson_blocks_tasks_gin", "lesson_blocks", ["tasks_json"], postgresql_using="gin")
    op.create_index("lesson_blocks_module_idx", "lesson_blocks", ["module_id"])
    op.create_index("lesson_blocks_payload_gin", "lesson_blocks", ["payload"], postgresql_using="gin")

    op.create_table(
        "tasks",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("module_id", sa.Text(), nullable=False),
        sa.Column("lesson_id", sa.BigInteger(), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), server_default=_text_default(""), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=False),
        sa.Column("estimated_minutes", sa.Integer(), server_default=sa.text("5"), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("search_tsv", postgresql.TSVECTOR(), nullable=True),
        sa.CheckConstraint(
            "type = ANY (ARRAY['numeric'::text, 'quiz'::text, 'open'::text])",
            name="tasks_type_check",
        ),
        sa.ForeignKeyConstraint(
            ["lesson_id"], ["lesson_blocks.id"], name="tasks_lesson_id_fkey", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], name="tasks_module_id_fkey", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="tasks_pkey"),
    )
    op.create_index("idx_tasks_lesson", "tasks", ["lesson_id"])
    op.create_index("idx_tasks_module", "tasks", ["module_id"])
    op.create_index("idx_tasks_payload_gin", "tasks", ["payload"], postgresql_using="gin")
    op.create_index("idx_tasks_search_tsv", "tasks", ["search_tsv"], postgresql_using="gin")
    op.create_index("idx_tasks_tags_gin", "tasks", ["tags"], postgresql_using="gin")
    op.create_index("tasks_lesson_idx", "tasks", ["lesson_id"])
    op.create_index("tasks_module_idx", "tasks", ["module_id"])
    op.create_index("tasks_payload_gin", "tasks", ["payload"], postgresql_using="gin")
    op.create_index("tasks_tags_gin", "tasks", ["tags"], postgresql_using="gin")


# --- science cores ----------------------------------------------------------- #


def _create_science_tables() -> None:
    op.create_table(
        "physics_scenarios",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("module_id", sa.Text(), server_default=_text_default("physics"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), server_default=_text_default(""), nullable=False),
        sa.Column("data_json", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), server_default=_empty_text_array(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=True),
        sa.ForeignKeyConstraint(
            ["module_id"], ["modules.id"], name="physics_scenarios_module_id_fkey", ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name="physics_scenarios_pkey"),
    )
    op.create_index("idx_physics_scenarios_data_gin", "physics_scenarios", ["data_json"], postgresql_using="gin")
    op.create_index("idx_physics_scenarios_tags_gin", "physics_scenarios", ["tags"], postgresql_using="gin")
    op.create_index("physics_scenarios_payload_gin", "physics_scenarios", ["payload"], postgresql_using="gin")

    op.create_table(
        "molecules",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("formula", sa.Text(), server_default=_text_default(""), nullable=False),
        sa.Column("data_json", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), server_default=_empty_text_array(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("atoms", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=True),
        sa.PrimaryKeyConstraint("id", name="molecules_pkey"),
    )
    op.create_index("idx_molecules_data_gin", "molecules", ["data_json"], postgresql_using="gin")
    op.create_index(
        "idx_molecules_formula_trgm",
        "molecules",
        ["formula"],
        postgresql_using="gin",
        postgresql_ops={"formula": "public.gin_trgm_ops"},
    )
    op.create_index(
        "idx_molecules_name_trgm",
        "molecules",
        ["name"],
        postgresql_using="gin",
        postgresql_ops={"name": "public.gin_trgm_ops"},
    )
    op.create_index("idx_molecules_tags_gin", "molecules", ["tags"], postgresql_using="gin")
    op.create_index("molecules_atoms_gin", "molecules", ["atoms"], postgresql_using="gin")

    op.create_table(
        "reactions",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("equation", sa.Text(), server_default=_text_default(""), nullable=False),
        sa.Column("data_json", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("{}"), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), server_default=_empty_text_array(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("reactants", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=True),
        sa.Column("products", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=True),
        sa.PrimaryKeyConstraint("id", name="reactions_pkey"),
    )
    op.create_index("idx_reactions_data_gin", "reactions", ["data_json"], postgresql_using="gin")
    op.create_index("idx_reactions_tags_gin", "reactions", ["tags"], postgresql_using="gin")
    op.create_index(
        "idx_reactions_title_trgm",
        "reactions",
        ["title"],
        postgresql_using="gin",
        postgresql_ops={"title": "public.gin_trgm_ops"},
    )
    op.create_index("reactions_products_gin", "reactions", ["products"], postgresql_using="gin")
    op.create_index("reactions_reactants_gin", "reactions", ["reactants"], postgresql_using="gin")


# --- content + content QA ---------------------------------------------------- #


def _create_content_tables() -> None:
    op.create_table(
        "content_sources",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("title_ru", sa.Text(), nullable=False),
        sa.Column("organization_ru", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("license_status", sa.Text(), server_default=_text_default("unknown"), nullable=False),
        sa.Column("usage_ru", sa.Text(), nullable=True),
        sa.Column("trust_level", sa.Text(), server_default=_text_default("unverified"), nullable=False),
        sa.Column("accessed_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="content_sources_pkey"),
    )

    op.create_table(
        "content_blocks",
        sa.Column("id", sa.Text(), nullable=False),
        sa.Column("subject", sa.Text(), nullable=False),
        sa.Column("level", sa.Text(), server_default=_text_default("school"), nullable=False),
        sa.Column("grade", sa.Text(), nullable=True),
        sa.Column("program_type", sa.Text(), server_default=_text_default("base"), nullable=False),
        sa.Column("textbook_reference_type", sa.Text(), server_default=_text_default("none"), nullable=False),
        sa.Column("section", sa.Text(), nullable=False),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=False),
        sa.Column("difficulty", sa.Text(), server_default=_text_default("basic"), nullable=False),
        sa.Column("title_ru", sa.Text(), nullable=False),
        sa.Column("body_ru", sa.Text(), nullable=False),
        sa.Column("source_list", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("license_status", sa.Text(), server_default=_text_default("unknown"), nullable=False),
        sa.Column("legal_status", sa.Text(), server_default=_text_default("pending"), nullable=False),
        sa.Column("verified_by", sa.Text(), nullable=True),
        sa.Column("reviewed_by", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.Column("publish_status", sa.Text(), server_default=_text_default("draft"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="content_blocks_pkey"),
    )
    op.create_index("idx_content_blocks_publish_status", "content_blocks", ["publish_status"])
    op.create_index("idx_content_blocks_subject_topic", "content_blocks", ["subject", "topic"])

    op.create_table(
        "content_qa_events",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("content_id", sa.Text(), nullable=False),
        sa.Column("from_status", sa.Text(), nullable=True),
        sa.Column("to_status", sa.Text(), nullable=False),
        sa.Column("actor", sa.Text(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["content_id"],
            ["content_blocks.id"],
            name="content_qa_events_content_id_fkey",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="content_qa_events_pkey"),
    )
    op.create_index("idx_content_qa_events_content_id", "content_qa_events", ["content_id"])


# --- AI knowledge ------------------------------------------------------------ #


def _create_ai_tables() -> None:
    op.create_table(
        "ai_docs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("lang", sa.Text(), server_default=_text_default("ru"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=True),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="ai_docs_pkey"),
    )
    op.create_index("idx_ai_docs_subject_lang", "ai_docs", ["subject", "lang"])
    op.create_index("idx_ai_docs_updated_at", "ai_docs", [sa.text("updated_at DESC")])
    op.create_index("uq_ai_docs_subject_lang_title", "ai_docs", ["subject", "lang", "title"], unique=True)

    op.create_table(
        "ai_knowledge",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("source", sa.Text(), server_default=_text_default("seed"), nullable=False),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), server_default=_jsonb("[]"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.Text(), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("search_tsv", postgresql.TSVECTOR(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("lang", sa.Text(), server_default=_text_default("ru"), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("pack_id", sa.Text(), nullable=True),
        sa.Column("pack_version", sa.Integer(), nullable=True),
        sa.Column("external_id", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=True),
        sa.Column("tsv", postgresql.TSVECTOR(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="ai_knowledge_pkey"),
        sa.UniqueConstraint("pack_id", "external_id", name="ai_knowledge_pack_external_id_uk"),
    )
    op.create_index("ai_knowledge_content_hash_idx", "ai_knowledge", ["content_hash"])
    op.create_index("ai_knowledge_lang_idx", "ai_knowledge", ["lang"])
    op.create_index("ai_knowledge_pack_idx", "ai_knowledge", ["pack_id", "pack_version"])
    op.create_index("ai_knowledge_subject_idx", "ai_knowledge", ["subject"])
    op.create_index("ai_knowledge_tags_gin", "ai_knowledge", ["tags"], postgresql_using="gin")
    op.create_index("ai_knowledge_tsv_gin", "ai_knowledge", ["tsv"], postgresql_using="gin")
    op.create_index("idx_ai_knowledge_search_tsv", "ai_knowledge", ["search_tsv"], postgresql_using="gin")
    op.create_index("idx_ai_knowledge_source", "ai_knowledge", ["source"])
    op.create_index("idx_ai_knowledge_tags", "ai_knowledge", ["tags"], postgresql_using="gin")
    op.create_index("idx_ai_knowledge_tags_gin", "ai_knowledge", ["tags"], postgresql_using="gin")
    op.create_index(
        "idx_ai_knowledge_title_trgm",
        "ai_knowledge",
        ["title"],
        postgresql_using="gin",
        postgresql_ops={"title": "public.gin_trgm_ops"},
    )


# --- progress ---------------------------------------------------------------- #


def _create_progress_tables() -> None:
    op.create_table(
        "user_progress_server",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("device_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("module_id", sa.Text(), nullable=False),
        sa.Column("lesson_id", sa.Text(), nullable=True),
        sa.Column("task_id", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), server_default=_text_default("done"), nullable=False),
        sa.Column(
            "score",
            postgresql.DOUBLE_PRECISION(precision=53),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("time_spent_sec", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("answer_json", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=_now(), nullable=False),
        sa.Column("synced_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("completed", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("last_answer", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="user_progress_server_pkey"),
        sa.UniqueConstraint("device_id", "task_id", name="user_progress_server_device_id_task_id_key"),
    )
    op.create_index("idx_user_progress_device", "user_progress_server", ["device_id"])
    op.create_index("idx_user_progress_server_device", "user_progress_server", ["device_id"])
    op.create_index("idx_user_progress_server_task", "user_progress_server", ["task_id"])
    op.create_index("idx_user_progress_server_updated", "user_progress_server", ["updated_at"])
    op.create_index("idx_user_progress_task", "user_progress_server", ["task_id"])
    op.create_index("idx_user_progress_updated", "user_progress_server", [sa.text("updated_at DESC")])


# --------------------------------------------------------------------------- #
# downgrade
# --------------------------------------------------------------------------- #


def downgrade() -> None:
    for name, table, _timing, _function in TRIGGERS:
        op.execute(f"DROP TRIGGER IF EXISTS {name} ON public.{table}")

    for table in reversed(TABLES_IN_ORDER):
        op.drop_table(table)

    for name in FUNCTIONS:
        op.execute(f"DROP FUNCTION IF EXISTS public.{name}()")

    op.execute("DROP EXTENSION IF EXISTS pgcrypto")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
