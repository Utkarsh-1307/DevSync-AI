from uuid import UUID

from fastapi import APIRouter, Request

from app.api.deps import CurrentUser, DB, Pagination, WorkspaceMember
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.project import Project, ProjectMembership, ProjectRole
from app.repositories.user_repo import UserRepository
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.project import ProjectCreate, ProjectMemberResponse, ProjectResponse, ProjectUpdate
from app.services.audit_service import AuditService
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/workspaces/{workspace_id}/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    workspace_id: UUID,
    data: ProjectCreate,
    request: Request,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> ProjectResponse:
    from app.services.project_service import ProjectService

    service = ProjectService(db)
    project = await service.create_project(workspace_id, data, current_user.id)
    await AuditService.log(
        db, action="project.created", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="project", entity_id=project.id,
        new_value={"name": project.name, "key": project.key},
    )
    return ProjectResponse.model_validate(project)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    workspace_id: UUID, current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> list[ProjectResponse]:
    result = await db.execute(
        select(Project)
        .where(Project.workspace_id == workspace_id)
        .where(Project.is_archived == False)
        .options(selectinload(Project.owner))
        .order_by(Project.created_at.desc())
    )
    return [ProjectResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    workspace_id: UUID, project_id: UUID, current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> ProjectResponse:
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.workspace_id == workspace_id)
        .options(selectinload(Project.owner))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundError("Project not found")
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    workspace_id: UUID,
    project_id: UUID,
    data: ProjectUpdate,
    request: Request,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> ProjectResponse:
    from app.services.project_service import ProjectService

    service = ProjectService(db)
    project = await service.update_project(project_id, workspace_id, data, current_user.id)
    await AuditService.log(
        db, action="project.updated", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="project", entity_id=project_id,
        new_value=data.model_dump(exclude_none=True),
    )
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", response_model=MessageResponse)
async def archive_project(
    workspace_id: UUID, project_id: UUID, request: Request,
    current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> MessageResponse:
    from app.services.project_service import ProjectService

    service = ProjectService(db)
    await service.archive_project(project_id, workspace_id, current_user.id)
    await AuditService.log(
        db, action="project.deleted", request=request,
        user_id=current_user.id, workspace_id=workspace_id,
        entity_type="project", entity_id=project_id,
    )
    return MessageResponse(message="Project archived")
