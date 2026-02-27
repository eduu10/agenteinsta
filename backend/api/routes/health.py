from fastapi import APIRouter
from instagram.monitor import monitor_manager

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "active_monitors": len([s for s in monitor_manager._monitors.values() if s.is_running]),
    }
