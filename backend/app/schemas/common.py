import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool
    has_prev: bool


class UUIDResponse(OrmBase):
    id: uuid.UUID


class TimestampedResponse(UUIDResponse):
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    message: str
