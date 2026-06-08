from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "devsync",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks.email_tasks",
        "app.workers.tasks.notification_tasks",
        "app.workers.tasks.ai_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks.email_tasks.*": {"queue": "email"},
        "app.workers.tasks.notification_tasks.*": {"queue": "notifications"},
        "app.workers.tasks.ai_tasks.*": {"queue": "ai"},
    },
    beat_schedule={
        "check-overdue-tasks": {
            "task": "app.workers.tasks.notification_tasks.notify_overdue_tasks",
            "schedule": 3600.0,
        },
        "check-due-soon-tasks": {
            "task": "app.workers.tasks.notification_tasks.notify_due_soon_tasks",
            "schedule": 3600.0,
        },
    },
)
