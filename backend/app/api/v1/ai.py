from uuid import UUID

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.api.deps import CurrentUser, DB, WorkspaceMember
from app.models.channel import Channel
from app.models.project import Project
from app.models.task import Task
from app.services.ai_service import AIService
from app.repositories.workspace_repo import WorkspaceRepository

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


async def _get_workspace_data(workspace_id: UUID, db) -> dict:
    """Fetch tasks, projects, and channels for the given workspace."""
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
    workspace_id: UUID, data: TaskSummarizeRequest, current_user: CurrentUser, _: WorkspaceMember
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
) -> AITextResponse:
    service = AIService()
    result = await service.suggest_task_description(data.title, data.project_name)
    return AITextResponse(result=result)


@router.post("/standup", response_model=AITextResponse)
async def generate_standup(
    workspace_id: UUID, data: StandupRequest, current_user: CurrentUser, _: WorkspaceMember
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
