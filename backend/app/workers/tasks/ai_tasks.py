import asyncio

from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(
    name="app.workers.tasks.ai_tasks.generate_task_summary",
    bind=True,
    max_retries=2,
)
def generate_task_summary(
    self,
    task_id: str,
    workspace_id: str,
    requester_id: str,
) -> str:
    try:
        return asyncio.run(_generate_task_summary(task_id, workspace_id, requester_id))
    except Exception as exc:
        logger.error("AI task summary failed", task_id=task_id, exc=str(exc))
        raise self.retry(exc=exc)


async def _generate_task_summary(task_id: str, workspace_id: str, requester_id: str) -> str:
    from uuid import UUID

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.db.session import AsyncSessionLocal
    from app.models.notification import NotificationType
    from app.models.task import Task, TaskComment
    from app.services.ai_service import AIService
    from app.services.notification_service import NotificationService

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Task)
            .where(Task.id == UUID(task_id))
            .options(selectinload(Task.comments).selectinload(TaskComment.author))
        )
        task = result.scalar_one_or_none()
        if not task:
            return "Task not found"

        comments = [c.content for c in task.comments]
        ai = AIService()
        summary = await ai.summarize_task(task.title, task.description or "", comments)

        notif_service = NotificationService(db)
        await notif_service.create_notification(
            recipient_id=UUID(requester_id),
            workspace_id=UUID(workspace_id),
            notification_type=NotificationType.AI_COMPLETE,
            title="AI Summary Ready",
            body=summary[:200],
            resource_type="task",
            resource_id=task_id,
        )
        await db.commit()
        return summary
