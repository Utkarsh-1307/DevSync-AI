import uuid
from datetime import datetime

from pydantic import Field

from app.models.task import TaskPriority, TaskStatus
from app.schemas.common import OrmBase, TimestampedResponse
from app.schemas.user import UserSummary


class TaskCreate(OrmBase):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.NONE
    assignee_id: uuid.UUID | None = None
    due_date: datetime | None = None
    estimated_hours: int | None = Field(None, ge=0)
    parent_task_id: uuid.UUID | None = None
    labels: list[str] = Field(default_factory=list)


class TaskUpdate(OrmBase):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee_id: uuid.UUID | None = None
    due_date: datetime | None = None
    estimated_hours: int | None = Field(None, ge=0)
    labels: list[str] | None = None
    # Optimistic locking: client must send current version
    version: int = Field(..., ge=1)


class LabelResponse(OrmBase):
    id: uuid.UUID
    name: str
    color: str


class TaskResponse(TimestampedResponse):
    workspace_id: uuid.UUID
    project_id: uuid.UUID
    parent_task_id: uuid.UUID | None
    title: str
    description: str | None
    status: TaskStatus
    priority: TaskPriority
    assignee: UserSummary | None
    reporter: UserSummary
    due_date: datetime | None
    completed_at: datetime | None
    estimated_hours: int | None
    logged_hours: int
    position: int
    version: int
    labels: list[LabelResponse]


class TaskCommentCreate(OrmBase):
    content: str = Field(min_length=1, max_length=10000)


class TaskCommentResponse(TimestampedResponse):
    task_id: uuid.UUID
    author: UserSummary
    content: str
    is_edited: bool
