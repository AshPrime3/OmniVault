"""
OmniVault — Password hashing utilities.
"""

import bcrypt


def hash_password(password: str) -> str:
    """Hash a password with bcrypt (12 rounds, matching the Node.js config)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(candidate: str, hashed: str) -> bool:
    """Compare a candidate password against a bcrypt hash."""
    return bcrypt.checkpw(candidate.encode("utf-8"), hashed.encode("utf-8"))
