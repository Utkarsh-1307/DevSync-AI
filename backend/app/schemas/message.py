import json
import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas.common import OrmBase, TimestampedResponse
from app.schemas.user import UserSummary


class MessageAttachment(OrmBase):
    url: str
    filename: str
    content_type: str
    file_size: int


class MessageCreate(OrmBase):
    content: str = Field(min_length=0, max_length=10000, default="")
    thread_id: uuid.UUID | None = None
    attachments: list[MessageAttachment] = Field(default_factory=list)


class MessageUpdate(OrmBase):
    content: str = Field(min_length=1, max_length=10000)


class MessageResponse(TimestampedResponse):
    channel_id: uuid.UUID
    workspace_id: uuid.UUID
    author: UserSummary
    content: str
    thread_id: uuid.UUID | None
    is_edited: bool
    is_deleted: bool
    pinned_at: datetime | None
    reactions: list["ReactionSummary"]
    attachments: list[MessageAttachment] = Field(default_factory=list)

    @classmethod
    def model_validate(cls, obj: Any, **kwargs: Any) -> "MessageResponse":  # type: ignore[override]
        # Parse attachments_json from ORM objects before standard validation
        if hasattr(obj, "attachments_json") and obj.attachments_json:
            try:
                parsed = json.loads(obj.attachments_json)
                # Temporarily add attachments attr so Pydantic sees it
                obj.__dict__["attachments"] = parsed
            except Exception:
                obj.__dict__.setdefault("attachments", [])
        elif hasattr(obj, "attachments_json"):
            obj.__dict__.setdefault("attachments", [])
        return super().model_validate(obj, **kwargs)


class ReactionSummary(OrmBase):
    emoji: str
    count: int
    reacted_by_me: bool


class ReactionToggleRequest(OrmBase):
    emoji: str = Field(min_length=1, max_length=32)
