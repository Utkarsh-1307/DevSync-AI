import json
from uuid import UUID

from fastapi import WebSocket, WebSocketDisconnect

from app.core.logging import get_logger
from app.core.security import decode_token
from app.websockets.manager import ws_manager

logger = get_logger(__name__)


async def websocket_endpoint(websocket: WebSocket, workspace_id: UUID) -> None:
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = decode_token(token, expected_type="access")
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4003, reason="Invalid token")
        return

    await ws_manager.connect(websocket, user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({"error": "invalid_json"}))
                continue

            event = msg.get("event")

            if event == "channel.subscribe":
                channel_id = msg.get("channel_id")
                if channel_id:
                    await ws_manager.subscribe_to_channel(user_id, channel_id)
                    await websocket.send_text(
                        json.dumps({"event": "channel.subscribed", "channel_id": channel_id})
                    )

            elif event == "channel.unsubscribe":
                channel_id = msg.get("channel_id")
                if channel_id:
                    await ws_manager.unsubscribe_from_channel(user_id, channel_id)

            elif event == "ping":
                await websocket.send_text(json.dumps({"event": "pong"}))

            else:
                logger.debug("Unknown WS event", event=event, user_id=user_id)

    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(websocket, user_id)
