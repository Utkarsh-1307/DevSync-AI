from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.message import Message, MessageReaction
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    def __init__(self, db: AsyncSession):
        super().__init__(Message, db)

    async def get_channel_messages(
        self,
        channel_id: UUID,
        workspace_id: UUID,
        limit: int = 50,
        before_id: UUID | None = None,
    ) -> list[Message]:
        query = (
            select(Message)
            .where(Message.channel_id == channel_id)
            .where(Message.workspace_id == workspace_id)
            .where(Message.thread_id == None)
            .where(Message.is_deleted == False)
            .options(
                selectinload(Message.author),
                selectinload(Message.reactions).selectinload(MessageReaction.user),
            )
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        if before_id:
            subq = select(Message.created_at).where(Message.id == before_id).scalar_subquery()
            query = query.where(Message.created_at < subq)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_thread_messages(
        self, thread_id: UUID, workspace_id: UUID
    ) -> list[Message]:
        result = await self.db.execute(
            select(Message)
            .where(Message.thread_id == thread_id)
            .where(Message.workspace_id == workspace_id)
            .where(Message.is_deleted == False)
            .options(selectinload(Message.author), selectinload(Message.reactions))
            .order_by(Message.created_at)
        )
        return list(result.scalars().all())

    async def get_message_with_relations(self, message_id: UUID) -> Message:
        result = await self.db.execute(
            select(Message)
            .where(Message.id == message_id)
            .options(
                selectinload(Message.author),
                selectinload(Message.reactions).selectinload(MessageReaction.user),
            )
        )
        return result.scalar_one()

    async def get_reaction(
        self, message_id: UUID, user_id: UUID, emoji: str
    ) -> MessageReaction | None:
        result = await self.db.execute(
            select(MessageReaction)
            .where(MessageReaction.message_id == message_id)
            .where(MessageReaction.user_id == user_id)
            .where(MessageReaction.emoji == emoji)
        )
        return result.scalar_one_or_none()
