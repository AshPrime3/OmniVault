"""
OmniVault — Auth service layer.
"""

import logging
import time

from app.models.user import create_user, find_user_by_email, find_user_by_id, user_to_json
from app.utils.security import hash_password, verify_password
from app.utils.jwt import generate_token, decode_token_unverified
from app.config.redis import redis_service

logger = logging.getLogger("omnivault")


async def register_user(name: str, email: str, password: str) -> dict:
    """Register a new user. Returns { token, user }."""
    existing = await find_user_by_email(email)
    if existing:
        raise ValueError("Email already registered")

    hashed = hash_password(password)
    user = await create_user(name, email, hashed)
    token = generate_token(str(user["_id"]), user["email"], user["role"])

    logger.info(f"New user registered: {email}")

    return {
        "token": token,
        "user": user_to_json(user),
    }


async def login_user(email: str, password: str) -> dict:
    """Authenticate a user. Returns { token, user }."""
    user = await find_user_by_email(email)
    if not user:
        raise ValueError("Invalid email or password")

    if not verify_password(password, user["password"]):
        raise ValueError("Invalid email or password")

    token = generate_token(str(user["_id"]), user["email"], user["role"])

    logger.info(f"User logged in: {email}")

    return {
        "token": token,
        "user": user_to_json(user),
    }


async def logout_user(token: str, user_email: str):
    """Blacklist the JWT in Redis for remaining TTL."""
    decoded = decode_token_unverified(token)
    ttl = decoded.get("exp", 0) - int(time.time())
    if ttl > 0:
        await redis_service.set_ex(f"blacklist:{token}", ttl, "1")
    logger.info(f"User logged out: {user_email}")


async def get_current_user_profile(user_id: str) -> dict | None:
    """Retrieve user profile by ID."""
    user = await find_user_by_id(user_id)
    if user:
        return user_to_json(user)
    return None
