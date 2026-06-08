from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.workspace import Workspace
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    def __init__(self, db: AsyncSession):
        super().__init__(Workspace, db)

    async def get_by_slug(self, slug: str) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace)
            .where(Workspace.slug == slug)
            .options(selectinload(Workspace.owner))
        )
        return result.scalar_one_or_none()

    async def get_by_id_with_owner(self, workspace_id: UUID) -> Workspace | None:
        result = await self.db.execute(
            select(Workspace)
            .where(Workspace.id == workspace_id)
            .options(selectinload(Workspace.owner))
        )
        return result.scalar_one_or_none()

    async def get_user_workspaces(self, user_id: UUID) -> list[Workspace]:
        from app.models.user import UserWorkspaceMembership

        result = await self.db.execute(
            select(Workspace)
            .join(
                UserWorkspaceMembership,
                UserWorkspaceMembership.workspace_id == Workspace.id,
            )
            .where(UserWorkspaceMembership.user_id == user_id)
            .where(Workspace.is_active == True)
            .options(selectinload(Workspace.owner))
        )
        return list(result.scalars().all())
