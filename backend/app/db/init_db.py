"""Schema readiness check. Creates nothing.

History, because it explains the shape of this module
-----------------------------------------------------
``init_db()`` used to call ``Base.metadata.create_all()`` plus a handful of
hand-written ``CREATE TABLE IF NOT EXISTS`` statements. That was survivable only
because the model layer was a stub: one class, on a table that already existed,
with columns that table never had. ``create_all()`` therefore had nothing to
create, and the function looked harmless.

On 2026-08-14 the model layer became complete -- forty-four tables, matching the
schema exactly. The same ``init_db()`` call, from
``tests/test_content_platform_catalog.py``, promptly created
``access_grants_orphaned`` in **production**, ahead of the migration that owns
it, and the next ``alembic upgrade`` failed with ``relation already exists``.

Nothing was damaged: the table was empty and the migration recreates it. But the
lesson is not "be careful with that test". A serving process, or a test, that can
issue DDL against production will eventually issue the wrong DDL. Since the
Alembic baseline (revision 0001) the schema has exactly one owner, and it is not
this module.

So ``init_db()`` no longer creates anything. It verifies -- that the migration
chain has been applied and that every table the models expect is present -- and
raises if not. Callers that used it to bootstrap now get a clear failure telling
them to run the migrations, which is the honest answer.
"""

from __future__ import annotations

from sqlalchemy import inspect, text

from app.db.base import Base
from app.db.session import engine

import app.models  # noqa: F401  -- registers every table on Base.metadata

__all__ = ["SchemaNotReady", "init_db", "verify_schema"]


class SchemaNotReady(RuntimeError):
    """The database is not at the schema the application expects."""


def verify_schema() -> dict[str, object]:
    """Check the database against the model layer. Never modifies anything.

    Returns a small summary on success; raises :class:`SchemaNotReady` with an
    actionable message otherwise.
    """
    inspector = inspect(engine)
    present = set(inspector.get_table_names())
    expected = {table.name for table in Base.metadata.sorted_tables}

    missing = sorted(expected - present)
    if missing:
        raise SchemaNotReady(
            "В базе нет таблиц, которые ожидает модельный слой: "
            + ", ".join(missing)
            + ". Примените миграции: alembic upgrade head."
        )

    with engine.connect() as connection:
        if "alembic_version" not in present:
            raise SchemaNotReady(
                "В базе нет таблицы alembic_version. Схема не находится под "
                "управлением миграций; выполните alembic upgrade head."
            )
        revision = connection.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar_one_or_none()

    if not revision:
        raise SchemaNotReady(
            "Таблица alembic_version пуста. Выполните alembic upgrade head."
        )

    return {"revision": revision, "tables": len(expected)}


def init_db() -> None:
    """Kept for the existing call sites. Verifies; does not create."""
    verify_schema()
