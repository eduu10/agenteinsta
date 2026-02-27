from fastapi import APIRouter, Query, Depends
from instagram.monitor import monitor_manager
from services.conversation_service import get_activity_log
from auth import get_current_user

router = APIRouter()


@router.get("/status")
def monitor_status(user=Depends(get_current_user)):
    return monitor_manager.get_status(user["user_id"])


@router.post("/start")
async def start_monitor(user=Depends(get_current_user)):
    result = await monitor_manager.start(user["user_id"])
    return result


@router.post("/stop")
async def stop_monitor(user=Depends(get_current_user)):
    result = await monitor_manager.stop(user["user_id"])
    return result


@router.get("/activity-log")
def activity_log(limit: int = Query(50, ge=1, le=200), user=Depends(get_current_user)):
    return get_activity_log(user_id=user["user_id"], limit=limit)
