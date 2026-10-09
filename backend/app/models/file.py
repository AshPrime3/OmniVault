"""
OmniVault — File model helpers (MongoDB collection operations).
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.config.database import get_database


def files_collection():
    return get_database()["files"]


async def create_file(
    owner: str,
    original_name: str,
    mime_type: str,
    size_bytes: int,
    s3_key: str,
    iv: str,
    passphrase_hint: str = "",
    download_limit: int = 5,
    expires_at: Optional[datetime] = None,
) -> dict:
    doc = {
        "owner": ObjectId(owner),
        "originalName": original_name,
        "mimeType": mime_type,
        "sizeBytes": size_bytes,
        "s3Key": s3_key,
        "iv": iv,
        "vaultToken": None,
        "passphraseHint": passphrase_hint,
        "downloadLimit": download_limit,
        "downloadCount": 0,
        "expiresAt": expires_at,
        "isRevoked": False,
        "createdAt": datetime.now(timezone.utc),
    }
    result = await files_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def find_files_by_owner(owner_id: str) -> list[dict]:
    cursor = files_collection().find(
        {"owner": ObjectId(owner_id)},
        {"s3Key": 0},  # exclude s3Key from listing
    ).sort("createdAt", -1)
    return await cursor.to_list(length=None)


async def find_file_by_id_and_owner(file_id: str, owner_id: str) -> dict | None:
    try:
        return await files_collection().find_one({
            "_id": ObjectId(file_id),
            "owner": ObjectId(owner_id),
        })
    except Exception:
        return None


async def find_file_by_vault_token(vault_token: str, projection: dict | None = None) -> dict | None:
    return await files_collection().find_one({"vaultToken": vault_token}, projection)


async def delete_file_by_id(file_id: str):
    await files_collection().delete_one({"_id": ObjectId(file_id)})


async def save_file(file_doc: dict):
    """Update a file document in MongoDB."""
    file_id = file_doc["_id"]
    update = {k: v for k, v in file_doc.items() if k != "_id"}
    await files_collection().update_one({"_id": file_id}, {"$set": update})


def file_to_json(file_doc: dict) -> dict:
    """Convert a file document to JSON-safe dict."""
    result = {}
    for key, value in file_doc.items():
        if key == "_id":
            result["_id"] = str(value)
        elif key == "owner":
            result["owner"] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat() if value else None
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        else:
            result[key] = value
    return result
