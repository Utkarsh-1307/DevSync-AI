from uuid import UUID

from fastapi import APIRouter, Query, Request

from app.api.deps import CurrentUser, DB, Pagination, WorkspaceMember
from app.core.exceptions import ForbiddenError
from app.models.user import WorkspaceRole
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.task import TaskCommentCreate, TaskCommentResponse, TaskCreate, TaskResponse, TaskUpdate
from app.services.audit_service import AuditService
from app.services.task_service import TaskService

router = APIRouter(
    prefix="/workspaces/{workspace_id}/projects/{project_id}/tasks", tags=["tasks"]
)


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(
    workspace_id: UUID,
    project_id: UUID,
    data: TaskCreate,
    request: Request,
    current_user: CurrentUser,
    db: DB,
    membership: WorkspaceMember,
) -> TaskResponse:
    if data.due_date is not None and membership.role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise ForbiddenError("Only admins and owners can set due dates")
    service = TaskService(db)
    task = await service.create_task(project_id, workspace_id, data, current_user.id)
    await AuditService.log(
        db, action="task.created", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="task", entity_id=task.id,
        new_value={"title": task.title, "status": task.status.value, "priority": task.priority.value},
    )
    return TaskResponse.model_validate(task)


@router.get("", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    workspace_id: UUID,
    project_id: UUID,
    current_user: CurrentUser,
    db: DB,
    pagination: Pagination,
    _: WorkspaceMember,
    status: str | None = Query(None),
    assignee_id: UUID | None = Query(None),
) -> PaginatedResponse[TaskResponse]:
    service = TaskService(db)
    tasks, total = await service.get_project_tasks(
        project_id,
        workspace_id,
        status=status,
        assignee_id=assignee_id,
        limit=pagination["limit"],
        offset=pagination["offset"],
    )
    items = [TaskResponse.model_validate(t) for t in tasks]
    return PaginatedResponse(
        items=items,
        total=total,
        page=pagination["page"],
        page_size=pagination["page_size"],
        has_next=pagination["offset"] + pagination["limit"] < total,
        has_prev=pagination["offset"] > 0,
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    workspace_id: UUID, project_id: UUID, task_id: UUID, current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> TaskResponse:
    service = TaskService(db)
    task = await service.get_task(task_id, workspace_id)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    workspace_id: UUID,
    project_id: UUID,
    task_id: UUID,
    data: TaskUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DB,
    membership: WorkspaceMember,
) -> TaskResponse:
    if data.due_date is not None and membership.role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise ForbiddenError("Only admins and owners can set due dates")
    service = TaskService(db)
    task = await service.update_task(task_id, workspace_id, data, current_user.id)
    await AuditService.log(
        db, action="task.updated", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="task", entity_id=task_id,
        new_value=data.model_dump(exclude_none=True),
    )
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", response_model=MessageResponse)
async def delete_task(
    workspace_id: UUID, project_id: UUID, task_id: UUID, request: Request,
    current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> MessageResponse:
    service = TaskService(db)
    await service.delete_task(task_id, workspace_id, current_user.id)
    await AuditService.log(
        db, action="task.deleted", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="task", entity_id=task_id,
    )
    return MessageResponse(message="Task deleted")


@router.post("/{task_id}/comments", response_model=TaskCommentResponse, status_code=201)
async def add_comment(
    workspace_id: UUID,
    project_id: UUID,
    task_id: UUID,
    data: TaskCommentCreate,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> TaskCommentResponse:
    service = TaskService(db)
    comment = await service.add_comment(task_id, workspace_id, data, current_user.id)
    return TaskCommentResponse.model_validate(comment)


@router.get("/{task_id}/comments", response_model=list[TaskCommentResponse])
async def get_comments(
    workspace_id: UUID,
    project_id: UUID,
    task_id: UUID,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> list[TaskCommentResponse]:
    service = TaskService(db)
    comments, _ = await service.get_comments(task_id, workspace_id)
    return [TaskCommentResponse.model_validate(c) for c in comments]
