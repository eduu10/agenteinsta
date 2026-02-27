from fastapi import APIRouter
from instagram.monitor import monitor

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "monitor_running": monitor.is_running,
    }
