import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"


class WorkspaceRole(str, enum.Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    GUEST = "guest"


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus), default=UserStatus.PENDING_VERIFICATION, nullable=False
    )
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    workspace_memberships: Mapped[list["UserWorkspaceMembership"]] = relationship(
        "UserWorkspaceMembership", back_populates="user", cascade="all, delete-orphan",
        foreign_keys="UserWorkspaceMembership.user_id"
    )
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="recipient", cascade="all, delete-orphan",
        foreign_keys="Notification.recipient_id"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="author", cascade="all, delete-orphan"
    )
    task_comments: Mapped[list["TaskComment"]] = relationship(
        "TaskComment", back_populates="author", cascade="all, delete-orphan"
    )


class UserWorkspaceMembership(BaseModel):
    __tablename__ = "user_workspace_memberships"
    __table_args__ = (UniqueConstraint("user_id", "workspace_id", name="uq_user_workspace"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[WorkspaceRole] = mapped_column(
        Enum(WorkspaceRole), default=WorkspaceRole.MEMBER, nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    invited_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="workspace_memberships", foreign_keys=[user_id])
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="memberships")
