import uuid
from datetime import datetime

from pydantic import EmailStr, Field

from app.models.user import UserStatus, WorkspaceRole
from app.schemas.common import OrmBase, TimestampedResponse


class UserProfile(TimestampedResponse):
    email: EmailStr
    username: str
    full_name: str
    avatar_url: str | None
    bio: str | None
    timezone: str
    status: UserStatus
    last_seen_at: datetime | None


class UserSummary(OrmBase):
    id: uuid.UUID
    username: str
    full_name: str
    avatar_url: str | None
    status: UserStatus


class UpdateProfileRequest(OrmBase):
    full_name: str | None = Field(None, max_length=255)
    bio: str | None = Field(None, max_length=500)
    timezone: str | None = Field(None, max_length=64)
    avatar_url: str | None = Field(None, max_length=512)


class WorkspaceMemberResponse(OrmBase):
    user: UserSummary
    role: WorkspaceRole
    joined_at: datetime
