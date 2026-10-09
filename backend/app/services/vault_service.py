"""
OmniVault — Vault service layer.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

from app.models.file import find_file_by_id_and_owner, find_file_by_vault_token, save_file, file_to_json
from app.models.audit_log import create_audit_log
from app.config.storage import storage_service
from app.config.settings import settings

logger = logging.getLogger("omnivault")


async def generate_vault_link(
    user_id: str,
    file_id: str,
    download_limit: int = 5,
    expires_in_minutes: int = 60,
    passphrase_hint: str = "",
) -> dict:
    """Generate a new vault link for a file."""
    file_doc = await find_file_by_id_and_owner(file_id, user_id)
    if not file_doc:
        raise FileNotFoundError("File not found")

    vault_token = str(uuid.uuid4())
    file_doc["vaultToken"] = vault_token
    file_doc["isRevoked"] = False
    file_doc["downloadCount"] = 0
    file_doc["downloadLimit"] = download_limit
    file_doc["passphraseHint"] = passphrase_hint or file_doc.get("passphraseHint", "")
    file_doc["expiresAt"] = datetime.now(timezone.utc) + timedelta(minutes=expires_in_minutes)

    await save_file(file_doc)

    vault_link = f"{settings.CLIENT_URL}/vault/{vault_token}"

    logger.info(f"Vault link generated for file: {file_doc['originalName']}")

    return {
        "vaultLink": vault_link,
        "vaultToken": vault_token,
        "expiresAt": file_doc["expiresAt"].isoformat(),
        "downloadLimit": file_doc["downloadLimit"],
    }


async def get_vault_file_info(vault_token: str, ip_address: str, user_agent: str) -> dict:
    """Get public file info by vault token."""
    projection = {
        "originalName": 1, "mimeType": 1, "sizeBytes": 1, "passphraseHint": 1,
        "downloadLimit": 1, "downloadCount": 1, "expiresAt": 1, "isRevoked": 1, "createdAt": 1,
    }
    file_doc = await find_file_by_vault_token(vault_token, projection)

    if not file_doc:
        raise FileNotFoundError("Invalid vault link")

    if file_doc.get("isRevoked"):
        raise PermissionError("This link has been revoked")

    if file_doc.get("expiresAt") and datetime.now(timezone.utc) > file_doc["expiresAt"].replace(tzinfo=timezone.utc) if file_doc["expiresAt"].tzinfo is None else file_doc["expiresAt"]:
        raise TimeoutError("This link has expired")

    if file_doc.get("downloadCount", 0) >= file_doc.get("downloadLimit", 5):
        raise PermissionError("Download limit reached")

    # Log link access
    await create_audit_log(
        file_id=str(file_doc["_id"]),
        action="LINK_ACCESSED",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return {
        "originalName": file_doc["originalName"],
        "mimeType": file_doc["mimeType"],
        "sizeBytes": file_doc["sizeBytes"],
        "passphraseHint": file_doc.get("passphraseHint", ""),
        "downloadLimit": file_doc["downloadLimit"],
        "downloadCount": file_doc["downloadCount"],
        "expiresAt": file_doc["expiresAt"].isoformat() if file_doc.get("expiresAt") else None,
        "remainingDownloads": file_doc["downloadLimit"] - file_doc["downloadCount"],
    }


def _ensure_utc(dt: datetime) -> datetime:
    """Ensure a datetime is timezone-aware (UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def download_vault_file(vault_token: str, ip_address: str, user_agent: str) -> dict:
    """Download the encrypted file via vault token. Returns file data + metadata."""
    file_doc = await find_file_by_vault_token(vault_token)

    if not file_doc:
        raise FileNotFoundError("Invalid vault link")

    if file_doc.get("isRevoked"):
        await create_audit_log(
            file_id=str(file_doc["_id"]), action="FAILED_ATTEMPT",
            ip_address=ip_address, user_agent=user_agent,
        )
        raise PermissionError("Link revoked")

    expires_at = _ensure_utc(file_doc.get("expiresAt"))
    if expires_at and datetime.now(timezone.utc) > expires_at:
        await create_audit_log(
            file_id=str(file_doc["_id"]), action="LINK_EXPIRED",
            ip_address=ip_address,
        )
        raise TimeoutError("Link expired")

    if file_doc.get("downloadCount", 0) >= file_doc.get("downloadLimit", 5):
        await create_audit_log(
            file_id=str(file_doc["_id"]), action="FAILED_ATTEMPT",
            ip_address=ip_address,
        )
        raise PermissionError("Download limit reached")

    # Download encrypted blob from storage
    file_bytes = await storage_service.download(file_doc["s3Key"])

    # Increment download count
    file_doc["downloadCount"] = file_doc.get("downloadCount", 0) + 1
    await save_file(file_doc)

    # Audit log
    await create_audit_log(
        file_id=str(file_doc["_id"]),
        action="DOWNLOADED",
        ip_address=ip_address,
        user_agent=user_agent,
    )

    logger.info(f"File downloaded via vault: {file_doc['originalName']}")

    return {
        "data": file_bytes,
        "iv": file_doc["iv"],
        "originalName": file_doc["originalName"],
    }
