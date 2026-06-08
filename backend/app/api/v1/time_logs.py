import uuid
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel as PydanticBase
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, require_workspace_member
from app.models import TimeLog
from app.models.task import Task
from app.models.user import User

router = APIRouter(tags=["time-logs"])


# ---------- schemas ----------

class TimeLogCreate(PydanticBase):
    hours: float
    description: Optional[str] = None
    logged_date: date


class UserSummary(PydanticBase):
    id: uuid.UUID
    full_name: str
    email: str
    model_config = {"from_attributes": True}


class TaskSummary(PydanticBase):
    id: uuid.UUID
    title: str
    model_config = {"from_attributes": True}


class TimeLogOut(PydanticBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID
    task_id: uuid.UUID
    task: TaskSummary
    user: UserSummary
    description: Optional[str]
    hours: float
    logged_date: date
    model_config = {"from_attributes": True}


class TimesheetEntry(PydanticBase):
    user: UserSummary
    week_start: date
    total_hours: float
    daily_hours: dict[str, float]


# ---------- helpers ----------

def _load_opts():
    return [selectinload(TimeLog.user), selectinload(TimeLog.task)]


async def _get_log_or_404(log_id: uuid.UUID, task_id: uuid.UUID, db: AsyncSession) -> TimeLog:
    result = await db.execute(
        select(TimeLog).where(TimeLog.id == log_id, TimeLog.task_id == task_id).options(*_load_opts())
    )
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Time log not found")
    return log


# ---------- routes ----------

@router.post(
    "/workspaces/{workspace_id}/projects/{project_id}/tasks/{task_id}/time-logs",
    response_model=TimeLogOut,
    status_code=status.HTTP_201_CREATED,
)
async def log_time(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    body: TimeLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_workspace_member),
):
    result = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")

    log = TimeLog(
        workspace_id=workspace_id,
        project_id=project_id,
        task_id=task_id,
        user_id=current_user.id,
        **body.model_dump(),
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    result = await db.execute(select(TimeLog).where(TimeLog.id == log.id).options(*_load_opts()))
    return result.scalar_one()


@router.get(
    "/workspaces/{workspace_id}/projects/{project_id}/tasks/{task_id}/time-logs",
    response_model=list[TimeLogOut],
)
async def list_time_logs(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    result = await db.execute(
        select(TimeLog)
        .where(TimeLog.workspace_id == workspace_id, TimeLog.task_id == task_id)
        .options(*_load_opts())
        .order_by(TimeLog.logged_date.desc())
    )
    return result.scalars().all()


@router.delete(
    "/workspaces/{workspace_id}/projects/{project_id}/tasks/{task_id}/time-logs/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_time_log(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    task_id: uuid.UUID,
    log_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_workspace_member),
):
    log = await _get_log_or_404(log_id, task_id, db)
    if log.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete another user's time log")
    await db.delete(log)
    await db.commit()


@router.get(
    "/workspaces/{workspace_id}/timesheets",
    response_model=list[TimesheetEntry],
)
async def get_timesheets(
    workspace_id: uuid.UUID,
    week_start: Optional[date] = Query(None, description="ISO date of Monday (defaults to current week)"),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    if not week_start:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    week_end = week_start + timedelta(days=6)

    result = await db.execute(
        select(TimeLog)
        .where(
            TimeLog.workspace_id == workspace_id,
            TimeLog.logged_date >= week_start,
            TimeLog.logged_date <= week_end,
        )
        .options(selectinload(TimeLog.user), selectinload(TimeLog.task))
        .order_by(TimeLog.user_id, TimeLog.logged_date)
    )
    logs = result.scalars().all()

    # Group by user
    by_user: dict[uuid.UUID, list[TimeLog]] = {}
    for log in logs:
        by_user.setdefault(log.user_id, []).append(log)

    entries: list[TimesheetEntry] = []
    for user_id, user_logs in by_user.items():
        user = user_logs[0].user
        daily: dict[str, float] = {}
        total = 0.0
        for log in user_logs:
            day_key = log.logged_date.isoformat()
            daily[day_key] = daily.get(day_key, 0.0) + log.hours
            total += log.hours
        entries.append(
            TimesheetEntry(
                user=UserSummary(id=user.id, full_name=user.full_name, email=user.email),
                week_start=week_start,
                total_hours=total,
                daily_hours=daily,
            )
        )

    return entries
