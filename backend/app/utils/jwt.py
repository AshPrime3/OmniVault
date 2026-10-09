"""
OmniVault — JWT utilities.
"""

import time
from typing import Optional
import jwt
from app.config.settings import settings


def generate_token(user_id: str, email: str, role: str) -> str:
    """Generate a JWT token with the same payload as the Node.js version."""
    now = int(time.time())
    payload = {
        "id": user_id,
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + settings.jwt_expiry_seconds,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    """Verify and decode a JWT token. Raises jwt.exceptions on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])


def decode_token_unverified(token: str) -> dict:
    """Decode without verification (for reading exp during logout)."""
    return jwt.decode(token, options={"verify_signature": False}, algorithms=["HS256"])
