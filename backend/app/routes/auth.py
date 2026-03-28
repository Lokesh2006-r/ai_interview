from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

class UserLogin(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(user: UserLogin):
    # Local placeholder logic for the demo (no DB yet)
    if "@" not in user.email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    return {
        "success": True,
        "token": "demo_token_for_lokesh",
        "user_name": user.email.split('@')[0].capitalize()
    }
