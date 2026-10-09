"""
OmniVault — Vault router.
POST /api/vault/:fileId/generate
GET  /api/vault/:vaultToken
POST /api/vault/:vaultToken/download
"""

import logging
from urllib.parse import quote

from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import Response

from app.schemas.vault import GenerateVaultLinkRequest
from app.services.vault_service import generate_vault_link, get_vault_file_info, download_vault_file
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import limiter, DOWNLOAD_RATE_LIMIT

logger = logging.getLogger("omnivault")

router = APIRouter(prefix="/api/vault", tags=["vault"])


@router.post("/{file_id}/generate")
async def generate_link(file_id: str, body: GenerateVaultLinkRequest, user: dict = Depends(get_current_user)):
    try:
        result = await generate_vault_link(
            user_id=user["id"],
            file_id=file_id,
            download_limit=body.downloadLimit or 5,
            expires_in_minutes=body.expiresInMinutes or 60,
            passphrase_hint=body.passphraseHint or "",
        )
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Generate vault link error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.get("/{vault_token}")
async def vault_file_info(vault_token: str, request: Request):
    try:
        result = await get_vault_file_info(
            vault_token,
            ip_address=request.client.host if request.client else "",
            user_agent=request.headers.get("user-agent", ""),
        )
        return result
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Invalid vault link")
    except PermissionError as e:
        detail = str(e)
        status = 403
        if "Download limit" in detail:
            status = 403
        raise HTTPException(status_code=status, detail=detail)
    except TimeoutError:
        raise HTTPException(status_code=410, detail="This link has expired")
    except Exception as e:
        logger.error(f"Get vault info error: {e}")
        raise HTTPException(status_code=500, detail="Server error")


@router.post("/{vault_token}/download")
@limiter.limit(DOWNLOAD_RATE_LIMIT)
async def vault_download(vault_token: str, request: Request):
    try:
        result = await download_vault_file(
            vault_token,
            ip_address=request.client.host if request.client else "",
            user_agent=request.headers.get("user-agent", ""),
        )

        return Response(
            content=result["data"],
            media_type="application/octet-stream",
            headers={
                "Content-Type": "application/octet-stream",
                "x-file-iv": result["iv"],
                "x-original-name": quote(result["originalName"]),
                "Access-Control-Expose-Headers": "x-file-iv, x-original-name",
            },
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Invalid vault link")
    except PermissionError as e:
        detail = str(e)
        status = 403
        raise HTTPException(status_code=status, detail=detail)
    except TimeoutError:
        raise HTTPException(status_code=410, detail="Link expired")
    except Exception as e:
        logger.error(f"Download vault file error: {e}")
        raise HTTPException(status_code=500, detail="Server error during download")
