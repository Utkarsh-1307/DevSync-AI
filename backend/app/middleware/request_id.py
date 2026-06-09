import time
from uuid import uuid4

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = structlog.get_logger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        response = await call_next(request)
        latency_ms = round((time.perf_counter() - start) * 1000, 1)

        # Skip logging for health checks and static files to avoid noise
        path = request.url.path
        if not path.startswith("/uploads") and path != "/health":
            logger.info(
                "http.request",
                method=request.method,
                path=path,
                status=response.status_code,
                latency_ms=latency_ms,
            )

        response.headers["X-Request-ID"] = request_id
        return response
