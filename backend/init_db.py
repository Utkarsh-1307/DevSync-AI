"""Startup script: creates all tables if they don't exist, then stamps Alembic head."""
import asyncio
import logging

from sqlalchemy import text

from app.db.session import engine
from app.db.base import Base
import app.models  # noqa: F401 — registers all models with Base.metadata

log = logging.getLogger(__name__)


async def init() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    log.info("Database tables ready")

    # Stamp alembic_version so future `alembic upgrade head` is a no-op
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "INSERT INTO alembic_version (version_num) VALUES ('initial') "
                    "ON CONFLICT DO NOTHING"
                )
            )
    except Exception:
        pass  # alembic_version table may not exist yet; safe to ignore


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(init())
