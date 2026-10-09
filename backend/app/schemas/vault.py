"""
OmniVault — Vault-related request schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional


class GenerateVaultLinkRequest(BaseModel):
    downloadLimit: Optional[int] = 5
    expiresInMinutes: Optional[int] = 60
    passphraseHint: Optional[str] = ""
