import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class WorkspacePlan(str, enum.Enum):
    FREE = "free"
    STARTER = "starter"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


class Workspace(BaseModel):
    __tablename__ = "workspaces"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    plan: Mapped[WorkspacePlan] = mapped_column(
        Enum(WorkspacePlan), default=WorkspacePlan.FREE, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    max_members: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    # Feature flags
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    guest_access_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    memberships: Mapped[list["UserWorkspaceMembership"]] = relationship(
        "UserWorkspaceMembership", back_populates="workspace", cascade="all, delete-orphan"
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="workspace", cascade="all, delete-orphan"
    )
    channels: Mapped[list["Channel"]] = relationship(
        "Channel", back_populates="workspace", cascade="all, delete-orphan"
    )
