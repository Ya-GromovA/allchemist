"""Password recovery codes.

Kept out of ``identity.py`` because the lifecycle is different: an identity row
lives as long as the account, a recovery code lives for at most a week and then
becomes evidence that a reset happened. Mixing the two in one module made it
easy to forget that the second needs a status machine.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

TZ = DateTime(timezone=True)

__all__ = ["PasswordResetCode", "RESET_CODE_STATUSES"]

RESET_CODE_STATUSES = ("pending", "used", "expired", "revoked")


class PasswordResetCode(Base):
    """A one-shot code that lets one account set a new password.

    Only the SHA-256 of the code is stored. The plaintext exists exactly twice:
    in the response handed to the administrator who issued it, and in whatever
    the administrator tells the pupil. It is never written down here.
    """

    __tablename__ = "password_reset_codes"

    reset_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    code_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(TZ, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status = ANY (ARRAY['pending'::text, 'used'::text, 'expired'::text, 'revoked'::text])",
            name="password_reset_codes_status_check",
        ),
        CheckConstraint(
            "(status <> 'used'::text) OR (used_at IS NOT NULL)",
            name="password_reset_codes_used_at_check",
        ),
        Index("idx_password_reset_codes_user", "user_id"),
        Index(
            "uq_password_reset_codes_pending_hash",
            "code_hash",
            unique=True,
            postgresql_where=text("status = 'pending'::text"),
        ),
    )
