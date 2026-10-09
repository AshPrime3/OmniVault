"""
OmniVault — AI request schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional


class SecuritySuggestRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    sizeBytes: Optional[int] = None


class PassphraseHintRequest(BaseModel):
    passphrase: str = Field(..., min_length=3)
