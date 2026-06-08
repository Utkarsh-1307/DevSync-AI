from typing import Any, Generic, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import BaseModel

ModelT = TypeVar("ModelT", bound=BaseModel)


class BaseRepository(Generic[ModelT]):
    def __init__(self, model: type[ModelT], db: AsyncSession):
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> ModelT | None:
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_by_id_required(self, id: UUID) -> ModelT:
        from app.core.exceptions import NotFoundError

        obj = await self.get_by_id(id)
        if obj is None:
            raise NotFoundError(f"{self.model.__name__} {id} not found")
        return obj

    async def list(
        self,
        filters: list[Any] | None = None,
        order_by: Any | None = None,
        limit: int = 25,
        offset: int = 0,
    ) -> tuple[list[ModelT], int]:
        query = select(self.model)
        count_query = select(func.count()).select_from(self.model)

        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)

        if order_by is not None:
            query = query.order_by(order_by)

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def create(self, **kwargs: Any) -> ModelT:
        obj = self.model(**kwargs)
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def update(self, obj: ModelT, **kwargs: Any) -> ModelT:
        for key, value in kwargs.items():
            setattr(obj, key, value)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj

    async def delete(self, obj: ModelT) -> None:
        await self.db.delete(obj)
        await self.db.flush()

    async def save(self, obj: ModelT) -> ModelT:
        self.db.add(obj)
        await self.db.flush()
        await self.db.refresh(obj)
        return obj
