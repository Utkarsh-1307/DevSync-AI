import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class ProjectStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    COMPLETED = "completed"


class ProjectVisibility(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    WORKSPACE = "workspace"


class ProjectRole(str, enum.Enum):
    MANAGER = "manager"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"


class Project(BaseModel):
    __tablename__ = "projects"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    key: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.ACTIVE, nullable=False
    )
    visibility: Mapped[ProjectVisibility] = mapped_column(
        Enum(ProjectVisibility), default=ProjectVisibility.WORKSPACE, nullable=False
    )
    color: Mapped[str] = mapped_column(String(7), default="#6366f1", nullable=False)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="projects")
    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    memberships: Mapped[list["ProjectMembership"]] = relationship(
        "ProjectMembership", back_populates="project", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectMembership(BaseModel):
    __tablename__ = "project_memberships"
    __table_args__ = (UniqueConstraint("user_id", "project_id", name="uq_user_project"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[ProjectRole] = mapped_column(
        Enum(ProjectRole), default=ProjectRole.CONTRIBUTOR, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    project: Mapped["Project"] = relationship("Project", back_populates="memberships")
