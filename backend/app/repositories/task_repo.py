from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.task import Task, TaskComment
from app.repositories.base import BaseRepository

_TASK_OPTS = [
    selectinload(Task.assignee),
    selectinload(Task.reporter),
    selectinload(Task.labels),
]


class TaskRepository(BaseRepository[Task]):
    def __init__(self, db: AsyncSession):
        super().__init__(Task, db)

    async def get_with_relations(self, task_id: UUID) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .where(Task.id == task_id)
            .options(
                *_TASK_OPTS,
                selectinload(Task.comments).selectinload(TaskComment.author),
            )
        )
        return result.scalar_one_or_none()

    async def get_project_tasks(
        self,
        project_id: UUID,
        workspace_id: UUID,
        status: str | None = None,
        assignee_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        filters = [
            Task.project_id == project_id,
            Task.workspace_id == workspace_id,
            Task.parent_task_id == None,
        ]
        if status:
            filters.append(Task.status == status)
        if assignee_id:
            filters.append(Task.assignee_id == assignee_id)

        count_result = await self.db.execute(
            select(func.count()).select_from(Task).where(*filters)
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            select(Task)
            .where(*filters)
            .options(*_TASK_OPTS)
            .order_by(Task.position)
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total

    async def get_by_version(self, task_id: UUID, version: int) -> Task | None:
        result = await self.db.execute(
            select(Task)
            .where(Task.id == task_id)
            .where(Task.version == version)
            .options(*_TASK_OPTS)
        )
        return result.scalar_one_or_none()


class TaskCommentRepository(BaseRepository[TaskComment]):
    def __init__(self, db: AsyncSession):
        super().__init__(TaskComment, db)

    async def get_task_comments(
        self, task_id: UUID, workspace_id: UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[TaskComment], int]:
        return await self.list(
            filters=[
                TaskComment.task_id == task_id,
                TaskComment.workspace_id == workspace_id,
            ],
            order_by=TaskComment.created_at,
            limit=limit,
            offset=offset,
        )
