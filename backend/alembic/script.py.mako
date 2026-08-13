"""${message}

Write this revision BY HAND against the real schema.
`alembic revision --autogenerate` is blocked in alembic/env.py: the SQLAlchemy
model layer is not the migration authority for this project, the production
schema is. Verify every revision by applying it to a throwaway database and
diffing the resulting schema against a restored production clone.

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
${imports if imports else ""}
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "raise NotImplementedError('write the upgrade by hand')"}


def downgrade() -> None:
    ${downgrades if downgrades else "raise NotImplementedError('write the downgrade by hand')"}
