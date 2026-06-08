import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class NotificationType(str, enum.Enum):
    MENTION = "mention"
    TASK_ASSIGNED = "task_assigned"
    TASK_UPDATED = "task_updated"
    TASK_COMMENTED = "task_commented"
    TASK_DUE_SOON = "task_due_soon"
    TASK_OVERDUE = "task_overdue"
    PROJECT_INVITE = "project_invite"
    WORKSPACE_INVITE = "workspace_invite"
    CHANNEL_ADDED = "channel_added"
    MESSAGE_REACTION = "message_reaction"
    DIRECT_MESSAGE = "direct_message"
    AI_COMPLETE = "ai_complete"


class Notification(BaseModel):
    __tablename__ = "notifications"

    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Polymorphic resource reference
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    resource_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Relationships
    recipient: Mapped["User"] = relationship(
        "User", back_populates="notifications", foreign_keys=[recipient_id]
    )
    actor: Mapped["User | None"] = relationship("User", foreign_keys=[actor_id])
