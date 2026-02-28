from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from auth import get_current_user
from services.user_service import list_users, get_user, create_user
from services.conversation_service import get_activity_log
from services.config_service import get_global_config, update_global_config

router = APIRouter()


class CreateUserRequest(BaseModel):
    email: str
    password: str
    name: str = ""


def require_admin(user=Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/users")
def admin_create_user(data: CreateUserRequest, user=Depends(require_admin)):
    try:
        new_user = create_user(data.email, data.password, data.name)
        return {"status": "ok", "user": new_user}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/users")
def admin_list_users(user=Depends(require_admin)):
    return list_users()


@router.get("/users/{user_id}")
def admin_get_user(user_id: str, user=Depends(require_admin)):
    target = get_user(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    return target


@router.get("/users/{user_id}/activity")
def admin_user_activity(user_id: str, limit: int = Query(50, ge=1, le=200), user=Depends(require_admin)):
    return get_activity_log(user_id=user_id, limit=limit)


@router.get("/monitors")
def admin_all_monitors(user=Depends(require_admin)):
    from instagram.monitor import monitor_manager
    return monitor_manager.get_all_statuses()


@router.get("/global-config")
def admin_get_global_config(user=Depends(require_admin)):
    config = get_global_config()
    from services.config_service import mask_secret
    return {
        "llm_provider": config.get("llm_provider", "groq"),
        "llm_api_key_masked": mask_secret(config.get("llm_api_key", "")),
        "llm_model": config.get("llm_model", "llama-3.3-70b-versatile"),
    }


@router.put("/global-config")
def admin_update_global_config(data: dict, user=Depends(require_admin)):
    allowed_keys = {"llm_provider", "llm_api_key", "llm_model"}
    updates = {k: v for k, v in data.items() if k in allowed_keys and v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_global_config(updates)
    return {"status": "ok", "message": "Global config updated"}
