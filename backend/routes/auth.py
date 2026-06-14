from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    passkey: str


class LoginResponse(BaseModel):
    success: bool
    role: str


# Get admin passkey from environment variable
ADMIN_PASSKEY = os.getenv("ADMIN_PASSKEY", "admin123")


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """Simple passkey-based admin login"""
    if request.passkey == ADMIN_PASSKEY:
        return {"success": True, "role": "admin"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid passkey"
        )


@router.post("/logout")
def logout():
    """Logout endpoint (client-side handles session clearing)"""
    return {"success": True, "message": "Logged out successfully"}

# Made with Bob
