from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from auth import create_token, get_current_user
from services.user_service import authenticate, get_user

router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(data: LoginRequest):
    user = authenticate(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    token = create_token(user["id"], user.get("is_admin", False))
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_admin": user["is_admin"],
        },
    }


@router.get("/me")
def me(user=Depends(get_current_user)):
    user_data = get_user(user["user_id"])
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user_data["id"],
        "email": user_data["email"],
        "name": user_data["name"],
        "is_admin": user_data["is_admin"],
    }
