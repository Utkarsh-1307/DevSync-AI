import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DB, WorkspaceMember
from app.models import Issue, IssueStatus, IssuePriority
from app.models.user import User

router = APIRouter(tags=["issues"])


# ---------- schemas ----------

class IssueCreate(PydanticBase):
    title: str
    description: Optional[str] = None
    status: IssueStatus = IssueStatus.OPEN
    priority: IssuePriority = IssuePriority.MEDIUM
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[str] = None


class IssueUpdate(PydanticBase):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[IssueStatus] = None
    priority: Optional[IssuePriority] = None
    assignee_id: Optional[uuid.UUID] = None
    due_date: Optional[str] = None


class UserSummary(PydanticBase):
    id: uuid.UUID
    full_name: str
    email: str
    model_config = {"from_attributes": True}


class LabelOut(PydanticBase):
    id: uuid.UUID
    name: str
    color: str
    model_config = {"from_attributes": True}


class IssueOut(PydanticBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID
    title: str
    description: Optional[str]
    status: IssueStatus
    priority: IssuePriority
    assignee: Optional[UserSummary]
    reporter: UserSummary
    due_date: Optional[str]
    resolved_at: Optional[str]
    labels: list[LabelOut]
    model_config = {"from_attributes": True}


# ---------- helpers ----------

def _load_opts():
    return [
        selectinload(Issue.assignee),
        selectinload(Issue.reporter),
        selectinload(Issue.labels),
    ]


async def _get_issue_or_404(
    issue_id: uuid.UUID,
    project_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db,
) -> Issue:
    result = await db.execute(
        select(Issue)
        .where(Issue.id == issue_id, Issue.project_id == project_id, Issue.workspace_id == workspace_id)
        .options(*_load_opts())
    )
    issue = result.scalar_one_or_none()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


# ---------- routes ----------

@router.post(
    "/workspaces/{workspace_id}/projects/{project_id}/issues",
    response_model=IssueOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_issue(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    body: IssueCreate,
    current_user: CurrentUser,
    db: DB,
    _: WorkspaceMember,
):
    issue = Issue(
        workspace_id=workspace_id,
        project_id=project_id,
        reporter_id=current_user.id,
        **body.model_dump(exclude_none=True),
    )
    db.add(issue)
    await db.commit()
    await db.refresh(issue)
    result = await db.execute(
        select(Issue).where(Issue.id == issue.id).options(*_load_opts())
    )
    return result.scalar_one()


@router.get(
    "/workspaces/{workspace_id}/projects/{project_id}/issues",
    response_model=list[IssueOut],
)
async def list_issues(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    db: DB,
    _: WorkspaceMember,
    status_filter: Optional[IssueStatus] = Query(None, alias="status"),
    priority_filter: Optional[IssuePriority] = Query(None, alias="priority"),
    assignee_id: Optional[uuid.UUID] = Query(None),
):
    q = select(Issue).where(Issue.workspace_id == workspace_id, Issue.project_id == project_id)
    if status_filter:
        q = q.where(Issue.status == status_filter)
    if priority_filter:
        q = q.where(Issue.priority == priority_filter)
    if assignee_id:
        q = q.where(Issue.assignee_id == assignee_id)
    q = q.options(*_load_opts()).order_by(Issue.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.get(
    "/workspaces/{workspace_id}/projects/{project_id}/issues/{issue_id}",
    response_model=IssueOut,
)
async def get_issue(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    db: DB,
    _: WorkspaceMember,
):
    return await _get_issue_or_404(issue_id, project_id, workspace_id, db)


@router.patch(
    "/workspaces/{workspace_id}/projects/{project_id}/issues/{issue_id}",
    response_model=IssueOut,
)
async def update_issue(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    body: IssueUpdate,
    db: DB,
    _: WorkspaceMember,
):
    issue = await _get_issue_or_404(issue_id, project_id, workspace_id, db)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(issue, field, val)
    await db.commit()
    return await _get_issue_or_404(issue_id, project_id, workspace_id, db)


@router.delete(
    "/workspaces/{workspace_id}/projects/{project_id}/issues/{issue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_issue(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    issue_id: uuid.UUID,
    db: DB,
    _: WorkspaceMember,
):
    issue = await _get_issue_or_404(issue_id, project_id, workspace_id, db)
    await db.delete(issue)
    await db.commit()
