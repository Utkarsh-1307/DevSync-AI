import uuid
from datetime import datetime

from app.models.notification import NotificationType
from app.schemas.common import OrmBase, TimestampedResponse
from app.schemas.user import UserSummary


class NotificationResponse(TimestampedResponse):
    workspace_id: uuid.UUID
    actor: UserSummary | None
    notification_type: NotificationType
    title: str
    body: str | None
    is_read: bool
    read_at: datetime | None
    resource_type: str | None
    resource_id: str | None
    resource_url: str | None


class NotificationMarkReadRequest(OrmBase):
    notification_ids: list[uuid.UUID]
