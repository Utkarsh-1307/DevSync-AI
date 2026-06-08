from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, TenantIsolationError, UnauthorizedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserWorkspaceMembership, WorkspaceRole
from app.repositories.user_repo import UserRepository

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not credentials:
        raise UnauthorizedError("Missing authorization header")

    payload = decode_token(credentials.credentials, expected_type="access")
    user_id = UUID(payload["sub"])

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise UnauthorizedError("User not found")

    return user


async def get_workspace_membership(
    workspace_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserWorkspaceMembership:
    repo = UserRepository(db)
    membership = await repo.get_workspace_membership(current_user.id, workspace_id)
    if not membership:
        raise TenantIsolationError("Not a member of this workspace")
    return membership


async def require_workspace_admin(
    membership: Annotated[UserWorkspaceMembership, Depends(get_workspace_membership)],
) -> UserWorkspaceMembership:
    if membership.role not in (WorkspaceRole.OWNER, WorkspaceRole.ADMIN):
        raise ForbiddenError("Admin or owner role required")
    return membership


def pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
) -> dict:
    return {"limit": page_size, "offset": (page - 1) * page_size, "page": page, "page_size": page_size}


CurrentUser = Annotated[User, Depends(get_current_user)]
WorkspaceMember = Annotated[UserWorkspaceMembership, Depends(get_workspace_membership)]
WorkspaceAdmin = Annotated[UserWorkspaceMembership, Depends(require_workspace_admin)]
DB = Annotated[AsyncSession, Depends(get_db)]
Pagination = Annotated[dict, Depends(pagination)]
