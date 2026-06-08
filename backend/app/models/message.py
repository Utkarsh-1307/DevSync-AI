import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class Message(BaseModel):
    __tablename__ = "messages"

    channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    thread_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=True, index=True
    )
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pinned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Rich content: file attachments stored as JSON-serializable list in a text field
    attachments_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    channel: Mapped["Channel"] = relationship("Channel", back_populates="messages")
    author: Mapped["User"] = relationship("User", back_populates="messages")
    thread_replies: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="thread_parent",
        foreign_keys=[thread_id],
    )
    thread_parent: Mapped["Message | None"] = relationship(
        "Message",
        back_populates="thread_replies",
        remote_side="Message.id",
        foreign_keys=[thread_id],
    )
    reactions: Mapped[list["MessageReaction"]] = relationship(
        "MessageReaction", back_populates="message", cascade="all, delete-orphan"
    )


class MessageReaction(BaseModel):
    __tablename__ = "message_reactions"
    __table_args__ = (UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction"),)

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    emoji: Mapped[str] = mapped_column(String(32), nullable=False)

    message: Mapped["Message"] = relationship("Message", back_populates="reactions")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
