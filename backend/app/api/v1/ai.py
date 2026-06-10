import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DB, WorkspaceMember
from app.core.config import settings
from app.db.redis import get_redis_client
from app.models.channel import Channel
from app.models.project import Project
from app.models.task import Task
from app.services.ai_service import AIService

router = APIRouter(prefix="/workspaces/{workspace_id}/ai", tags=["ai"])


class TaskSummarizeRequest(BaseModel):
    title: str
    description: str = ""
    comments: list[str] = Field(default_factory=list)


class SuggestDescriptionRequest(BaseModel):
    title: str
    project_name: str = "this project"


class StandupRequest(BaseModel):
    tasks: list[dict] = Field(default_factory=list)
    yesterday_tasks: list[dict] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[dict] | None = None
    workspace_name: str = "DevSync AI"


class AITextResponse(BaseModel):
    result: str


async def check_ai_rate_limit(current_user: CurrentUser) -> None:
    today = datetime.date.today().isoformat()
    key = f"ai_limit:{current_user.id}:{today}"
    try:
        redis = get_redis_client()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, 86400)
        await redis.aclose()
        if count > settings.AI_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"AI request limit reached ({settings.AI_DAILY_LIMIT}/day). "
                    "Resets at midnight UTC."
                ),
            )
    except HTTPException:
        raise
    except Exception:
        pass  # never block the user if Redis is unavailable


async def _get_workspace_data(workspace_id: UUID, db) -> dict:
    projects_result = await db.execute(
        select(Project).where(Project.workspace_id == workspace_id)
    )
    projects = [
        {"id": str(p.id), "name": p.name, "key": p.key}
        for p in projects_result.scalars().all()
    ]

    tasks_result = await db.execute(
        select(Task).where(Task.workspace_id == workspace_id)
    )
    tasks = [
        {
            "id": str(t.id),
            "title": t.title,
            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
            "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
            "project_id": str(t.project_id),
        }
        for t in tasks_result.scalars().all()
    ]

    channels_result = await db.execute(
        select(Channel).where(Channel.workspace_id == workspace_id)
    )
    channels = [
        {"id": str(c.id), "name": c.name, "description": getattr(c, "description", None)}
        for c in channels_result.scalars().all()
    ]

    return {"projects": projects, "tasks": tasks, "channels": channels}


@router.post("/summarize-task", response_model=AITextResponse)
async def summarize_task(
    workspace_id: UUID,
    data: TaskSummarizeRequest,
    current_user: CurrentUser,
    _: WorkspaceMember,
    __: None = Depends(check_ai_rate_limit),
) -> AITextResponse:
    service = AIService()
    result = await service.summarize_task(data.title, data.description, data.comments)
    return AITextResponse(result=result)


@router.post("/suggest-description", response_model=AITextResponse)
async def suggest_description(
    workspace_id: UUID,
    data: SuggestDescriptionRequest,
    current_user: CurrentUser,
    _: WorkspaceMember,
    __: None = Depends(check_ai_rate_limit),
) -> AITextResponse:
    service = AIService()
    result = await service.suggest_task_description(data.title, data.project_name)
    return AITextResponse(result=result)


@router.post("/standup", response_model=AITextResponse)
async def generate_standup(
    workspace_id: UUID,
    data: StandupRequest,
    current_user: CurrentUser,
    _: WorkspaceMember,
    __: None = Depends(check_ai_rate_limit),
) -> AITextResponse:
    service = AIService()
    result = await service.generate_standup(data.tasks, data.yesterday_tasks, data.blockers)
    return AITextResponse(result=result)


@router.post("/chat", response_model=AITextResponse)
async def chat(
    workspace_id: UUID,
    data: ChatRequest,
    current_user: CurrentUser,
    _: WorkspaceMember,
    db: DB,
    __: None = Depends(check_ai_rate_limit),
) -> AITextResponse:
    workspace_data = await _get_workspace_data(workspace_id, db)
    service = AIService()
    result = await service.answer_question(
        data.question,
        data.workspace_name,
        data.history,
        workspace_data,
    )
    return AITextResponse(result=result)
