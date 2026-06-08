from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.models.user import UserWorkspaceMembership, WorkspaceRole
from app.models.workspace import Workspace
from app.repositories.user_repo import UserRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate


class WorkspaceService:
    def __init__(self, db: AsyncSession):
        self._ws_repo = WorkspaceRepository(db)
        self._user_repo = UserRepository(db)
        self._db = db

    async def create_workspace(self, data: WorkspaceCreate, owner_id: UUID) -> Workspace:
        existing = await self._ws_repo.get_by_slug(data.slug)
        if existing:
            raise ConflictError(f"Workspace slug '{data.slug}' is already taken")

        workspace = await self._ws_repo.create(
            name=data.name,
            slug=data.slug,
            description=data.description,
            owner_id=owner_id,
        )

        # Auto-enroll owner
        self._db.add(
            UserWorkspaceMembership(
                user_id=owner_id,
                workspace_id=workspace.id,
                role=WorkspaceRole.OWNER,
                joined_at=datetime.now(UTC),
            )
        )
        await self._db.flush()
        return await self._ws_repo.get_by_id_with_owner(workspace.id)

    async def get_workspace(self, workspace_id: UUID, requester_id: UUID) -> Workspace:
        membership = await self._user_repo.get_workspace_membership(requester_id, workspace_id)
        if not membership:
            raise ForbiddenError("Not a member of this workspace")

        workspace = await self._ws_repo.get_by_id_with_owner(workspace_id)
        if not workspace or not workspace.is_active:
            raise NotFoundError("Workspace not found")
        return workspace

    async def update_workspace(
        self, workspace_id: UUID, data: WorkspaceUpdate, requester_id: UUID
    ) -> Workspace:
        await self._require_role(workspace_id, requester_id, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN])
        workspace = await self._ws_repo.get_by_id_with_owner(workspace_id)
        if not workspace:
            raise NotFoundError("Workspace not found")
        update_data = data.model_dump(exclude_none=True)
        await self._ws_repo.update(workspace, **update_data)
        return await self._ws_repo.get_by_id_with_owner(workspace_id)

    async def list_user_workspaces(self, user_id: UUID) -> list[Workspace]:
        return await self._ws_repo.get_user_workspaces(user_id)

    async def invite_member(
        self, workspace_id: UUID, email: str, role: str, inviter_id: UUID
    ) -> None:
        await self._require_role(
            workspace_id, inviter_id, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
        )
        invitee = await self._user_repo.get_by_email(email)
        if not invitee:
            raise NotFoundError(f"No user with email {email}")

        existing = await self._user_repo.get_workspace_membership(invitee.id, workspace_id)
        if existing:
            raise ConflictError("User is already a member of this workspace")

        workspace_role = WorkspaceRole(role)
        self._db.add(
            UserWorkspaceMembership(
                user_id=invitee.id,
                workspace_id=workspace_id,
                role=workspace_role,
                joined_at=datetime.now(UTC),
                invited_by_id=inviter_id,
            )
        )
        await self._db.flush()

    async def remove_member(
        self, workspace_id: UUID, member_id: UUID, requester_id: UUID
    ) -> None:
        await self._require_role(
            workspace_id, requester_id, [WorkspaceRole.OWNER, WorkspaceRole.ADMIN]
        )
        membership = await self._user_repo.get_workspace_membership(member_id, workspace_id)
        if not membership:
            raise NotFoundError("Member not found in workspace")
        if membership.role == WorkspaceRole.OWNER:
            raise ForbiddenError("Cannot remove workspace owner")
        await self._db.delete(membership)
        await self._db.flush()

    async def _require_role(
        self, workspace_id: UUID, user_id: UUID, allowed_roles: list[WorkspaceRole]
    ) -> UserWorkspaceMembership:
        membership = await self._user_repo.get_workspace_membership(user_id, workspace_id)
        if not membership or membership.role not in allowed_roles:
            raise ForbiddenError("Insufficient permissions for this workspace")
        return membership
