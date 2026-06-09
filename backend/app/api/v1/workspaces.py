from uuid import UUID

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, DB, Pagination, WorkspaceAdmin, WorkspaceMember
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.user import WorkspaceMemberResponse
from app.schemas.workspace import InviteMemberRequest, WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.services.audit_service import AuditService
from app.services.workspace_service import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=201)
async def create_workspace(data: WorkspaceCreate, request: Request, current_user: CurrentUser, db: DB) -> WorkspaceResponse:
    service = WorkspaceService(db)
    workspace = await service.create_workspace(data, current_user.id)
    await AuditService.log(
        db, action="workspace.created", request=request,
        user_id=current_user.id, workspace_id=workspace.id,
        entity_type="workspace", entity_id=workspace.id,
        new_value={"name": workspace.name},
    )
    return WorkspaceResponse.model_validate(workspace)


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(current_user: CurrentUser, db: DB) -> list[WorkspaceResponse]:
    service = WorkspaceService(db)
    workspaces = await service.list_user_workspaces(current_user.id)
    return [WorkspaceResponse.model_validate(w) for w in workspaces]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: UUID, current_user: CurrentUser, db: DB
) -> WorkspaceResponse:
    service = WorkspaceService(db)
    workspace = await service.get_workspace(workspace_id, current_user.id)
    return WorkspaceResponse.model_validate(workspace)


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceAdmin,
) -> WorkspaceResponse:
    service = WorkspaceService(db)
    workspace = await service.update_workspace(workspace_id, data, current_user.id)
    return WorkspaceResponse.model_validate(workspace)


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
async def list_members(workspace_id: UUID, _: WorkspaceMember, db: DB) -> list[WorkspaceMemberResponse]:
    from app.repositories.user_repo import UserRepository

    repo = UserRepository(db)
    memberships = await repo.get_workspace_members(workspace_id)
    return [WorkspaceMemberResponse.model_validate(m) for m in memberships]


@router.post("/{workspace_id}/members", response_model=MessageResponse, status_code=201)
async def invite_member(
    workspace_id: UUID,
    data: InviteMemberRequest,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceAdmin,
) -> MessageResponse:
    service = WorkspaceService(db)
    await service.invite_member(workspace_id, data.email, data.role, current_user.id)
    return MessageResponse(message="Member invited successfully")


@router.delete("/{workspace_id}", response_model=MessageResponse)
async def delete_workspace(
    workspace_id: UUID,
    request: Request,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceAdmin,
) -> MessageResponse:
    service = WorkspaceService(db)
    await service.delete_workspace(workspace_id, current_user.id)
    await AuditService.log(
        db, action="workspace.deleted", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="workspace", entity_id=workspace_id,
    )
    return MessageResponse(message="Workspace deleted")


@router.delete("/{workspace_id}/members/{member_id}", response_model=MessageResponse)
async def remove_member(
    workspace_id: UUID,
    member_id: UUID,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceAdmin,
) -> MessageResponse:
    service = WorkspaceService(db)
    await service.remove_member(workspace_id, member_id, current_user.id)
    return MessageResponse(message="Member removed")
