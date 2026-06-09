import uuid
from datetime import date
from typing import Any, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select

from app.api.deps import DB, Pagination, WorkspaceAdmin
from app.models.audit_log import AuditLog
from app.schemas.common import PaginatedResponse

router = APIRouter(tags=["audit"])


class AuditLogResponse(PydanticBase):
    id: uuid.UUID
    workspace_id: Optional[uuid.UUID]
    user_id: Optional[uuid.UUID]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    old_value: Optional[dict[str, Any]]
    new_value: Optional[dict[str, Any]]
    ip_address: Optional[str]
    request_id: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


@router.get(
    "/workspaces/{workspace_id}/audit-logs",
    response_model=PaginatedResponse[AuditLogResponse],
)
async def list_audit_logs(
    workspace_id: uuid.UUID,
    db: DB,
    _: WorkspaceAdmin,
    pagination: Pagination,
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
) -> PaginatedResponse[AuditLogResponse]:
    q = select(AuditLog).where(AuditLog.workspace_id == workspace_id)

    if action:
        q = q.where(AuditLog.action == action)
    if entity_type:
        q = q.where(AuditLog.entity_type == entity_type)
    if user_id:
        q = q.where(AuditLog.user_id == user_id)
    if from_date:
        q = q.where(AuditLog.created_at >= from_date)
    if to_date:
        from datetime import timedelta
        q = q.where(AuditLog.created_at < to_date + timedelta(days=1))

    count_q = q.with_only_columns(AuditLog.id)
    total_result = await db.execute(count_q)
    total = len(total_result.scalars().all())

    q = q.order_by(AuditLog.created_at.desc()).limit(pagination["limit"]).offset(pagination["offset"])
    result = await db.execute(q)
    logs = result.scalars().all()

    items = [
        AuditLogResponse(
            id=log.id,
            workspace_id=log.workspace_id,
            user_id=log.user_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            old_value=log.old_value,
            new_value=log.new_value,
            ip_address=log.ip_address,
            request_id=log.request_id,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]

    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination["page"],
        page_size=pagination["page_size"],
        has_next=pagination["offset"] + pagination["limit"] < total,
        has_prev=pagination["offset"] > 0,
    )
