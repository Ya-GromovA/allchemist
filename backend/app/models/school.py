"""Typed SQLAlchemy 2 models for the school / tenancy / entitlement tables.

These describe the production schema verbatim (see the authority note in
``app/models/content.py``). The foreign keys that tie ``user_id`` columns to the
new ``users`` table are added by revision ``0003`` -- after the JSON state has
been migrated -- and are declared here from the start so that the model layer
and the final schema agree.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

TZ = DateTime(timezone=True)

__all__ = [
    "AccessGrant",
    "AccessGrantOrphaned",
    "DeviceRecoveryCode",
    "DeviceRegistryEntry",
    "Organization",
    "School",
    "SchoolClass",
    "SchoolInviteCode",
    "SchoolLicense",
    "SchoolMembership",
    "SchoolSite",
]


class Organization(Base):
    """Top tenant: a school network or a single legal entity."""

    __tablename__ = "organizations"

    organization_id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    schools: Mapped[list["School"]] = relationship(back_populates="organization")


class School(Base):
    """A school inside an organization. The tenant boundary for teachers and pupils."""

    __tablename__ = "schools"

    school_id: Mapped[str] = mapped_column(Text, primary_key=True)
    organization_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("organizations.organization_id"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    organization: Mapped[Optional["Organization"]] = relationship(back_populates="schools")
    sites: Mapped[list["SchoolSite"]] = relationship(back_populates="school")
    classes: Mapped[list["SchoolClass"]] = relationship(back_populates="school")
    licenses: Mapped[list["SchoolLicense"]] = relationship(back_populates="school")


class SchoolSite(Base):
    """A physical campus of a school."""

    __tablename__ = "school_sites"

    site_id: Mapped[str] = mapped_column(Text, primary_key=True)
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    school: Mapped[Optional["School"]] = relationship(back_populates="sites")


class SchoolClass(Base):
    """A teaching group. The finest access scope below a site."""

    __tablename__ = "school_classes"

    class_id: Mapped[str] = mapped_column(Text, primary_key=True)
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    site_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_sites.site_id"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    teacher_user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    school: Mapped[Optional["School"]] = relationship(back_populates="classes")
    memberships: Mapped[list["SchoolMembership"]] = relationship(back_populates="school_class")


class SchoolLicense(Base):
    """Commercial licence held by a school or a site. Gates modules and features."""

    __tablename__ = "school_licenses"

    license_id: Mapped[str] = mapped_column(Text, primary_key=True)
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    site_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_sites.site_id"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    price_rub: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    starts_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    modules: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    features: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    limits: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    school: Mapped[Optional["School"]] = relationship(back_populates="licenses")


class SchoolMembership(Base):
    """Who belongs to which class, in which role.

    This is the ownership link the access chain walks for the ``school`` and
    ``class`` scopes.
    """

    __tablename__ = "school_memberships"

    class_id: Mapped[str] = mapped_column(
        Text, ForeignKey("school_classes.class_id"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    site_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_sites.site_id"), nullable=True
    )
    joined_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    school_class: Mapped["SchoolClass"] = relationship(back_populates="memberships")

    __table_args__ = (Index("idx_school_memberships_user", "user_id"),)


class SchoolInviteCode(Base):
    """Invitation channel for school-scoped onboarding.

    This is the platform's single invitation table: a code carries the role and
    the scope (school / site / class) it grants on activation. There is no
    second, parallel "invitations" table -- one concept, one place.
    """

    __tablename__ = "school_invite_codes"

    code: Mapped[str] = mapped_column(Text, primary_key=True)
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    site_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_sites.site_id"), nullable=True
    )
    class_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_classes.class_id"), nullable=True
    )
    role: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    teacher_user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    student_label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    max_activations: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    activations: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    expires_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    activated_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    activated_by_user_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    created_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (Index("idx_school_invites_school_status", "school_id", "status"),)


class AccessGrant(Base):
    """A concrete grant of plans / modules / features to one user.

    The grant is the licence link of the access chain: it names the licence,
    the tenant it came from, and the window it is valid in.
    """

    __tablename__ = "access_grants"

    grant_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    organization_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("organizations.organization_id"), nullable=True
    )
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    site_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_sites.site_id"), nullable=True
    )
    license_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_licenses.license_id"), nullable=True
    )
    price_rub: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    module_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plans: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    modules: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    features: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    starts_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())

    __table_args__ = (Index("idx_access_grants_user", "user_id"),)


class AccessGrantOrphaned(Base):
    """Quarantine for grants whose owner no longer exists.

    Nine production rows granted a school licence to accounts that are present
    neither in the database nor in the JSON state file. Revision ``0003`` moves
    them here instead of deleting them, so that adding the foreign key destroys
    nothing and stays reversible. Nothing reads this table at runtime -- it is a
    holding area for a decision the owner has yet to make.
    """

    __tablename__ = "access_grants_orphaned"

    grant_id: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'active'"))
    organization_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    school_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    site_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    license_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_rub: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    module_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    feature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plans: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    modules: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    features: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    starts_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    quarantined_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    quarantine_reason: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (Index("idx_access_grants_orphaned_user", "user_id"),)


class DeviceRegistryEntry(Base):
    """A device trusted for one user. Device limits are enforced per role."""

    __tablename__ = "device_registry"

    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )
    device_id: Mapped[str] = mapped_column(Text, primary_key=True)
    label: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    platform: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    trusted_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    last_seen_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)

    __table_args__ = (Index("idx_device_registry_user", "user_id"),)


class DeviceRecoveryCode(Base):
    """One-shot code issued by a teacher so a pupil can re-bind a lost device."""

    __tablename__ = "device_recovery_codes"

    code: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[str] = mapped_column(
        Text, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )
    school_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("schools.school_id"), nullable=True
    )
    class_id: Mapped[Optional[str]] = mapped_column(
        Text, ForeignKey("school_classes.class_id"), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'pending'"))
    created_at: Mapped[datetime] = mapped_column(TZ, nullable=False, server_default=func.now())
    expires_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    used_at: Mapped[Optional[datetime]] = mapped_column(TZ, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
