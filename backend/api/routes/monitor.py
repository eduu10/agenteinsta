from fastapi import APIRouter, Query
from instagram.monitor import monitor
from services.conversation_service import get_activity_log

router = APIRouter()


@router.get("/status")
def monitor_status():
    return monitor.get_status()


@router.post("/start")
async def start_monitor():
    result = await monitor.start()
    return result


@router.post("/stop")
async def stop_monitor():
    result = await monitor.stop()
    return result


@router.get("/activity-log")
def activity_log(limit: int = Query(50, ge=1, le=200)):
    return get_activity_log(limit=limit)
