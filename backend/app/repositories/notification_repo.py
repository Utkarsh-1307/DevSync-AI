from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: AsyncSession):
        super().__init__(Notification, db)

    async def get_user_notifications(
        self,
        user_id: UUID,
        workspace_id: UUID,
        unread_only: bool = False,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[Notification], int]:
        filters = [
            Notification.recipient_id == user_id,
            Notification.workspace_id == workspace_id,
        ]
        if unread_only:
            filters.append(Notification.is_read == False)

        return await self.list(
            filters=filters,
            order_by=Notification.created_at.desc(),
            limit=limit,
            offset=offset,
        )

    async def mark_all_read(self, user_id: UUID, workspace_id: UUID) -> None:
        from datetime import UTC, datetime

        await self.db.execute(
            update(Notification)
            .where(Notification.recipient_id == user_id)
            .where(Notification.workspace_id == workspace_id)
            .where(Notification.is_read == False)
            .values(is_read=True, read_at=datetime.now(UTC))
        )
        await self.db.flush()

    async def get_unread_count(self, user_id: UUID, workspace_id: UUID) -> int:
        from sqlalchemy import func

        result = await self.db.execute(
            select(func.count())
            .select_from(Notification)
            .where(Notification.recipient_id == user_id)
            .where(Notification.workspace_id == workspace_id)
            .where(Notification.is_read == False)
        )
        return result.scalar_one()
