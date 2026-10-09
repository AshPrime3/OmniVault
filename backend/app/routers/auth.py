"""
OmniVault — Auth router.
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
"""

import logging
from fastapi import APIRouter, Request, Depends, HTTPException

from app.schemas.auth import RegisterRequest, LoginRequest
from app.services.auth_service import register_user, login_user, logout_user, get_current_user_profile
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import limiter, AUTH_RATE_LIMIT

logger = logging.getLogger("omnivault")

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register")
@limiter.limit(AUTH_RATE_LIMIT)
async def register(request: Request, body: RegisterRequest):
    try:
        result = await register_user(body.name, body.email, body.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Server error during registration")


@router.post("/login")
@limiter.limit(AUTH_RATE_LIMIT)
async def login(request: Request, body: LoginRequest):
    try:
        result = await login_user(body.email, body.password)
        return result
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Server error during login")


@router.post("/logout")
async def logout(request: Request, user: dict = Depends(get_current_user)):
    try:
        await logout_user(user["_token"], user["email"])
        return {"message": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Server error during logout")


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    try:
        profile = await get_current_user_profile(user["id"])
        if not profile:
            raise HTTPException(status_code=404, detail="User not found")
        return {"user": profile}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"GetMe error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
