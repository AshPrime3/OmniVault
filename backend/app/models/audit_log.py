"""
OmniVault — AuditLog model helpers (MongoDB collection operations).
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from app.config.database import get_database


def audit_collection():
    return get_database()["auditlogs"]


async def create_audit_log(
    file_id: str,
    action: str,
    performed_by: Optional[str] = None,
    ip_address: str = "",
    user_agent: str = "",
) -> dict:
    doc = {
        "fileId": ObjectId(file_id),
        "action": action,
        "performedBy": ObjectId(performed_by) if performed_by else None,
        "ipAddress": ip_address,
        "userAgent": user_agent,
        "timestamp": datetime.now(timezone.utc),
    }
    result = await audit_collection().insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def find_audit_logs_by_file(file_id: str) -> list[dict]:
    """Find audit logs for a file, sorted by timestamp descending.
    Manually populate performedBy with user name/email."""
    from app.models.user import find_user_by_id

    cursor = audit_collection().find({"fileId": ObjectId(file_id)}).sort("timestamp", -1)
    logs = await cursor.to_list(length=None)

    # Populate performedBy similar to Mongoose .populate('performedBy', 'name email')
    for log in logs:
        if log.get("performedBy"):
            user = await find_user_by_id(str(log["performedBy"]))
            if user:
                log["performedBy"] = {
                    "_id": str(user["_id"]),
                    "name": user.get("name", ""),
                    "email": user.get("email", ""),
                }
            else:
                log["performedBy"] = None

    return logs


def audit_to_json(log: dict) -> dict:
    """Convert an audit log document to JSON-safe dict."""
    result = {}
    for key, value in log.items():
        if key == "_id":
            result["_id"] = str(value)
        elif key == "fileId":
            result["fileId"] = str(value)
        elif key == "performedBy":
            if isinstance(value, dict):
                result["performedBy"] = value
            elif value:
                result["performedBy"] = str(value)
            else:
                result["performedBy"] = None
        elif isinstance(value, datetime):
            result[key] = value.isoformat() if value else None
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        else:
            result[key] = value
    return result
