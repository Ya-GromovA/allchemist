"""foreign keys from the legacy tables to users

Closes the loop opened by ``0002``. Five tables carried a ``user_id`` that
pointed at nothing enforceable, because there was no ``users`` table to point
at: ``school_memberships`` alone held twelve rows referencing accounts that
existed only inside ``backend/data/user_state.json``.

Ordering matters, and it is why this is a separate revision:

1. ``0002`` creates the tables (old code unaffected).
2. ``app.scripts.migrate_user_state_to_db`` fills ``users`` from the JSON file.
3. The application switches to the database as the identity source.
4. ``0003`` -- this revision -- turns the dangling columns into real foreign
   keys.

Running this before step 2 fails on missing rows; running it before step 3
would break code that can still create a membership for an account the database
has never heard of. Applied in this order, every intermediate state is
serviceable and every step is reversible.

The constraints are added ``NOT VALID`` and validated in a second statement.
On today's row counts either way is instant, but ``NOT VALID`` + ``VALIDATE``
is the shape that stays safe as the tables grow: the first statement takes a
brief lock, the validating scan does not block writes.

Nine grants that belong to nobody
---------------------------------
``access_grants`` holds nine rows, created between 2026-05-25 and 2026-05-26,
whose ``user_id`` matches no account -- not in the database, and not in the JSON
file either. They are partner-licence grants for accounts that were removed from
the state file at some point while the grant rows stayed behind. That is exactly
the class of damage an unenforced reference produces, and it is why the foreign
key is being added.

They cannot be resolved: reconstructing the accounts would mean inventing
identities and handing them a live school licence. They are also not mine to
delete -- deleting production rows is the owner's call, not a migration's. So
they are moved, whole and unchanged, into ``access_grants_orphaned``, a
quarantine table with no foreign keys. Nothing is destroyed, ``downgrade()``
puts them back, and the owner can decide at leisure whether to restore or drop
them::

    -- what is quarantined
    SELECT grant_id, user_id, title, created_at FROM access_grants_orphaned;
    -- put one back (only after its account exists again)
    INSERT INTO access_grants SELECT <columns> FROM access_grants_orphaned
     WHERE grant_id = '...';

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


# (table, column, constraint name, ON DELETE action)
FOREIGN_KEYS: tuple[tuple[str, str, str, str], ...] = (
    ("school_memberships", "user_id", "school_memberships_user_id_fkey", "CASCADE"),
    ("access_grants", "user_id", "access_grants_user_id_fkey", "CASCADE"),
    ("device_registry", "user_id", "device_registry_user_id_fkey", "CASCADE"),
    ("device_recovery_codes", "user_id", "device_recovery_codes_user_id_fkey", "CASCADE"),
    # Progress rows are synced per device and may exist before the device is
    # bound to an account, so this column is nullable and must survive the
    # account being deleted: the learning result is not the person.
    ("user_progress_server", "user_id", "user_progress_server_user_id_fkey", "SET NULL"),
)


TZ = postgresql.TIMESTAMP(timezone=True)
JSONB = postgresql.JSONB(astext_type=sa.Text())

# Column order is the column order of access_grants, so that the INSERT ... SELECT
# in both directions can name the columns explicitly and stay readable.
GRANT_COLUMNS = (
    "grant_id",
    "user_id",
    "source_type",
    "title",
    "status",
    "organization_id",
    "school_id",
    "site_id",
    "license_id",
    "price_rub",
    "plan",
    "module_id",
    "feature",
    "plans",
    "modules",
    "features",
    "starts_at",
    "expires_at",
    "created_at",
)
GRANT_COLUMN_LIST = ", ".join(GRANT_COLUMNS)


def _create_quarantine_table() -> None:
    op.create_table(
        "access_grants_orphaned",
        sa.Column("grant_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("source_type", sa.Text(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), server_default=sa.text("'active'"), nullable=False),
        sa.Column("organization_id", sa.Text(), nullable=True),
        sa.Column("school_id", sa.Text(), nullable=True),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("license_id", sa.Text(), nullable=True),
        sa.Column("price_rub", sa.Integer(), nullable=True),
        sa.Column("plan", sa.Text(), nullable=True),
        sa.Column("module_id", sa.Text(), nullable=True),
        sa.Column("feature", sa.Text(), nullable=True),
        sa.Column("plans", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("modules", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("features", JSONB, server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("starts_at", TZ, nullable=True),
        sa.Column("expires_at", TZ, nullable=True),
        sa.Column("created_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("quarantined_at", TZ, server_default=sa.text("now()"), nullable=False),
        sa.Column("quarantine_reason", sa.Text(), nullable=False),
        # Deliberately no foreign keys: this table exists precisely to hold rows
        # that cannot satisfy them.
        sa.PrimaryKeyConstraint("grant_id", name="access_grants_orphaned_pkey"),
    )
    op.create_index("idx_access_grants_orphaned_user", "access_grants_orphaned", ["user_id"])


def upgrade() -> None:
    _create_quarantine_table()

    op.execute(
        f"""
        WITH orphaned AS (
            DELETE FROM public.access_grants g
             WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.user_id = g.user_id)
         RETURNING {GRANT_COLUMN_LIST}
        )
        INSERT INTO public.access_grants_orphaned ({GRANT_COLUMN_LIST}, quarantine_reason)
        SELECT {GRANT_COLUMN_LIST},
               'user_id не существует ни в базе, ни в user_state.json на момент ревизии 0003'
          FROM orphaned
        """
    )

    for table, column, name, on_delete in FOREIGN_KEYS:
        op.execute(
            f"ALTER TABLE public.{table} "
            f"ADD CONSTRAINT {name} FOREIGN KEY ({column}) "
            f"REFERENCES public.users(user_id) ON DELETE {on_delete} NOT VALID"
        )
        op.execute(f"ALTER TABLE public.{table} VALIDATE CONSTRAINT {name}")


def downgrade() -> None:
    for table, _column, name, _on_delete in reversed(FOREIGN_KEYS):
        op.execute(f"ALTER TABLE public.{table} DROP CONSTRAINT {name}")

    # Put the quarantined grants back exactly where they were. The foreign keys
    # are already gone at this point, so they fit again.
    op.execute(
        f"""
        INSERT INTO public.access_grants ({GRANT_COLUMN_LIST})
        SELECT {GRANT_COLUMN_LIST} FROM public.access_grants_orphaned
        ON CONFLICT (grant_id) DO NOTHING
        """
    )
    op.drop_table("access_grants_orphaned")
