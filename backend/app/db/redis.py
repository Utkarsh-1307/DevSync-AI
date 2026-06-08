from collections.abc import AsyncGenerator
from typing import Any

import redis.asyncio as aioredis

from app.core.config import settings

_pool: aioredis.ConnectionPool | None = None


def get_redis_pool() -> aioredis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = aioredis.ConnectionPool.from_url(
            str(settings.REDIS_URL),
            max_connections=50,
            decode_responses=True,
        )
    return _pool


def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=get_redis_pool())


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    client = get_redis_client()
    try:
        yield client
    finally:
        await client.aclose()


class RedisCache:
    def __init__(self, client: aioredis.Redis):
        self._client = client

    async def get(self, key: str) -> Any:
        return await self._client.get(key)

    async def set(self, key: str, value: Any, ttl: int | None = None) -> None:
        if ttl:
            await self._client.setex(key, ttl, value)
        else:
            await self._client.set(key, value)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def exists(self, key: str) -> bool:
        return bool(await self._client.exists(key))

    async def publish(self, channel: str, message: str) -> None:
        pubsub_client = aioredis.Redis.from_url(
            str(settings.REDIS_URL).replace("/0", f"/{settings.REDIS_PUBSUB_DB}"),
            decode_responses=True,
        )
        await pubsub_client.publish(channel, message)
        await pubsub_client.aclose()
