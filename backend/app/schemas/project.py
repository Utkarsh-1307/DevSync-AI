import uuid
from datetime import datetime

from pydantic import Field

from app.models.project import ProjectRole, ProjectStatus, ProjectVisibility
from app.schemas.common import OrmBase, TimestampedResponse
from app.schemas.user import UserSummary


class ProjectCreate(OrmBase):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    key: str = Field(min_length=2, max_length=10, pattern=r"^[A-Z0-9]+$")
    visibility: ProjectVisibility = ProjectVisibility.WORKSPACE
    color: str = Field(default="#6366f1", pattern=r"^#[0-9A-Fa-f]{6}$")


class ProjectUpdate(OrmBase):
    name: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=2000)
    status: ProjectStatus | None = None
    visibility: ProjectVisibility | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: str | None = None


class ProjectResponse(TimestampedResponse):
    workspace_id: uuid.UUID
    name: str
    description: str | None
    key: str
    status: ProjectStatus
    visibility: ProjectVisibility
    color: str
    icon: str | None
    is_archived: bool
    owner: UserSummary


class ProjectMemberResponse(OrmBase):
    user: UserSummary
    role: ProjectRole
