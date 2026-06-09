import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel as PydanticBase
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_workspace_member
from app.models.issue import Issue, IssueStatus, IssuePriority
from app.models.phase import Phase, PhaseStatus
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.user import User

router = APIRouter(tags=["dashboard"])


# ---------- schemas ----------

class TaskSummary(PydanticBase):
    id: uuid.UUID
    title: str
    status: TaskStatus
    priority: TaskPriority
    project_id: uuid.UUID
    due_date: Optional[str] = None
    model_config = {"from_attributes": True}


class IssueSummary(PydanticBase):
    id: uuid.UUID
    title: str
    status: IssueStatus
    priority: IssuePriority
    project_id: uuid.UUID
    due_date: Optional[str] = None
    model_config = {"from_attributes": True}


class DashboardStats(PydanticBase):
    open_tasks: int
    closed_tasks: int
    open_issues: int
    closed_issues: int
    open_phases: int
    closed_phases: int
    my_tasks: list[TaskSummary]
    my_issues: list[IssueSummary]


# ---------- route ----------

@router.get(
    "/workspaces/{workspace_id}/dashboard",
    response_model=DashboardStats,
)
async def get_dashboard(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_workspace_member),
):
    open_task_statuses = [
        TaskStatus.BACKLOG, TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW
    ]
    closed_task_statuses = [TaskStatus.DONE, TaskStatus.CANCELLED]

    open_issue_statuses = [IssueStatus.OPEN, IssueStatus.IN_PROGRESS]
    closed_issue_statuses = [IssueStatus.RESOLVED, IssueStatus.CLOSED]

    open_phase_statuses = [PhaseStatus.PLANNED, PhaseStatus.ACTIVE]

    # Count queries — all scoped to workspace
    open_tasks_q = await db.execute(
        select(func.count()).where(
            Task.workspace_id == workspace_id,
            Task.status.in_(open_task_statuses),
        )
    )
    closed_tasks_q = await db.execute(
        select(func.count()).where(
            Task.workspace_id == workspace_id,
            Task.status.in_(closed_task_statuses),
        )
    )
    open_issues_q = await db.execute(
        select(func.count()).where(
            Issue.workspace_id == workspace_id,
            Issue.status.in_(open_issue_statuses),
        )
    )
    closed_issues_q = await db.execute(
        select(func.count()).where(
            Issue.workspace_id == workspace_id,
            Issue.status.in_(closed_issue_statuses),
        )
    )
    open_phases_q = await db.execute(
        select(func.count()).where(
            Phase.workspace_id == workspace_id,
            Phase.status.in_(open_phase_statuses),
        )
    )
    closed_phases_q = await db.execute(
        select(func.count()).where(
            Phase.workspace_id == workspace_id,
            Phase.status == PhaseStatus.COMPLETED,
        )
    )

    # My tasks — assigned to current user
    my_tasks_q = await db.execute(
        select(Task)
        .where(
            Task.workspace_id == workspace_id,
            Task.assignee_id == current_user.id,
            Task.status.in_(open_task_statuses),
        )
        .order_by(Task.created_at.desc())
        .limit(10)
    )

    # My issues — assigned to current user
    my_issues_q = await db.execute(
        select(Issue)
        .where(
            Issue.workspace_id == workspace_id,
            Issue.assignee_id == current_user.id,
            Issue.status.in_(open_issue_statuses),
        )
        .order_by(Issue.created_at.desc())
        .limit(10)
    )

    my_tasks = my_tasks_q.scalars().all()
    my_issues = my_issues_q.scalars().all()

    return DashboardStats(
        open_tasks=open_tasks_q.scalar() or 0,
        closed_tasks=closed_tasks_q.scalar() or 0,
        open_issues=open_issues_q.scalar() or 0,
        closed_issues=closed_issues_q.scalar() or 0,
        open_phases=open_phases_q.scalar() or 0,
        closed_phases=closed_phases_q.scalar() or 0,
        my_tasks=[
            TaskSummary(
                id=t.id,
                title=t.title,
                status=t.status,
                priority=t.priority,
                project_id=t.project_id,
                due_date=t.due_date.isoformat() if t.due_date else None,
            )
            for t in my_tasks
        ],
        my_issues=[
            IssueSummary(
                id=i.id,
                title=i.title,
                status=i.status,
                priority=i.priority,
                project_id=i.project_id,
                due_date=i.due_date.isoformat() if i.due_date else None,
            )
            for i in my_issues
        ],
    )
