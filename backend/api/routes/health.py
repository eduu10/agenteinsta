import traceback
from fastapi import APIRouter
from instagram.monitor import monitor

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "monitor_running": monitor.is_running,
    }


@router.get("/debug-db")
def debug_db():
    from config import settings
    from database import engine, init_db

    result = {
        "db_host": settings.db_host,
        "db_port": settings.db_port,
        "db_user": settings.db_user,
        "db_password_len": len(settings.db_password),
        "db_password_preview": settings.db_password[:3] + "***" if settings.db_password else "",
        "engine_url": str(engine.url).replace(str(engine.url.password or ""), "***"),
    }

    try:
        init_db()
        result["init_db"] = "success"
    except Exception as e:
        result["init_db"] = f"FAILED: {e}"
        result["traceback"] = traceback.format_exc()

    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            r = conn.execute(text("SELECT 1"))
            result["connection"] = "success"
    except Exception as e:
        result["connection"] = f"FAILED: {e}"

    return result
