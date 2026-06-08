from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DB, Pagination, WorkspaceMember
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.notification import NotificationMarkReadRequest, NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/workspaces/{workspace_id}/notifications", tags=["notifications"]
)


@router.get("", response_model=PaginatedResponse[NotificationResponse])
async def list_notifications(
    workspace_id: UUID,
    current_user: CurrentUser,
    db: DB,
    pagination: Pagination,
    _: WorkspaceMember,
    unread_only: bool = Query(False),
) -> PaginatedResponse[NotificationResponse]:
    service = NotificationService(db)
    notifications, total = await service.get_notifications(
        current_user.id,
        workspace_id,
        unread_only=unread_only,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    return PaginatedResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total,
        page=pagination["page"],
        page_size=pagination["page_size"],
        has_next=pagination["offset"] + pagination["limit"] < total,
        has_prev=pagination["offset"] > 0,
    )


@router.get("/unread-count")
async def unread_count(workspace_id: UUID, current_user: CurrentUser, db: DB, _: WorkspaceMember) -> dict:
    service = NotificationService(db)
    count = await service.get_unread_count(current_user.id, workspace_id)
    return {"unread_count": count}


@router.post("/mark-read", response_model=MessageResponse)
async def mark_read(
    workspace_id: UUID,
    data: NotificationMarkReadRequest,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> MessageResponse:
    service = NotificationService(db)
    await service.mark_read(data.notification_ids, current_user.id)
    return MessageResponse(message="Notifications marked as read")


@router.post("/mark-all-read", response_model=MessageResponse)
async def mark_all_read(
    workspace_id: UUID, current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> MessageResponse:
    service = NotificationService(db)
    await service.mark_all_read(current_user.id, workspace_id)
    return MessageResponse(message="All notifications marked as read")
