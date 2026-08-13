"""Compatibility shim for the old ``UserProgress`` import path.

Until 2026-08-14 this module and ``app/db/user_progress.py`` each declared a
*separate* declarative class on the same table, ``user_progress_server``, with
columns that table has never had (``external_user_id``, ``subject``,
``lesson_block_id``, ``synced``). Nothing queried through them -- the sync
endpoint uses hand-written SQL -- so the mismatch was invisible, and
``Base.metadata.create_all()`` in ``app/db/init_db.py`` would have created a
wrong table on any empty database.

Both classes are now the one real model, ``app.models.progress.UserProgressServer``,
which matches production column for column. The alias is kept so existing
imports keep working; new code should import ``UserProgressServer`` directly.
"""

from __future__ import annotations

from app.models.progress import UserProgressServer

UserProgress = UserProgressServer

__all__ = ["UserProgress", "UserProgressServer"]
