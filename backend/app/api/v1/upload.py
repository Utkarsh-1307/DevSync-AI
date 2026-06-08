from uuid import UUID

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

from app.api.deps import CurrentUser, DB, WorkspaceMember
from app.core.exceptions import ForbiddenError, NotFoundError
from app.repositories.task_attachment_repo import TaskAttachmentRepository
from app.repositories.user_repo import UserRepository
from app.repositories.workspace_repo import WorkspaceRepository
from app.services.storage_service import delete_file, upload_file

router = APIRouter(prefix="/upload", tags=["upload"])


class AttachmentResponse(BaseModel):
    id: UUID
    filename: str
    file_url: str
    content_type: str
    file_size: int

    class Config:
        from_attributes = True


class UrlResponse(BaseModel):
    url: str


@router.post("/avatar", response_model=UrlResponse)
async def upload_avatar(
    current_user: CurrentUser,
    db: DB,
    file: UploadFile = File(...),
) -> UrlResponse:
    url, _, _ = await upload_file(file, folder="avatars", is_image=True)

    # Delete old avatar from disk
    if current_user.avatar_url:
        delete_file(current_user.avatar_url)

    repo = UserRepository(db)
    await repo.update(current_user, avatar_url=url)
    return UrlResponse(url=url)


@router.post("/workspace/{workspace_id}/logo", response_model=UrlResponse)
async def upload_workspace_logo(
    workspace_id: UUID,
    current_user: CurrentUser,
    _: WorkspaceMember,
    db: DB,
    file: UploadFile = File(...),
) -> UrlResponse:
    repo = WorkspaceRepository(db)
    workspace = await repo.get_by_id(workspace_id)
    if not workspace:
        raise NotFoundError("Workspace not found")
    if workspace.owner_id != current_user.id:
        raise ForbiddenError("Only the workspace owner can change the logo")

    url, _, _ = await upload_file(file, folder="logos", is_image=True)

    if workspace.logo_url:
        delete_file(workspace.logo_url)

    await repo.update(workspace, logo_url=url)
    return UrlResponse(url=url)


@router.post(
    "/workspace/{workspace_id}/tasks/{task_id}/attachment",
    response_model=AttachmentResponse,
    status_code=201,
)
async def upload_task_attachment(
    workspace_id: UUID,
    task_id: UUID,
    current_user: CurrentUser,
    _: WorkspaceMember,
    db: DB,
    file: UploadFile = File(...),
) -> AttachmentResponse:
    url, content_type, file_size = await upload_file(
        file,
        folder=f"attachments/{workspace_id}",
        is_image=False,
    )

    repo = TaskAttachmentRepository(db)
    attachment = await repo.create(
        task_id=task_id,
        workspace_id=workspace_id,
        uploaded_by_id=current_user.id,
        filename=file.filename or "attachment",
        file_url=url,
        content_type=content_type,
        file_size=file_size,
    )
    return AttachmentResponse.model_validate(attachment)


@router.post(
    "/workspace/{workspace_id}/channels/{channel_id}/attachment",
    response_model=AttachmentResponse,
    status_code=201,
)
async def upload_message_attachment(
    workspace_id: UUID,
    channel_id: UUID,
    current_user: CurrentUser,
    _: WorkspaceMember,
    db: DB,
    file: UploadFile = File(...),
) -> AttachmentResponse:
    """Upload a file for use in a channel message. Returns URL + metadata to include in the message payload."""
    from app.models.task import TaskAttachment  # reuse same model temporarily

    # Detect if it's an image for resizing
    is_image = (file.content_type or "").startswith("image/")
    url, content_type, file_size = await upload_file(
        file,
        folder=f"messages/{workspace_id}/{channel_id}",
        is_image=is_image,
    )

    # We don't create a DB record here — the attachment is embedded in messages.attachments_json
    # Return metadata for the frontend to include in the MessageCreate payload
    from uuid import uuid4
    return AttachmentResponse(
        id=uuid4(),
        filename=file.filename or "attachment",
        file_url=url,
        content_type=content_type,
        file_size=file_size,
    )


@router.delete(
    "/workspace/{workspace_id}/tasks/{task_id}/attachment/{attachment_id}",
    status_code=204,
)
async def delete_task_attachment(
    workspace_id: UUID,
    task_id: UUID,
    attachment_id: UUID,
    current_user: CurrentUser,
    _: WorkspaceMember,
    db: DB,
) -> None:
    repo = TaskAttachmentRepository(db)
    attachment = await repo.get_by_id_in_workspace(attachment_id, workspace_id)
    if not attachment:
        raise NotFoundError("Attachment not found")
    if attachment.uploaded_by_id != current_user.id:
        raise ForbiddenError("Can only delete your own attachments")

    delete_file(attachment.file_url)
    await repo.delete(attachment)
