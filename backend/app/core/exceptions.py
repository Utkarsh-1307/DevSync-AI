from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code: int = 500
    code: str = "internal_error"
    message: str = "An unexpected error occurred"

    def __init__(self, message: str | None = None, detail: dict | None = None):
        self.message = message or self.__class__.message
        self.detail = detail
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Resource not found"


class ConflictError(AppError):
    status_code = 409
    code = "conflict"
    message = "Resource already exists"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"
    message = "Authentication required"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"
    message = "Insufficient permissions"


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"
    message = "Validation failed"


class TenantIsolationError(AppError):
    status_code = 403
    code = "tenant_isolation_violation"
    message = "Cross-tenant access denied"


class OptimisticLockError(AppError):
    status_code = 409
    code = "optimistic_lock_conflict"
    message = "Resource was modified by another request. Please retry."


class RateLimitError(AppError):
    status_code = 429
    code = "rate_limit_exceeded"
    message = "Too many requests"


def _request_id() -> str | None:
    import structlog
    return structlog.contextvars.get_contextvars().get("request_id")


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    body: dict = {"error": exc.code, "message": exc.message}
    if exc.detail:
        body["detail"] = exc.detail
    rid = _request_id()
    if rid:
        body["request_id"] = rid
    return JSONResponse(status_code=exc.status_code, content=body)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    body: dict = {"error": "http_error", "message": exc.detail}
    rid = _request_id()
    if rid:
        body["request_id"] = rid
    return JSONResponse(status_code=exc.status_code, content=body)


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    from app.core.logging import get_logger

    logger = get_logger(__name__)
    logger.exception("Unhandled exception", path=request.url.path, method=request.method)
    body: dict = {"error": "internal_error", "message": "An unexpected error occurred"}
    rid = _request_id()
    if rid:
        body["request_id"] = rid
    return JSONResponse(status_code=500, content=body)
