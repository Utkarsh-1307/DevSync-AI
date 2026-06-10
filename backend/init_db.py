"""Startup script: dev creates tables via create_all; production runs alembic upgrade head."""
import asyncio
import logging
import os
import subprocess

from sqlalchemy import text

from app.db.session import engine
from app.db.base import Base
import app.models  # noqa: F401 — registers all models with Base.metadata

log = logging.getLogger(__name__)

IS_PRODUCTION = os.getenv("ENVIRONMENT", "development").lower() == "production"


async def init() -> None:
    if IS_PRODUCTION:
        log.info("Production: running alembic upgrade head")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True,
            cwd="/app",
        )
        if result.returncode != 0:
            log.error("Alembic migration failed: %s", result.stderr)
            raise RuntimeError(f"alembic upgrade head failed:\n{result.stderr}")
        log.info("Migrations applied: %s", result.stdout.strip())
    else:
        log.info("Development: running create_all + alembic stamp")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        log.info("Database tables ready")
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
