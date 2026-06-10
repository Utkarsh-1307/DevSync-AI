from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.project import Project, ProjectMembership, ProjectRole
from app.models.user import WorkspaceRole
from app.repositories.user_repo import UserRepository
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    def __init__(self, db: AsyncSession):
        self._db = db
        self._user_repo = UserRepository(db)

    async def create_project(
        self, workspace_id: UUID, data: ProjectCreate, owner_id: UUID
    ) -> Project:
        existing = await self._db.execute(
            select(Project)
            .where(Project.workspace_id == workspace_id)
            .where(Project.key == data.key.upper())
        )
        if existing.scalar_one_or_none():
            raise ConflictError(f"Project key '{data.key.upper()}' already exists in this workspace")

        project = Project(
            workspace_id=workspace_id,
            name=data.name,
            description=data.description,
            key=data.key.upper(),
            visibility=data.visibility,
            color=data.color,
            owner_id=owner_id,
        )
        self._db.add(project)
        await self._db.flush()

        self._db.add(
            ProjectMembership(
                user_id=owner_id,
                project_id=project.id,
                role=ProjectRole.MANAGER,
            )
        )
        await self._db.flush()
        await self._db.refresh(project)

        result = await self._db.execute(
            select(Project)
            .where(Project.id == project.id)
            .options(selectinload(Project.owner))
        )
        return result.scalar_one()

    async def update_project(
        self, project_id: UUID, workspace_id: UUID, data: ProjectUpdate, requester_id: UUID
    ) -> Project:
        project = await self._get_or_404(project_id, workspace_id)
        await self._require_manager(project_id, requester_id)

        for field, value in data.model_dump(exclude_none=True).items():
            setattr(project, field, value)

        await self._db.flush()
        result = await self._db.execute(
            select(Project).where(Project.id == project_id).options(selectinload(Project.owner))
        )
        return result.scalar_one()

    async def archive_project(
        self, project_id: UUID, workspace_id: UUID, requester_id: UUID
    ) -> None:
        project = await self._get_or_404(project_id, workspace_id)
        await self._require_manager(project_id, requester_id)
        project.is_archived = True
        await self._db.flush()

    async def _get_or_404(self, project_id: UUID, workspace_id: UUID) -> Project:
        result = await self._db.execute(
            select(Project)
            .where(Project.id == project_id)
            .where(Project.workspace_id == workspace_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            raise NotFoundError("Project not found")
        return project

    async def _require_manager(self, project_id: UUID, user_id: UUID) -> None:
        result = await self._db.execute(
            select(ProjectMembership)
            .where(ProjectMembership.project_id == project_id)
            .where(ProjectMembership.user_id == user_id)
        )
        membership = result.scalar_one_or_none()
        if not membership or membership.role not in (ProjectRole.MANAGER,):
            raise ForbiddenError("Project manager role required")
