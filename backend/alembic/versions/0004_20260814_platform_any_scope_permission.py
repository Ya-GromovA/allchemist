"""platform:any_scope permission

Splits "this role is not tied to a school" from "this role may act anywhere".

Revision ``0002`` migrated the legacy ``role_overrides`` map into global-scoped
``role_assignments`` -- correctly, because those roles genuinely are not tied to
a school. Forty-four accounts got one, most of them pupils and parents.

The first cut of the access engine then read ``scope_type = 'global'`` as
platform-wide authority, which made every one of those forty-four accounts able
to skip the ownership, tenant and scope links. The negative tests caught it: a
parent with no link to a child was granted that child's cabinet. Two different
ideas had been given one name.

They are separated here. Scope stays a statement about *where a role applies*.
Authority to reach outside one's own scope becomes an ordinary permission,
granted to ``admin`` and ``owner`` and to nobody else -- so it is visible in the
same matrix as every other permission, auditable, and revocable without a code
change.

``support`` deliberately does not get it: the support role can open the admin
panel, which is a different and narrower thing than being able to read any
pupil's data in any school. Nothing regresses, because the engine that consumes
this permission ships in the same change.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-14
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

PERMISSION_KEY = "platform:any_scope"
GRANTED_TO = ("admin", "owner")


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            "INSERT INTO permissions (permission_key, title_ru, description_ru, category) "
            "VALUES (:key, :title, :description, 'admin')"
        ),
        {
            "key": PERMISSION_KEY,
            "title": "Действие вне своей области",
            "description": (
                "Позволяет работать с объектами любой школы, класса и любого "
                "пользователя. Выдаётся только платформенным ролям."
            ),
        },
    )
    connection.execute(
        sa.text(
            "INSERT INTO role_permissions (role_key, permission_key, effect) "
            "VALUES (:role_key, :permission_key, 'allow')"
        ),
        [{"role_key": role_key, "permission_key": PERMISSION_KEY} for role_key in GRANTED_TO],
    )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text("DELETE FROM role_permissions WHERE permission_key = :key"),
        {"key": PERMISSION_KEY},
    )
    connection.execute(
        sa.text("DELETE FROM permissions WHERE permission_key = :key"), {"key": PERMISSION_KEY}
    )
