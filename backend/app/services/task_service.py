from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError, OptimisticLockError
from app.models.notification import NotificationType
from app.models.task import Task, TaskComment, TaskLabel, TaskStatus
from app.repositories.task_repo import TaskCommentRepository, TaskRepository
from app.repositories.user_repo import UserRepository
from app.schemas.task import TaskCommentCreate, TaskCreate, TaskUpdate
from app.services.notification_service import NotificationService


class TaskService:
    def __init__(self, db: AsyncSession):
        self._task_repo = TaskRepository(db)
        self._comment_repo = TaskCommentRepository(db)
        self._user_repo = UserRepository(db)
        self._notif = NotificationService(db)
        self._db = db

    async def create_task(
        self, project_id: UUID, workspace_id: UUID, data: TaskCreate, reporter_id: UUID
    ) -> Task:
        task = await self._task_repo.create(
            workspace_id=workspace_id,
            project_id=project_id,
            title=data.title,
            description=data.description,
            status=data.status,
            priority=data.priority,
            assignee_id=data.assignee_id,
            reporter_id=reporter_id,
            due_date=data.due_date,
            estimated_hours=data.estimated_hours,
            parent_task_id=data.parent_task_id,
        )

        for label_name in data.labels:
            self._db.add(
                TaskLabel(
                    task_id=task.id,
                    workspace_id=workspace_id,
                    name=label_name,
                )
            )
        await self._db.flush()

        # Notify reporter that their task was created
        await self._notif.create_notification(
            recipient_id=reporter_id,
            workspace_id=workspace_id,
            notification_type=NotificationType.TASK_UPDATED,
            title=f"Task created: {data.title}",
            body="Your task has been added to the board.",
            actor_id=reporter_id,
            resource_type="task",
            resource_id=task.id,
        )

        # Notify assignee (skip if they're the reporter themselves)
        if data.assignee_id and data.assignee_id != reporter_id:
            await self._notif.create_notification(
                recipient_id=data.assignee_id,
                workspace_id=workspace_id,
                notification_type=NotificationType.TASK_ASSIGNED,
                title=f"You were assigned to: {data.title}",
                body="A new task has been assigned to you.",
                actor_id=reporter_id,
                resource_type="task",
                resource_id=task.id,
            )

        return await self._task_repo.get_with_relations(task.id)

    async def get_task(self, task_id: UUID, workspace_id: UUID) -> Task:
        task = await self._task_repo.get_with_relations(task_id)
        if not task or task.workspace_id != workspace_id:
            raise NotFoundError("Task not found")
        return task

    async def update_task(
        self, task_id: UUID, workspace_id: UUID, data: TaskUpdate, requester_id: UUID
    ) -> Task:
        task = await self._task_repo.get_by_version(task_id, data.version)
        if not task or task.workspace_id != workspace_id:
            raise OptimisticLockError()

        old_assignee = task.assignee_id
        old_status = task.status

        update_data = data.model_dump(exclude_none=True, exclude={"version", "labels"})
        if data.status == TaskStatus.DONE and task.status != TaskStatus.DONE:
            update_data["completed_at"] = datetime.now(UTC)
        elif data.status and data.status != TaskStatus.DONE:
            update_data["completed_at"] = None

        update_data["version"] = task.version + 1

        if data.labels is not None:
            await self._db.execute(
                __import__("sqlalchemy").delete(TaskLabel).where(TaskLabel.task_id == task_id)
            )
            for name in data.labels:
                self._db.add(TaskLabel(task_id=task_id, workspace_id=workspace_id, name=name))

        await self._task_repo.update(task, **update_data)

        # Notify new assignee if changed
        if (
            data.assignee_id is not None
            and data.assignee_id != old_assignee
            and data.assignee_id != requester_id
        ):
            await self._notif.create_notification(
                recipient_id=data.assignee_id,
                workspace_id=workspace_id,
                notification_type=NotificationType.TASK_ASSIGNED,
                title=f"You were assigned to: {task.title}",
                body="A task has been assigned to you.",
                actor_id=requester_id,
                resource_type="task",
                resource_id=task.id,
            )

        # Notify reporter when task is marked done (skip if they did it themselves)
        if (
            data.status == TaskStatus.DONE
            and old_status != TaskStatus.DONE
            and task.reporter_id
            and task.reporter_id != requester_id
        ):
            await self._notif.create_notification(
                recipient_id=task.reporter_id,
                workspace_id=workspace_id,
                notification_type=NotificationType.TASK_UPDATED,
                title=f"Task completed: {task.title}",
                body="A task you reported has been marked as done.",
                actor_id=requester_id,
                resource_type="task",
                resource_id=task.id,
            )

        return await self._task_repo.get_with_relations(task.id)

    async def delete_task(
        self, task_id: UUID, workspace_id: UUID, requester_id: UUID
    ) -> None:
        task = await self._task_repo.get_by_id_required(task_id)
        if task.workspace_id != workspace_id:
            raise ForbiddenError("Tenant isolation violation")
        await self._task_repo.delete(task)

    async def get_project_tasks(
        self,
        project_id: UUID,
        workspace_id: UUID,
        status: str | None = None,
        assignee_id: UUID | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[Task], int]:
        return await self._task_repo.get_project_tasks(
            project_id, workspace_id, status, assignee_id, limit, offset
        )

    async def add_comment(
        self,
        task_id: UUID,
        workspace_id: UUID,
        data: TaskCommentCreate,
        author_id: UUID,
    ) -> TaskComment:
        task = await self._task_repo.get_with_relations(task_id)
        if not task or task.workspace_id != workspace_id:
            raise ForbiddenError("Tenant isolation violation")

        comment = await self._comment_repo.create(
            task_id=task_id,
            workspace_id=workspace_id,
            author_id=author_id,
            content=data.content,
        )

        # Notify assignee about new comment (if different from commenter)
        if task.assignee_id and task.assignee_id != author_id:
            await self._notif.create_notification(
                recipient_id=task.assignee_id,
                workspace_id=workspace_id,
                notification_type=NotificationType.TASK_COMMENTED,
                title=f"New comment on: {task.title}",
                body=data.content[:120],
                actor_id=author_id,
                resource_type="task",
                resource_id=task_id,
            )

        # Notify reporter about new comment (if different from commenter and assignee)
        if (
            task.reporter_id
            and task.reporter_id != author_id
            and task.reporter_id != task.assignee_id
        ):
            await self._notif.create_notification(
                recipient_id=task.reporter_id,
                workspace_id=workspace_id,
                notification_type=NotificationType.TASK_COMMENTED,
                title=f"New comment on: {task.title}",
                body=data.content[:120],
                actor_id=author_id,
                resource_type="task",
                resource_id=task_id,
            )

        return comment

    async def get_comments(
        self, task_id: UUID, workspace_id: UUID, limit: int = 50, offset: int = 0
    ) -> tuple[list[TaskComment], int]:
        return await self._comment_repo.get_task_comments(task_id, workspace_id, limit, offset)
