from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ChatRequest, ChatResponse
from auth import get_current_user

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, user=Depends(get_current_user)):
    try:
        from agent.instagram_agent import chat_with_agent
        result = chat_with_agent(
            message=req.message,
            session_id=req.session_id,
        )
        return ChatResponse(
            response=result["response"],
            session_id=result["session_id"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
