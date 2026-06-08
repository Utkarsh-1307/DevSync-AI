import enum
import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import BaseModel


class ChannelType(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    DIRECT = "direct"


class Channel(BaseModel):
    __tablename__ = "channels"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    channel_type: Mapped[ChannelType] = mapped_column(
        Enum(ChannelType), default=ChannelType.PUBLIC, nullable=False
    )
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    # For DMs: store sorted user pair as a unique key
    dm_key: Mapped[str | None] = mapped_column(String(73), unique=True, nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="channels")
    created_by: Mapped["User"] = relationship("User", foreign_keys=[created_by_id])
    memberships: Mapped[list["ChannelMembership"]] = relationship(
        "ChannelMembership", back_populates="channel", cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="channel", cascade="all, delete-orphan"
    )


class ChannelMembership(BaseModel):
    __tablename__ = "channel_memberships"
    __table_args__ = (UniqueConstraint("user_id", "channel_id", name="uq_user_channel"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False
    )
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    channel: Mapped["Channel"] = relationship("Channel", back_populates="memberships")
