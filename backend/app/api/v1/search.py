from uuid import UUID

from fastapi import APIRouter, Query
from pydantic import BaseModel
from sqlalchemy import func, select, text

from app.api.deps import CurrentUser, DB, WorkspaceMember
from app.models.message import Message
from app.models.task import Task

router = APIRouter(prefix="/workspaces/{workspace_id}/search", tags=["search"])


class TaskResult(BaseModel):
    id: UUID
    title: str
    status: str
    priority: str
    project_id: UUID

    class Config:
        from_attributes = True


class MessageResult(BaseModel):
    id: UUID
    content: str
    channel_id: UUID
    created_at: str

    class Config:
        from_attributes = True


class SearchResponse(BaseModel):
    tasks: list[TaskResult]
    messages: list[MessageResult]
    query: str


@router.get("", response_model=SearchResponse)
async def search(
    workspace_id: UUID,
    current_user: CurrentUser,
    _: WorkspaceMember,
    db: DB,
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(10, ge=1, le=50),
) -> SearchResponse:
    # plainto_tsquery is forgiving — works with multi-word and partial phrases
    tsq = func.plainto_tsquery("english", q)

    task_rows = await db.execute(
        select(Task)
        .where(
            Task.workspace_id == workspace_id,
            text("tasks.search_vector @@ plainto_tsquery('english', :q)").bindparams(q=q),
        )
        .order_by(
            func.ts_rank(text("tasks.search_vector"), tsq).desc()
        )
        .limit(limit)
    )
    tasks = task_rows.scalars().all()

    msg_rows = await db.execute(
        select(Message)
        .where(
            Message.workspace_id == workspace_id,
            Message.is_deleted == False,
            text("messages.search_vector @@ plainto_tsquery('english', :q)").bindparams(q=q),
        )
        .order_by(
            func.ts_rank(text("messages.search_vector"), tsq).desc()
        )
        .limit(limit)
    )
    messages = msg_rows.scalars().all()

    return SearchResponse(
        query=q,
        tasks=[
            TaskResult(
                id=t.id,
                title=t.title,
                status=t.status.value if hasattr(t.status, "value") else str(t.status),
                priority=t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                project_id=t.project_id,
            )
            for t in tasks
        ],
        messages=[
            MessageResult(
                id=m.id,
                content=m.content[:200],
                channel_id=m.channel_id,
                created_at=m.created_at.isoformat(),
            )
            for m in messages
        ],
    )
