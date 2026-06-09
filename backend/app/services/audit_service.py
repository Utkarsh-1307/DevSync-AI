import uuid
from typing import Any

import structlog
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog


class AuditService:
    @staticmethod
    async def log(
        db: AsyncSession,
        *,
        action: str,
        request: Request | None = None,
        user_id: uuid.UUID | None = None,
        workspace_id: uuid.UUID | None = None,
        entity_type: str | None = None,
        entity_id: uuid.UUID | str | None = None,
        old_value: dict[str, Any] | None = None,
        new_value: dict[str, Any] | None = None,
    ) -> None:
        ctx = structlog.contextvars.get_contextvars()

        ip: str | None = None
        ua: str | None = None
        if request is not None:
            forwarded = request.headers.get("x-forwarded-for", "")
            ip = forwarded.split(",")[0].strip() if forwarded else (
                request.client.host if request.client else None
            )
            ua = request.headers.get("user-agent")

        entry = AuditLog(
            action=action,
            user_id=user_id,
            workspace_id=workspace_id,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id is not None else None,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip,
            user_agent=ua,
            request_id=ctx.get("request_id"),
        )
        db.add(entry)
        # No commit — shares the caller's transaction atomically
