"""
OmniVault — Storage service abstraction (S3 vs local filesystem).
Mirrors the Node.js storageService exactly.
"""

import logging
import os
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config.settings import settings

logger = logging.getLogger("omnivault")

_s3_client = None

if not settings.is_local_storage:
    _s3_client = boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )
    logger.info("AWS S3 client initialized")
else:
    logger.info("Using local filesystem storage (S3 credentials not configured)")

LOCAL_STORAGE_DIR = Path(os.getcwd()) / "local-storage"

if settings.is_local_storage:
    LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _local_path(key: str) -> Path:
    """Convert an S3-style key to a local file path."""
    return LOCAL_STORAGE_DIR / key.replace("/", "_")


class StorageService:
    """Abstraction over S3 and local filesystem."""

    async def upload(self, key: str, body: bytes, content_type: str = "application/octet-stream"):
        if settings.is_local_storage:
            file_path = _local_path(key)
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_bytes(body)
            logger.info(f"File stored locally: {file_path}")
            return {"key": key}

        _s3_client.put_object(
            Bucket=settings.AWS_BUCKET_NAME,
            Key=key,
            Body=body,
            ContentType=content_type,
        )
        logger.info(f"File uploaded to S3: {key}")
        return {"key": key}

    async def download(self, key: str) -> bytes:
        if settings.is_local_storage:
            file_path = _local_path(key)
            if not file_path.exists():
                raise FileNotFoundError("File not found in local storage")
            return file_path.read_bytes()

        response = _s3_client.get_object(
            Bucket=settings.AWS_BUCKET_NAME,
            Key=key,
        )
        return response["Body"].read()

    async def delete(self, key: str):
        if settings.is_local_storage:
            file_path = _local_path(key)
            if file_path.exists():
                file_path.unlink()
                logger.info(f"File deleted from local storage: {file_path}")
            return

        _s3_client.delete_object(
            Bucket=settings.AWS_BUCKET_NAME,
            Key=key,
        )
        logger.info(f"File deleted from S3: {key}")


storage_service = StorageService()
