"""
Test configuration.

Strategy: function-scoped engine per test (fresh schema per test).
Rate limiter bypass: each test sends a unique X-Forwarded-For IP so
Redis rate-limit counters never collide across tests.
"""
import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.user import User, UserStatus

TEST_DATABASE_URL = (
    "postgresql+asyncpg://devsync:devsync_dev@postgres:5432/devsync_test"
)


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine) -> AsyncGenerator[AsyncSession, None]:
    factory = async_sessionmaker(bind=engine, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db

    # Unique IP per test — avoids collisions in Redis rate-limit counters
    test_ip = f"10.0.{uuid.uuid4().int % 255}.{uuid.uuid4().int % 255}"

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"X-Forwarded-For": test_ip},
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db: AsyncSession) -> User:
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=hash_password("Password123"),
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User) -> dict:
    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
