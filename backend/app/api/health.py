from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import engine

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Healthcheck: verifica app e conectividade com o Postgres."""
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    return {
        "status": "ok",
        "service": settings.project_name,
        "version": settings.api_version,
        "environment": settings.environment,
        "database": "up" if db_ok else "down",
    }
