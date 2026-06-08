import uuid
from datetime import datetime

from pydantic import Field

from app.models.workspace import WorkspacePlan
from app.schemas.common import OrmBase, TimestampedResponse
from app.schemas.user import UserSummary


class WorkspaceCreate(OrmBase):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9-]+$")
    description: str | None = Field(None, max_length=1000)


class WorkspaceUpdate(OrmBase):
    name: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=1000)
    logo_url: str | None = Field(None, max_length=512)
    ai_enabled: bool | None = None
    guest_access_enabled: bool | None = None


class WorkspaceResponse(TimestampedResponse):
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    plan: WorkspacePlan
    is_active: bool
    max_members: int
    ai_enabled: bool
    guest_access_enabled: bool
    owner: UserSummary


class InviteMemberRequest(OrmBase):
    email: str
    role: str = "member"
