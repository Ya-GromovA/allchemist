"""Compatibility shim. The model lives in ``app.models.progress``.

See the note in ``app/models/user_progress.py``: this module used to declare a
second, conflicting declarative class on ``user_progress_server``. It now
re-exports the single real model so that two mappers can never fight over one
table again.
"""

from __future__ import annotations

from app.models.progress import UserProgressServer

UserProgress = UserProgressServer

__all__ = ["UserProgress", "UserProgressServer"]
