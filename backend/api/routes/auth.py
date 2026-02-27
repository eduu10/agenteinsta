from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from auth import create_token, get_current_user
from services.user_service import create_user, authenticate, get_user

router = APIRouter()


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
def register(data: RegisterRequest):
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="A senha deve ter pelo menos 6 caracteres")

    try:
        user = create_user(data.email, data.password, data.name)
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="Este email ja esta registrado")
        raise HTTPException(status_code=500, detail=str(e))

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
