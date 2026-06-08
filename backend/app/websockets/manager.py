import asyncio
import json
from collections import defaultdict
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import WebSocket

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    def __init__(self):
        # user_id -> set of WebSocket connections
        self._user_connections: dict[str, set[WebSocket]] = defaultdict(set)
        # channel_id -> set of user_ids
        self._channel_subscribers: dict[str, set[str]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, user_id: str) -> None:
        await websocket.accept()
        async with self._lock:
            self._user_connections[user_id].add(websocket)
        logger.info("WebSocket connected", user_id=user_id)

    async def disconnect(self, websocket: WebSocket, user_id: str) -> None:
        async with self._lock:
            self._user_connections[user_id].discard(websocket)
            if not self._user_connections[user_id]:
                del self._user_connections[user_id]
        logger.info("WebSocket disconnected", user_id=user_id)

    async def subscribe_to_channel(self, user_id: str, channel_id: str) -> None:
        async with self._lock:
            self._channel_subscribers[channel_id].add(user_id)

    async def unsubscribe_from_channel(self, user_id: str, channel_id: str) -> None:
        async with self._lock:
            self._channel_subscribers[channel_id].discard(user_id)

    async def send_to_user(self, user_id: str, message: str) -> None:
        conns = list(self._user_connections.get(user_id, set()))
        dead = []
        for ws in conns:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._user_connections[user_id].discard(ws)

    async def broadcast_to_channel(self, channel_id: UUID | str, message: str) -> None:
        channel_key = str(channel_id)
        subscribers = list(self._channel_subscribers.get(channel_key, set()))
        await asyncio.gather(
            *[self.send_to_user(uid, message) for uid in subscribers],
            return_exceptions=True,
        )

    async def broadcast_to_workspace(self, workspace_id: UUID | str, message: str) -> None:
        # Published via Redis; subscribed nodes handle local delivery
        redis = aioredis.Redis.from_url(
            str(settings.REDIS_URL).replace("/0", f"/{settings.REDIS_PUBSUB_DB}"),
            decode_responses=True,
        )
        try:
            await redis.publish(f"workspace:{workspace_id}", message)
        finally:
            await redis.aclose()


ws_manager = ConnectionManager()


async def redis_pubsub_listener() -> None:
    """Subscribe to Redis Pub/Sub channels and fan-out to local WebSocket connections."""
    redis = aioredis.Redis.from_url(
        str(settings.REDIS_URL).replace("/0", f"/{settings.REDIS_PUBSUB_DB}"),
        decode_responses=True,
    )
    pubsub = redis.pubsub()
    await pubsub.psubscribe("workspace:*", "notifications:*", "channel:*")

    logger.info("Redis Pub/Sub listener started")
    async for raw in pubsub.listen():
        if raw["type"] not in ("message", "pmessage"):
            continue
        channel_name: str = raw.get("channel", "")
        data: str = raw.get("data", "")

        try:
            if channel_name.startswith("notifications:"):
                user_id = channel_name.split(":", 1)[1]
                await ws_manager.send_to_user(user_id, data)
            elif channel_name.startswith("workspace:"):
                # Parse message to find recipient or broadcast to all connected
                payload = json.loads(data)
                recipients = payload.get("recipients", [])
                for uid in recipients:
                    await ws_manager.send_to_user(str(uid), data)
            elif channel_name.startswith("channel:"):
                channel_id = channel_name.split(":", 1)[1]
                await ws_manager.broadcast_to_channel(channel_id, data)
        except Exception as exc:
            logger.exception("Pub/Sub dispatch error", exc=str(exc), channel=channel_name)
