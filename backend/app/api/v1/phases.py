import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel as PydanticBase
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db, require_workspace_member
from app.models import Phase, PhaseStatus
from app.models.task import Task
from app.models.user import User

router = APIRouter(tags=["phases"])


# ---------- schemas ----------

class PhaseCreate(PydanticBase):
    name: str
    description: Optional[str] = None
    status: PhaseStatus = PhaseStatus.PLANNED
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class PhaseUpdate(PydanticBase):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[PhaseStatus] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class PhaseOut(PydanticBase):
    id: uuid.UUID
    workspace_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: Optional[str]
    status: PhaseStatus
    start_date: Optional[str]
    end_date: Optional[str]
    task_count: int = 0
    model_config = {"from_attributes": True}


# ---------- helpers ----------

async def _get_phase_or_404(
    phase_id: uuid.UUID,
    project_id: uuid.UUID,
    workspace_id: uuid.UUID,
    db: AsyncSession,
) -> Phase:
    result = await db.execute(
        select(Phase)
        .where(Phase.id == phase_id, Phase.project_id == project_id, Phase.workspace_id == workspace_id)
        .options(selectinload(Phase.tasks))
    )
    phase = result.scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=404, detail="Phase not found")
    return phase


def _phase_to_out(phase: Phase) -> PhaseOut:
    return PhaseOut(
        id=phase.id,
        workspace_id=phase.workspace_id,
        project_id=phase.project_id,
        name=phase.name,
        description=phase.description,
        status=phase.status,
        start_date=phase.start_date.isoformat() if phase.start_date else None,
        end_date=phase.end_date.isoformat() if phase.end_date else None,
        task_count=len(phase.tasks),
    )


# ---------- routes ----------

@router.post(
    "/workspaces/{workspace_id}/projects/{project_id}/phases",
    response_model=PhaseOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_phase(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    body: PhaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_workspace_member),
):
    phase = Phase(
        workspace_id=workspace_id,
        project_id=project_id,
        **body.model_dump(exclude_none=True),
    )
    db.add(phase)
    await db.commit()
    await db.refresh(phase)
    result = await db.execute(
        select(Phase).where(Phase.id == phase.id).options(selectinload(Phase.tasks))
    )
    return _phase_to_out(result.scalar_one())


@router.get(
    "/workspaces/{workspace_id}/projects/{project_id}/phases",
    response_model=list[PhaseOut],
)
async def list_phases(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    result = await db.execute(
        select(Phase)
        .where(Phase.workspace_id == workspace_id, Phase.project_id == project_id)
        .options(selectinload(Phase.tasks))
        .order_by(Phase.created_at.asc())
    )
    return [_phase_to_out(p) for p in result.scalars().all()]


@router.patch(
    "/workspaces/{workspace_id}/projects/{project_id}/phases/{phase_id}",
    response_model=PhaseOut,
)
async def update_phase(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    phase_id: uuid.UUID,
    body: PhaseUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    phase = await _get_phase_or_404(phase_id, project_id, workspace_id, db)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(phase, field, val)
    await db.commit()
    return _phase_to_out(await _get_phase_or_404(phase_id, project_id, workspace_id, db))


@router.delete(
    "/workspaces/{workspace_id}/projects/{project_id}/phases/{phase_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_phase(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    phase_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    phase = await _get_phase_or_404(phase_id, project_id, workspace_id, db)
    await db.delete(phase)
    await db.commit()


@router.post(
    "/workspaces/{workspace_id}/projects/{project_id}/phases/{phase_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def assign_task_to_phase(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    phase_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    await _get_phase_or_404(phase_id, project_id, workspace_id, db)
    result = await db.execute(select(Task).where(Task.id == task_id, Task.project_id == project_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.phase_id = phase_id
    await db.commit()


@router.delete(
    "/workspaces/{workspace_id}/projects/{project_id}/phases/{phase_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_task_from_phase(
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    phase_id: uuid.UUID,
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
    __: None = Depends(require_workspace_member),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.phase_id == phase_id, Task.project_id == project_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found in this phase")
    task.phase_id = None
    await db.commit()
