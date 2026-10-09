"""
OmniVault — File service layer.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.file import (
    create_file, find_files_by_owner, find_file_by_id_and_owner,
    delete_file_by_id, save_file, file_to_json,
)
from app.models.audit_log import create_audit_log, find_audit_logs_by_file, audit_to_json
from app.models.user import update_storage_used
from app.config.storage import storage_service

logger = logging.getLogger("omnivault")


async def upload_file(
    user_id: str,
    file_bytes: bytes,
    iv: str,
    original_name: str,
    mime_type: str,
    size_bytes: int,
    download_limit: int,
    expires_in_minutes: Optional[int],
    passphrase_hint: str,
    ip_address: str,
    user_agent: str,
) -> dict:
    """Handle encrypted file upload."""
    s3_key = f"encrypted/{user_id}/{uuid.uuid4()}"

    # Upload encrypted blob to storage
    await storage_service.upload(s3_key, file_bytes, "application/octet-stream")

    # Calculate expiry
    expires_at = None
    if expires_in_minutes:
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

    # Create file record
    file_doc = await create_file(
        owner=user_id,
        original_name=original_name,
        mime_type=mime_type,
        size_bytes=size_bytes,
        s3_key=s3_key,
        iv=iv,
        passphrase_hint=passphrase_hint,
        download_limit=download_limit,
        expires_at=expires_at,
    )

    # Update user storage
    await update_storage_used(user_id, size_bytes)

    # Audit log
    await create_audit_log(
        file_id=str(file_doc["_id"]),
        action="UPLOADED",
        performed_by=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    logger.info(f"File uploaded: {original_name} by user {user_id}")

    return {
        "fileId": str(file_doc["_id"]),
        "message": "File uploaded successfully",
    }


async def list_user_files(user_id: str) -> list[dict]:
    """List all files owned by user."""
    files = await find_files_by_owner(user_id)
    return [file_to_json(f) for f in files]


async def delete_user_file(user_id: str, file_id: str) -> dict:
    """Delete a file owned by user."""
    file_doc = await find_file_by_id_and_owner(file_id, user_id)
    if not file_doc:
        raise FileNotFoundError("File not found")

    # Delete from storage
    await storage_service.delete(file_doc["s3Key"])

    # Update user storage
    await update_storage_used(user_id, -file_doc["sizeBytes"])

    # Delete file record
    await delete_file_by_id(file_id)

    logger.info(f"File deleted: {file_doc['originalName']} by user {user_id}")

    return {"message": "File deleted successfully"}


async def get_file_audit(user_id: str, file_id: str) -> list[dict]:
    """Get audit logs for a file owned by user."""
    file_doc = await find_file_by_id_and_owner(file_id, user_id)
    if not file_doc:
        raise FileNotFoundError("File not found")

    logs = await find_audit_logs_by_file(file_id)
    return [audit_to_json(log) for log in logs]


async def revoke_vault_link(user_id: str, file_id: str, ip_address: str) -> dict:
    """Revoke the vault link for a file."""
    file_doc = await find_file_by_id_and_owner(file_id, user_id)
    if not file_doc:
        raise FileNotFoundError("File not found")

    file_doc["isRevoked"] = True
    await save_file(file_doc)

    await create_audit_log(
        file_id=str(file_doc["_id"]),
        action="LINK_REVOKED",
        performed_by=user_id,
        ip_address=ip_address,
    )

    logger.info(f"Vault link revoked for file: {file_doc['originalName']}")

    return {"message": "Vault link revoked successfully"}
