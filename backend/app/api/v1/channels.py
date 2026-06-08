from uuid import UUID

from fastapi import APIRouter
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DB, WorkspaceMember, WorkspaceAdmin
from app.models.channel import Channel, ChannelMembership, ChannelType
from app.models.user import User, UserWorkspaceMembership, WorkspaceRole
from app.schemas.channel import ChannelCreate, ChannelResponse, ChannelUpdate, DirectMessageCreate
from app.schemas.common import MessageResponse
from app.schemas.message import MessageCreate, MessageResponse as MsgResponse, MessageUpdate, ReactionToggleRequest
from app.schemas.user import UserSummary, WorkspaceMemberResponse
from app.core.exceptions import ForbiddenError, NotFoundError

router = APIRouter(prefix="/workspaces/{workspace_id}/channels", tags=["channels"])


@router.post("", response_model=ChannelResponse, status_code=201)
async def create_channel(
    workspace_id: UUID, data: ChannelCreate, current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> ChannelResponse:
    channel = Channel(
        workspace_id=workspace_id,
        name=data.name,
        description=data.description,
        channel_type=data.channel_type,
        created_by_id=current_user.id,
    )
    db.add(channel)
    await db.flush()
    db.add(
        ChannelMembership(
            user_id=current_user.id,
            channel_id=channel.id,
            workspace_id=workspace_id,
        )
    )
    await db.flush()
    result = await db.execute(
        select(Channel).where(Channel.id == channel.id).options(
            selectinload(Channel.created_by),
            selectinload(Channel.memberships).selectinload(ChannelMembership.user),
        )
    )
    return ChannelResponse.model_validate(result.scalar_one())


@router.get("", response_model=list[ChannelResponse])
async def list_channels(
    workspace_id: UUID, current_user: CurrentUser, db: DB, _: WorkspaceMember
) -> list[ChannelResponse]:
    result = await db.execute(
        select(Channel)
        .where(Channel.workspace_id == workspace_id)
        .where(Channel.is_archived == False)
        .where(Channel.channel_type != ChannelType.DIRECT)
        .options(
            selectinload(Channel.created_by),
            selectinload(Channel.memberships).selectinload(ChannelMembership.user),
        )
        .order_by(Channel.name)
    )
    return [ChannelResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/dm", response_model=ChannelResponse, status_code=201)
async def create_direct_message(
    workspace_id: UUID,
    data: DirectMessageCreate,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> ChannelResponse:
    user_ids = sorted([str(current_user.id), str(data.target_user_id)])
    dm_key = f"{user_ids[0]}:{user_ids[1]}"

    result = await db.execute(select(Channel).where(Channel.dm_key == dm_key))
    existing = result.scalar_one_or_none()
    _opts = [
        selectinload(Channel.created_by),
        selectinload(Channel.memberships).selectinload(ChannelMembership.user),
    ]
    if existing:
        result2 = await db.execute(
            select(Channel).where(Channel.id == existing.id).options(*_opts)
        )
        return ChannelResponse.model_validate(result2.scalar_one())

    channel = Channel(
        workspace_id=workspace_id,
        name=dm_key,
        channel_type=ChannelType.DIRECT,
        created_by_id=current_user.id,
        dm_key=dm_key,
    )
    db.add(channel)
    await db.flush()

    for uid in [current_user.id, data.target_user_id]:
        db.add(ChannelMembership(user_id=uid, channel_id=channel.id, workspace_id=workspace_id))
    await db.flush()

    result3 = await db.execute(
        select(Channel).where(Channel.id == channel.id).options(*_opts)
    )
    return ChannelResponse.model_validate(result3.scalar_one())


@router.get("/{channel_id}/messages", response_model=list[MsgResponse])
async def get_messages(
    workspace_id: UUID,
    channel_id: UUID,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
    limit: int = 50,
    before_id: UUID | None = None,
) -> list[MsgResponse]:
    from app.services.message_service import MessageService

    service = MessageService(db)
    messages = await service.get_channel_messages(channel_id, workspace_id, limit, before_id)
    return [MsgResponse.model_validate(m) for m in reversed(messages)]


@router.post("/{channel_id}/messages", response_model=MsgResponse, status_code=201)
async def send_message(
    workspace_id: UUID,
    channel_id: UUID,
    data: MessageCreate,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> MsgResponse:
    from app.services.message_service import MessageService
    from app.websockets.manager import ws_manager

    service = MessageService(db)
    message = await service.send_message(channel_id, workspace_id, data, current_user.id)
    response = MsgResponse.model_validate(message)

    # Fan out via WebSocket
    import json
    await ws_manager.broadcast_to_channel(
        channel_id,
        json.dumps({"event": "message.new", "data": response.model_dump(mode="json")}),
    )
    return response


@router.patch("/{channel_id}/messages/{message_id}", response_model=MsgResponse)
async def edit_message(
    workspace_id: UUID,
    channel_id: UUID,
    message_id: UUID,
    data: MessageUpdate,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> MsgResponse:
    from app.services.message_service import MessageService

    service = MessageService(db)
    message = await service.edit_message(message_id, workspace_id, data, current_user.id)
    return MsgResponse.model_validate(message)


@router.delete("/{channel_id}/messages/{message_id}", response_model=MessageResponse)
async def delete_message(
    workspace_id: UUID,
    channel_id: UUID,
    message_id: UUID,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> MessageResponse:
    from app.services.message_service import MessageService

    service = MessageService(db)
    await service.delete_message(message_id, workspace_id, current_user.id)
    return MessageResponse(message="Message deleted")


@router.post("/{channel_id}/messages/{message_id}/reactions")
async def toggle_reaction(
    workspace_id: UUID,
    channel_id: UUID,
    message_id: UUID,
    data: ReactionToggleRequest,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> dict:
    from app.services.message_service import MessageService

    service = MessageService(db)
    return await service.toggle_reaction(message_id, workspace_id, data.emoji, current_user.id)


# ─── DM channels for current user ────────────────────────────────────────────

@router.get("/dms", response_model=list[ChannelResponse])
async def list_dm_channels(
    workspace_id: UUID,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> list[ChannelResponse]:
    """List all DM channels the current user is a member of."""
    result = await db.execute(
        select(Channel)
        .join(ChannelMembership, ChannelMembership.channel_id == Channel.id)
        .where(Channel.workspace_id == workspace_id)
        .where(Channel.channel_type == ChannelType.DIRECT)
        .where(Channel.is_archived == False)
        .where(ChannelMembership.user_id == current_user.id)
        .options(
            selectinload(Channel.created_by),
            selectinload(Channel.memberships).selectinload(ChannelMembership.user),
        )
    )
    return [ChannelResponse.model_validate(c) for c in result.scalars().all()]


# ─── Workspace members list ───────────────────────────────────────────────────

# This is on a separate router-like prefix but we attach it here for convenience
from app.schemas.user import WorkspaceMemberResponse  # noqa: re-import clean ref


# ─── Channel member management (admin) ───────────────────────────────────────

@router.get("/{channel_id}/members", response_model=list[UserSummary])
async def list_channel_members(
    workspace_id: UUID,
    channel_id: UUID,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
) -> list[UserSummary]:
    """List members of a channel."""
    result = await db.execute(
        select(User)
        .join(ChannelMembership, ChannelMembership.user_id == User.id)
        .where(ChannelMembership.channel_id == channel_id)
        .where(ChannelMembership.workspace_id == workspace_id)
    )
    return [UserSummary.model_validate(u) for u in result.scalars().all()]


@router.delete("/{channel_id}/members/{user_id}", status_code=204)
async def remove_channel_member(
    workspace_id: UUID,
    channel_id: UUID,
    user_id: UUID,
    current_user: CurrentUser,
    membership: WorkspaceAdmin,
    db: DB,
) -> None:
    """Remove a user from a channel. Requires admin or owner role."""
    # Load channel to check creator
    ch_result = await db.execute(select(Channel).where(Channel.id == channel_id).where(Channel.workspace_id == workspace_id))
    channel = ch_result.scalar_one_or_none()
    if not channel:
        raise NotFoundError("Channel not found")
    if channel.created_by_id == user_id and membership.role != WorkspaceRole.OWNER:
        raise ForbiddenError("Cannot remove the channel creator")

    # Find and delete membership
    mem_result = await db.execute(
        select(ChannelMembership)
        .where(ChannelMembership.channel_id == channel_id)
        .where(ChannelMembership.user_id == user_id)
    )
    ch_membership = mem_result.scalar_one_or_none()
    if not ch_membership:
        raise NotFoundError("User is not a member of this channel")
    await db.delete(ch_membership)
    await db.flush()

    # Notify via WebSocket
    from app.websockets.manager import ws_manager
    import json
    await ws_manager.send_to_user(
        user_id,
        json.dumps({"event": "channel.removed", "data": {"channel_id": str(channel_id), "workspace_id": str(workspace_id)}}),
    )
