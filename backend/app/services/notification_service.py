import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.redis import get_redis_client
from app.models.notification import Notification, NotificationType
from app.repositories.notification_repo import NotificationRepository

_UNREAD_TTL = 30  # seconds


def _unread_key(user_id: UUID, workspace_id: UUID) -> str:
    return f"notif_count:{user_id}:{workspace_id}"


class NotificationService:
    def __init__(self, db: AsyncSession):
        self._repo = NotificationRepository(db)
        self._db = db

    async def create_notification(
        self,
        recipient_id: UUID,
        workspace_id: UUID,
        notification_type: NotificationType,
        title: str,
        body: str | None = None,
        actor_id: UUID | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        resource_url: str | None = None,
    ) -> Notification:
        notif = await self._repo.create(
            recipient_id=recipient_id,
            workspace_id=workspace_id,
            actor_id=actor_id,
            notification_type=notification_type,
            title=title,
            body=body,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            resource_url=resource_url,
        )

        # Invalidate cached unread count
        await self._invalidate_count(recipient_id, workspace_id)

        # Publish real-time notification via Redis Pub/Sub (wrapped for frontend socket)
        redis = get_redis_client()
        try:
            await redis.publish(
                f"notifications:{recipient_id}",
                json.dumps(
                    {
                        "event": "notification.new",
                        "data": {
                            "id": str(notif.id),
                            "type": notification_type,
                            "title": title,
                            "body": body,
                            "workspace_id": str(workspace_id),
                            "created_at": datetime.now(UTC).isoformat(),
                            "is_read": False,
                        },
                    }
                ),
            )
        finally:
            await redis.aclose()

        return notif

    async def get_notifications(
        self,
        user_id: UUID,
        workspace_id: UUID,
        unread_only: bool = False,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[Notification], int]:
        return await self._repo.get_user_notifications(
            user_id, workspace_id, unread_only, limit, offset
        )

    async def mark_read(self, notification_ids: list[UUID], user_id: UUID) -> None:
        for nid in notification_ids:
            notif = await self._repo.get_by_id(nid)
            if notif and notif.recipient_id == user_id:
                await self._repo.update(notif, is_read=True, read_at=datetime.now(UTC))
                await self._invalidate_count(user_id, notif.workspace_id)

    async def mark_all_read(self, user_id: UUID, workspace_id: UUID) -> None:
        await self._repo.mark_all_read(user_id, workspace_id)
        await self._invalidate_count(user_id, workspace_id)

    async def get_unread_count(self, user_id: UUID, workspace_id: UUID) -> int:
        key = _unread_key(user_id, workspace_id)
        redis = get_redis_client()
        try:
            cached = await redis.get(key)
            if cached is not None:
                return int(cached)
        except Exception:
            pass
        finally:
            try:
                await redis.aclose()
            except Exception:
                pass

        count = await self._repo.get_unread_count(user_id, workspace_id)
        try:
            r2 = get_redis_client()
            await r2.setex(key, _UNREAD_TTL, str(count))
            await r2.aclose()
        except Exception:
            pass
        return count

    async def _invalidate_count(self, user_id: UUID, workspace_id: UUID) -> None:
        try:
            redis = get_redis_client()
            await redis.delete(_unread_key(user_id, workspace_id))
            await redis.aclose()
        except Exception:
            pass
