"""
OmniVault — Files router.
POST   /api/files/upload
GET    /api/files
DELETE /api/files/:fileId
GET    /api/files/:fileId/audit
PATCH  /api/files/:fileId/revoke
"""

import logging
from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File, Form
from typing import Optional

from app.services.file_service import upload_file, list_user_files, delete_user_file, get_file_audit, revoke_vault_link
from app.middleware.auth import get_current_user

logger = logging.getLogger("omnivault")

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload", status_code=201)
async def upload(
    request: Request,
    file: UploadFile = File(...),
    iv: str = Form(...),
    originalName: str = Form(...),
    mimeType: str = Form("application/octet-stream"),
    sizeBytes: Optional[str] = Form(None),
    downloadLimit: Optional[str] = Form("5"),
    expiresInMinutes: Optional[str] = Form(None),
    passphraseHint: Optional[str] = Form(""),
    user: dict = Depends(get_current_user),
):
    try:
        file_bytes = await file.read()
        size = int(sizeBytes) if sizeBytes else len(file_bytes)
        dl_limit = int(downloadLimit) if downloadLimit else 5
        exp_min = int(expiresInMinutes) if expiresInMinutes else None

        result = await upload_file(
            user_id=user["id"],
            file_bytes=file_bytes,
            iv=iv,
            original_name=originalName,
            mime_type=mimeType,
            size_bytes=size,
            download_limit=dl_limit,
            expires_in_minutes=exp_min,
            passphrase_hint=passphraseHint or "",
            ip_address=request.client.host if request.client else "",
            user_agent=request.headers.get("user-agent", ""),
        )
        return result
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail="Server error during file upload")


@router.get("")
async def list_files(user: dict = Depends(get_current_user)):
    try:
        files = await list_user_files(user["id"])
        return {"files": files}
    except Exception as e:
        logger.error(f"List files error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.delete("/{file_id}")
async def delete_file(file_id: str, user: dict = Depends(get_current_user)):
    try:
        result = await delete_user_file(user["id"], file_id)
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Delete file error: {e}")
        raise HTTPException(status_code=500, detail="Server error during file deletion")


@router.get("/{file_id}/audit")
async def file_audit(file_id: str, user: dict = Depends(get_current_user)):
    try:
        logs = await get_file_audit(user["id"], file_id)
        return {"logs": logs}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Audit log error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.patch("/{file_id}/revoke")
async def revoke(file_id: str, request: Request, user: dict = Depends(get_current_user)):
    try:
        result = await revoke_vault_link(
            user["id"], file_id,
            ip_address=request.client.host if request.client else "",
        )
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Revoke error: {e}")
        raise HTTPException(status_code=500, detail="Server error")
