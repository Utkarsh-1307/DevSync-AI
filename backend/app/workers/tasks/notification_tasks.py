from app.core.logging import get_logger
from app.workers.celery_app import celery_app

logger = get_logger(__name__)


@celery_app.task(name="app.workers.tasks.notification_tasks.notify_overdue_tasks")
def notify_overdue_tasks() -> None:
    """Periodic: find tasks past due date and fire overdue notifications."""
    import asyncio
    asyncio.run(_notify_overdue())


@celery_app.task(name="app.workers.tasks.notification_tasks.notify_due_soon_tasks")
def notify_due_soon_tasks() -> None:
    """Periodic: find tasks due within 24h and fire due-soon notifications."""
    import asyncio
    asyncio.run(_notify_due_soon())


async def _notify_overdue() -> None:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.notification import NotificationType
    from app.models.task import Task, TaskStatus
    from app.services.notification_service import NotificationService

    async with AsyncSessionLocal() as db:
        service = NotificationService(db)
        now = datetime.now(UTC)
        result = await db.execute(
            select(Task)
            .where(Task.due_date < now)
            .where(Task.status.notin_([TaskStatus.DONE, TaskStatus.CANCELLED]))
            .where(Task.assignee_id.isnot(None))
        )
        tasks = result.scalars().all()
        for task in tasks:
            await service.create_notification(
                recipient_id=task.assignee_id,
                workspace_id=task.workspace_id,
                notification_type=NotificationType.TASK_OVERDUE,
                title=f"Overdue: {task.title}",
                body="This task is past its due date.",
                resource_type="task",
                resource_id=task.id,
            )
        await db.commit()
        logger.info("Overdue task notifications sent", count=len(tasks))


async def _notify_due_soon() -> None:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.db.session import AsyncSessionLocal
    from app.models.notification import NotificationType
    from app.models.task import Task, TaskStatus
    from app.services.notification_service import NotificationService

    async with AsyncSessionLocal() as db:
        service = NotificationService(db)
        now = datetime.now(UTC)
        soon = now + timedelta(hours=24)
        result = await db.execute(
            select(Task)
            .where(Task.due_date > now)
            .where(Task.due_date <= soon)
            .where(Task.status.notin_([TaskStatus.DONE, TaskStatus.CANCELLED]))
            .where(Task.assignee_id.isnot(None))
        )
        tasks = result.scalars().all()
        for task in tasks:
            await service.create_notification(
                recipient_id=task.assignee_id,
                workspace_id=task.workspace_id,
                notification_type=NotificationType.TASK_DUE_SOON,
                title=f"Due soon: {task.title}",
                body="This task is due within 24 hours.",
                resource_type="task",
                resource_id=task.id,
            )
        await db.commit()
        logger.info("Due-soon notifications sent", count=len(tasks))
