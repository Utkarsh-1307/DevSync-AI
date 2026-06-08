import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.message import Message, MessageReaction
from app.repositories.message_repo import MessageRepository
from app.schemas.message import MessageCreate, MessageUpdate


class MessageService:
    def __init__(self, db: AsyncSession):
        self._repo = MessageRepository(db)
        self._db = db

    async def send_message(
        self,
        channel_id: UUID,
        workspace_id: UUID,
        data: MessageCreate,
        author_id: UUID,
    ) -> Message:
        # Require either content or attachments
        if not data.content.strip() and not data.attachments:
            from app.core.exceptions import ValidationError as AppValidationError
            raise AppValidationError("Message must have content or attachments")

        attachments_json = None
        if data.attachments:
            attachments_json = json.dumps([a.model_dump() for a in data.attachments])

        msg = await self._repo.create(
            channel_id=channel_id,
            workspace_id=workspace_id,
            author_id=author_id,
            content=data.content,
            thread_id=data.thread_id,
            attachments_json=attachments_json,
        )
        return await self._repo.get_message_with_relations(msg.id)

    async def get_channel_messages(
        self,
        channel_id: UUID,
        workspace_id: UUID,
        limit: int = 50,
        before_id: UUID | None = None,
    ) -> list[Message]:
        return await self._repo.get_channel_messages(channel_id, workspace_id, limit, before_id)

    async def edit_message(
        self, message_id: UUID, workspace_id: UUID, data: MessageUpdate, requester_id: UUID
    ) -> Message:
        msg = await self._repo.get_by_id_required(message_id)
        if msg.workspace_id != workspace_id:
            raise ForbiddenError("Tenant isolation violation")
        if msg.author_id != requester_id:
            raise ForbiddenError("Can only edit your own messages")
        await self._repo.update(msg, content=data.content, is_edited=True)
        return await self._repo.get_message_with_relations(message_id)

    async def delete_message(
        self, message_id: UUID, workspace_id: UUID, requester_id: UUID
    ) -> None:
        msg = await self._repo.get_by_id_required(message_id)
        if msg.workspace_id != workspace_id:
            raise ForbiddenError("Tenant isolation violation")
        if msg.author_id != requester_id:
            raise ForbiddenError("Can only delete your own messages")
        await self._repo.update(
            msg, is_deleted=True, content="[deleted]", deleted_at=datetime.now(UTC)
        )

    async def toggle_reaction(
        self, message_id: UUID, workspace_id: UUID, emoji: str, user_id: UUID
    ) -> dict:
        msg = await self._repo.get_by_id_required(message_id)
        if msg.workspace_id != workspace_id:
            raise ForbiddenError("Tenant isolation violation")

        existing = await self._repo.get_reaction(message_id, user_id, emoji)
        if existing:
            await self._db.delete(existing)
            action = "removed"
        else:
            self._db.add(
                MessageReaction(
                    message_id=message_id,
                    user_id=user_id,
                    workspace_id=workspace_id,
                    emoji=emoji,
                )
            )
            action = "added"
        await self._db.flush()
        return {"emoji": emoji, "action": action}

    async def get_thread_messages(
        self, thread_id: UUID, workspace_id: UUID
    ) -> list[Message]:
        return await self._repo.get_thread_messages(thread_id, workspace_id)
