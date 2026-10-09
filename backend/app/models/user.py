"""
OmniVault — User model helpers (MongoDB collection operations).
"""

from datetime import datetime, timezone
from bson import ObjectId
from app.config.database import get_database


def users_collection():
    return get_database()["users"]


async def create_user(name: str, email: str, hashed_password: str) -> dict:
    doc = {
        "name": name,
        "email": email.lower().strip(),
        "password": hashed_password,
        "role": "user",
        "storageUsed": 0,
        "createdAt": datetime.now(timezone.utc),
    }
    result = await users_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def find_user_by_email(email: str) -> dict | None:
    return await users_collection().find_one({"email": email.lower().strip()})


async def find_user_by_id(user_id: str) -> dict | None:
    try:
        return await users_collection().find_one({"_id": ObjectId(user_id)})
    except Exception:
        return None


async def update_storage_used(user_id: str, delta_bytes: int):
    await users_collection().update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"storageUsed": delta_bytes}},
    )


def user_to_json(user: dict) -> dict:
    """Convert a user document to a JSON-safe dict (strip password)."""
    return {
        "_id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "user"),
        "storageUsed": user.get("storageUsed", 0),
        "createdAt": user.get("createdAt", ""),
    }
