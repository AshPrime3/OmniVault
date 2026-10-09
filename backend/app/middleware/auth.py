"""
OmniVault — Authentication dependency (FastAPI).
Mirrors the Express auth middleware: Bearer token → Redis blacklist check → JWT verify.
"""

import logging
from fastapi import Request, HTTPException, Depends

from app.config.redis import redis_service
from app.utils.jwt import decode_token

logger = logging.getLogger("omnivault")


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency that extracts and validates JWT from Authorization header."""
    auth_header = request.headers.get("authorization", "")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = auth_header.split(" ", 1)[1]

    # Check if token is blacklisted in Redis
    is_blacklisted = await redis_service.get(f"blacklist:{token}")
    if is_blacklisted:
        raise HTTPException(status_code=401, detail="Token revoked")

    try:
        decoded = decode_token(token)
        return {
            "id": decoded["id"],
            "email": decoded["email"],
            "role": decoded.get("role", "user"),
            "_token": token,  # Carry the raw token for logout
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
