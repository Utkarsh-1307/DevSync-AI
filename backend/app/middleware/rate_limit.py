import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings
from app.db.redis import get_redis_client

# Route prefixes that get stricter limits
_STRICT: dict[str, tuple[int, int]] = {
    "/api/v1/auth/login":    (10, 60),   # 10 req / 60s
    "/api/v1/auth/register": (10, 60),
    "/api/v1/upload":        (20, 60),   # 20 req / 60s
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only rate-limit API routes; pass health + static through freely
        path = request.url.path
        if not path.startswith("/api/") and not path.startswith("/upload"):
            return await call_next(request)

        client_ip = (
            request.headers.get("x-forwarded-for", "").split(",")[0].strip()
            or request.client.host
            or "unknown"
        )

        # Determine limit for this route
        limit, window = settings.RATE_LIMIT_REQUESTS, settings.RATE_LIMIT_WINDOW_SECONDS
        for prefix, (l, w) in _STRICT.items():
            if path.startswith(prefix):
                limit, window = l, w
                break

        key = f"rl:{client_ip}:{path.split('/')[3] if path.count('/') >= 3 else path}"

        try:
            redis = get_redis_client()
            now = int(time.time())
            window_start = now - window

            pipe = redis.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window)
            results = await pipe.execute()
            await redis.aclose()

            count = results[2]
            if count > limit:
                retry_after = window - (now % window)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": str(retry_after)},
                )
        except Exception:
            # Never block requests due to Redis errors
            pass

        return await call_next(request)
