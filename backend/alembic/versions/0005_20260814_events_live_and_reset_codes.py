"""password reset codes, telemetry, learning events, live lessons

Revision ``0002`` moved identity into the database and listed, by name, the
collections it deliberately left in ``backend/data/user_state.json`` because
they had no schema: telemetry, learning events, live lessons, billing. "No
schema" was never a reason, only a description of missing work. This revision
removes three of the four; billing follows in ``0006``.

password_reset_codes
    A reset code issued by an administrator so a pupil can set a new password.
    It lived in a JSON map keyed by an opaque ``pwd_reset_*`` id, and a code was
    found by scanning every row for a matching hash. Here the hash is indexed
    and unique among live codes, and ``status`` is constrained, so "used" and
    "expired" cannot be invented by a typo. Only the SHA-256 of the code is
    stored: an operator with database access must not be able to read a live
    reset code.

telemetry_events
    Product telemetry from the clients. ``user_id`` is deliberately plain text
    with no foreign key -- telemetry is pseudonymous product analytics and must
    not create a referential dependency that stands between a person and the
    deletion of their account.

learning_events
    An attempt at a task: the record from which progress is recomputed. This is
    what the product rule "прогресс считается только по подтверждённым
    результатам" is enforced against, so outcome, scenario/engine versions and
    integrity flags are columns rather than free-form JSON. ``client_event_id``
    is unique: a mobile client retrying an upload must not double-count an
    attempt -- which the JSON append could not prevent.

live_sessions / live_session_participants / live_session_events
    A teacher's live lesson and what happened in it. The JSON version nested the
    roster and the per-task tallies inside the session object and recomputed
    them on every write. Both are derivable from the events, so only the events
    are stored and the aggregates are queries. ``studentsJoined`` is gone as a
    stored field: it was a counter that could disagree with the roster beside it.

On mutability of the event tables
---------------------------------
``audit_log`` and ``auth_attempt_events`` are strictly append-only: no UPDATE,
no DELETE, enforced by ``public.reject_mutation()``. That is right for an audit
trail and wrong for these three tables, because §5 of the delivery contract
requires a working erasure mechanism and every event table needs a retention
job. So the trigger here rejects UPDATE only. History cannot be rewritten --
which is what makes an event stream evidence -- while retention and the right to
erasure can still remove rows. The distinction is deliberate, not an oversight.

No data is moved here. The import is a separate, verifiable step
(``app.scripts.migrate_user_state_to_db``) that reports counts before and after.

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None

JSONB = postgresql.JSONB(astext_type=sa.Text())
TZ = sa.DateTime(timezone=True)

RESET_STATUSES = ("pending", "used", "expired", "revoked")
LIVE_STATUSES = ("scheduled", "active", "ended", "cancelled")
OUTCOMES = ("correct", "wrong", "pending")

# Tables whose rows may be inserted and eventually removed, but never edited.
INSERT_ONLY_TABLES = ("telemetry_events", "learning_events", "live_session_events")


def _in_list(column: str, values: tuple[str, ...]) -> str:
    rendered = ", ".join(f"'{value}'::text" for value in values)
    return f"{column} = ANY (ARRAY[{rendered}])"


def upgrade() -> None:
    # ------------------------------------------------------------------ #
    # Password reset codes
    # ------------------------------------------------------------------ #
    op.create_table(
        "password_reset_codes",
        sa.Column("reset_id", sa.Text(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code_hash", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'pending'")),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", TZ, nullable=False),
        sa.Column("used_at", TZ, nullable=True),
        sa.Column("created_by", sa.Text(), nullable=True),
        sa.CheckConstraint(
            _in_list("status", RESET_STATUSES), name="password_reset_codes_status_check"
        ),
        sa.CheckConstraint(
            "(status <> 'used'::text) OR (used_at IS NOT NULL)",
            name="password_reset_codes_used_at_check",
        ),
    )
    op.create_index("idx_password_reset_codes_user", "password_reset_codes", ["user_id"])
    # Spent and expired rows are kept for audit, so uniqueness of the hash is
    # partial: only one *live* code may carry a given hash.
    op.create_index(
        "uq_password_reset_codes_pending_hash",
        "password_reset_codes",
        ["code_hash"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'::text"),
    )

    # ------------------------------------------------------------------ #
    # Telemetry
    # ------------------------------------------------------------------ #
    op.create_table(
        "telemetry_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("event_name", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=True),
        sa.Column("device_id", sa.Text(), nullable=True),
        sa.Column("session_id", sa.Text(), nullable=True),
        sa.Column("app_version", sa.Text(), nullable=True),
        sa.Column("platform", sa.Text(), nullable=True),
        sa.Column("occurred_at", TZ, nullable=True),
        sa.Column("received_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.Column("payload", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
    )
    op.create_index(
        "idx_telemetry_events_received", "telemetry_events", [sa.text("received_at DESC")]
    )
    op.create_index("idx_telemetry_events_name", "telemetry_events", ["event_name"])
    op.create_index("idx_telemetry_events_user", "telemetry_events", ["user_id"])

    # ------------------------------------------------------------------ #
    # Learning events
    # ------------------------------------------------------------------ #
    op.create_table(
        "learning_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("client_event_id", sa.Text(), nullable=True),
        sa.Column(
            "user_id",
            sa.Text(),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("live_session_id", sa.Text(), nullable=True),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column("lesson_id", sa.Text(), nullable=True),
        sa.Column("task_id", sa.Text(), nullable=True),
        sa.Column("classroom", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("mistake_tag", sa.Text(), nullable=True),
        sa.Column("duration_sec", sa.Numeric(10, 3), nullable=True),
        sa.Column("scenario_version", sa.Text(), nullable=True),
        sa.Column("engine_version", sa.Text(), nullable=True),
        sa.Column("integrity_flags", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("payload", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("occurred_at", TZ, nullable=True),
        sa.Column("received_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "outcome IS NULL OR " + _in_list("outcome", OUTCOMES),
            name="learning_events_outcome_check",
        ),
    )
    op.create_index(
        "uq_learning_events_client_id",
        "learning_events",
        ["client_event_id"],
        unique=True,
        postgresql_where=sa.text("client_event_id IS NOT NULL"),
    )
    op.create_index("idx_learning_events_user", "learning_events", ["user_id"])
    op.create_index(
        "idx_learning_events_received", "learning_events", [sa.text("received_at DESC")]
    )
    op.create_index("idx_learning_events_session", "learning_events", ["live_session_id"])

    # ------------------------------------------------------------------ #
    # Live lessons
    # ------------------------------------------------------------------ #
    op.create_table(
        "live_sessions",
        sa.Column("session_id", sa.Text(), primary_key=True),
        sa.Column(
            "teacher_user_id",
            sa.Text(),
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("school_id", sa.Text(), sa.ForeignKey("schools.school_id"), nullable=True),
        sa.Column("class_id", sa.Text(), sa.ForeignKey("school_classes.class_id"), nullable=True),
        sa.Column("title", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("module_id", sa.Text(), nullable=True),
        sa.Column("lesson_id", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default=sa.text("'active'")),
        sa.Column("join_code", sa.Text(), nullable=True),
        sa.Column("created_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", TZ, nullable=True),
        sa.Column("ended_at", TZ, nullable=True),
        sa.Column("updated_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.Column("roster", JSONB, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.CheckConstraint(_in_list("status", LIVE_STATUSES), name="live_sessions_status_check"),
        sa.CheckConstraint(
            "(status <> 'ended'::text) OR (ended_at IS NOT NULL)",
            name="live_sessions_ended_at_check",
        ),
    )
    op.create_index("idx_live_sessions_teacher", "live_sessions", ["teacher_user_id"])
    op.create_index("idx_live_sessions_status", "live_sessions", ["status"])
    # A join code identifies exactly one lesson while that lesson is running.
    # Reusing it afterwards is fine and is how short human-typed codes stay short.
    op.create_index(
        "uq_live_sessions_join_code",
        "live_sessions",
        ["join_code"],
        unique=True,
        postgresql_where=sa.text("join_code IS NOT NULL AND status = 'active'::text"),
    )

    op.create_table(
        "live_session_participants",
        sa.Column(
            "session_id",
            sa.Text(),
            sa.ForeignKey("live_sessions.session_id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("user_id", sa.Text(), primary_key=True),
        sa.Column("classroom", sa.Text(), nullable=True),
        sa.Column("role_key", sa.Text(), nullable=True),
        sa.Column("roster_matched", sa.Boolean(), nullable=True),
        sa.Column("joined_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.Column("last_seen_at", TZ, nullable=True),
    )
    op.create_index("idx_live_session_participants_user", "live_session_participants", ["user_id"])

    op.create_table(
        "live_session_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column(
            "session_id",
            sa.Text(),
            sa.ForeignKey("live_sessions.session_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("student_user_id", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column("task_id", sa.Text(), nullable=False, server_default=sa.text("'unknown'")),
        sa.Column("lesson_id", sa.Text(), nullable=False, server_default=sa.text("'general'")),
        sa.Column("classroom", sa.Text(), nullable=True),
        sa.Column("mistake_tag", sa.Text(), nullable=True),
        sa.Column("source", sa.Text(), nullable=False, server_default=sa.text("'learning_event'")),
        sa.Column("occurred_at", TZ, nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            _in_list("outcome", OUTCOMES), name="live_session_events_outcome_check"
        ),
    )
    op.create_index(
        "idx_live_session_events_session",
        "live_session_events",
        ["session_id", sa.text("occurred_at DESC")],
    )
    op.create_index("idx_live_session_events_student", "live_session_events", ["student_user_id"])

    for table_name in INSERT_ONLY_TABLES:
        op.execute(
            f"CREATE TRIGGER {table_name}_no_update BEFORE UPDATE ON public.{table_name} "
            f"FOR EACH STATEMENT EXECUTE FUNCTION public.reject_mutation()"
        )


def downgrade() -> None:
    for table_name in INSERT_ONLY_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS {table_name}_no_update ON public.{table_name}")
    op.drop_table("live_session_events")
    op.drop_table("live_session_participants")
    op.drop_table("live_sessions")
    op.drop_table("learning_events")
    op.drop_table("telemetry_events")
    op.drop_table("password_reset_codes")
