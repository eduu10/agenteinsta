from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from services.conversation_service import (
    get_conversations,
    get_conversation_by_id,
    get_stats,
)
from auth import get_current_user

router = APIRouter()


@router.get("")
def list_conversations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    event_type: Optional[str] = None,
    user=Depends(get_current_user),
):
    return get_conversations(user_id=user["user_id"], page=page, limit=limit, event_type=event_type)


@router.get("/stats")
def conversation_stats(user=Depends(get_current_user)):
    return get_stats(user["user_id"])


@router.get("/{conv_id}")
def get_conversation(conv_id: int, user=Depends(get_current_user)):
    conv = get_conversation_by_id(user["user_id"], conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv
