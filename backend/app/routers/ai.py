"""
OmniVault — AI router.
POST /api/ai/security-suggest
POST /api/ai/passphrase-hint
"""

import logging
from fastapi import APIRouter, Depends, HTTPException

from app.schemas.ai import SecuritySuggestRequest, PassphraseHintRequest
from app.services.ai_service import get_security_suggestion, get_passphrase_hint
from app.middleware.auth import get_current_user

logger = logging.getLogger("omnivault")

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/security-suggest")
async def security_suggest(body: SecuritySuggestRequest, user: dict = Depends(get_current_user)):
    result = await get_security_suggestion(body.filename, body.sizeBytes)
    return result


@router.post("/passphrase-hint")
async def passphrase_hint(body: PassphraseHintRequest, user: dict = Depends(get_current_user)):
    result = await get_passphrase_hint(body.passphrase)
    return result
