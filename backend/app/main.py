import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import auth, workspaces, projects, tasks, channels, notifications, ai, upload, search, oauth, issues, phases, time_logs
from app.core.config import settings
from app.core.exceptions import (
    AppError,
    app_error_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.logging import setup_logging
from app.websockets.handlers import websocket_endpoint
from fastapi import WebSocket
from uuid import UUID


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging()

    from app.websockets.manager import redis_pubsub_listener

    listener_task = asyncio.create_task(redis_pubsub_listener())

    if settings.PROMETHEUS_ENABLED:
        from prometheus_fastapi_instrumentator import Instrumentator
        Instrumentator().instrument(app).expose(app)

    yield

    listener_task.cancel()
    try:
        await listener_task
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(o) for o in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    from app.middleware.rate_limit import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)

    app.add_exception_handler(AppError, app_error_handler)
    from fastapi import HTTPException
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)

    # API v1 routes
    prefix = "/api/v1"
    app.include_router(auth.router, prefix=prefix)
    app.include_router(workspaces.router, prefix=prefix)
    app.include_router(projects.router, prefix=prefix)
    app.include_router(tasks.router, prefix=prefix)
    app.include_router(channels.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(ai.router, prefix=prefix)
    app.include_router(upload.router, prefix=prefix)
    app.include_router(search.router, prefix=prefix)
    app.include_router(oauth.router, prefix=prefix)
    app.include_router(issues.router, prefix=prefix)
    app.include_router(phases.router, prefix=prefix)
    app.include_router(time_logs.router, prefix=prefix)

    # Serve uploaded files as static assets
    upload_dir = Path("/app/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

    # WebSocket endpoint
    @app.websocket("/ws/{workspace_id}")
    async def ws_handler(websocket: WebSocket, workspace_id: UUID) -> None:
        await websocket_endpoint(websocket, workspace_id)

    @app.get("/health", tags=["infra"])
    async def health() -> dict:
        return {"status": "ok", "version": settings.APP_VERSION}

    return app


app = create_app()
