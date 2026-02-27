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
    db_url = settings.get_database_url()
    # Mask password in URL for display
    masked_url = db_url
    if "@" in db_url:
        parts = db_url.split("@")
        masked_url = "***@" + parts[-1]

    result = {"db_url_masked": masked_url, "db_host": settings.db_host, "db_port": settings.db_port}

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
