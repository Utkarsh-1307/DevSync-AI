import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.models.channel import ChannelType
from app.schemas.common import OrmBase, TimestampedResponse
from app.schemas.user import UserSummary


class ChannelCreate(OrmBase):
    name: str = Field(min_length=1, max_length=128, pattern=r"^[a-z0-9-_]+$")
    description: str | None = Field(None, max_length=500)
    channel_type: ChannelType = ChannelType.PUBLIC


class ChannelUpdate(OrmBase):
    name: str | None = Field(None, max_length=128)
    description: str | None = Field(None, max_length=500)
    is_archived: bool | None = None


class ChannelResponse(TimestampedResponse):
    workspace_id: uuid.UUID
    name: str
    description: str | None
    channel_type: ChannelType
    is_archived: bool
    created_by: UserSummary
    members: list[UserSummary] = []

    @classmethod
    def model_validate(cls, obj: Any, **kwargs: Any) -> "ChannelResponse":  # type: ignore[override]
        # Populate members from the memberships relationship if loaded
        if hasattr(obj, "memberships") and obj.memberships is not None:
            try:
                obj.__dict__["members"] = [
                    UserSummary.model_validate(m.user)
                    for m in obj.memberships
                    if m.user is not None
                ]
            except Exception:
                obj.__dict__.setdefault("members", [])
        return super().model_validate(obj, **kwargs)


class DirectMessageCreate(OrmBase):
    target_user_id: uuid.UUID
