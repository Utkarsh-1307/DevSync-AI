import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.redis import get_redis_client
from app.models.user import User, UserWorkspaceMembership
from app.repositories.base import BaseRepository

_USER_TTL = 900  # 15 minutes


class UserRepository(BaseRepository[User]):
    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self.db.execute(
            select(User).where(User.username == username.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, id: UUID) -> User | None:  # type: ignore[override]
        cache_key = f"user:{id}"
        redis = get_redis_client()
        try:
            cached = await redis.get(cache_key)
            if cached:
                await redis.aclose()
                # Re-fetch from DB to get a proper ORM object bound to this session
                result = await self.db.execute(select(User).where(User.id == id))
                return result.scalar_one_or_none()
        except Exception:
            pass
        finally:
            try:
                await redis.aclose()
            except Exception:
                pass

        result = await self.db.execute(select(User).where(User.id == id))
        user = result.scalar_one_or_none()
        if user:
            try:
                r2 = get_redis_client()
                await r2.setex(cache_key, _USER_TTL, "1")
                await r2.aclose()
            except Exception:
                pass
        return user

    async def invalidate_cache(self, user_id: UUID) -> None:
        try:
            redis = get_redis_client()
            await redis.delete(f"user:{user_id}")
            await redis.aclose()
        except Exception:
            pass

    async def get_workspace_membership(
        self, user_id: UUID, workspace_id: UUID
    ) -> UserWorkspaceMembership | None:
        result = await self.db.execute(
            select(UserWorkspaceMembership)
            .where(UserWorkspaceMembership.user_id == user_id)
            .where(UserWorkspaceMembership.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def get_workspace_members(self, workspace_id: UUID) -> list[UserWorkspaceMembership]:
        result = await self.db.execute(
            select(UserWorkspaceMembership)
            .where(UserWorkspaceMembership.workspace_id == workspace_id)
            .options(selectinload(UserWorkspaceMembership.user))
        )
        return list(result.scalars().all())
