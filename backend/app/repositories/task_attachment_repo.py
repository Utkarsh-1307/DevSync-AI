from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import TaskAttachment
from app.repositories.base import BaseRepository


class TaskAttachmentRepository(BaseRepository[TaskAttachment]):
    def __init__(self, db: AsyncSession):
        super().__init__(TaskAttachment, db)

    async def get_task_attachments(
        self, task_id: UUID, workspace_id: UUID
    ) -> list[TaskAttachment]:
        result = await self.db.execute(
            select(TaskAttachment)
            .where(
                TaskAttachment.task_id == task_id,
                TaskAttachment.workspace_id == workspace_id,
            )
            .order_by(TaskAttachment.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_by_id_in_workspace(
        self, attachment_id: UUID, workspace_id: UUID
    ) -> TaskAttachment | None:
        result = await self.db.execute(
            select(TaskAttachment).where(
                TaskAttachment.id == attachment_id,
                TaskAttachment.workspace_id == workspace_id,
            )
        )
        return result.scalar_one_or_none()
