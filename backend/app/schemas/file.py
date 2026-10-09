"""
OmniVault — File-related request schemas.
"""

from pydantic import BaseModel, Field
from typing import Optional


class FileUploadMeta(BaseModel):
    """Metadata sent along with the multipart file upload."""
    iv: str
    originalName: str
    mimeType: str = "application/octet-stream"
    sizeBytes: Optional[str] = None
    downloadLimit: Optional[str] = "5"
    expiresInMinutes: Optional[str] = None
    passphraseHint: Optional[str] = ""
