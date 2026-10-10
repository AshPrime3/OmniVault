"""
OmniVault — MongoDB connection (async via Motor).
"""

import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

logger = logging.getLogger("omnivault")

_client: AsyncIOMotorClient | None = None
_client_loop: asyncio.AbstractEventLoop | None = None


def get_client() -> AsyncIOMotorClient:
    global _client, _client_loop
    try:
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _client is None or _client_loop != current_loop or (_client_loop and _client_loop.is_closed()):
        _client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
        )
        _client_loop = current_loop
        logger.info("MongoDB client created")
    return _client


def get_database():
    """Return the default database parsed from MONGO_URI."""
    client = get_client()
    return client.get_default_database(default="securevault")


async def close_database():
    global _client, _client_loop
    if _client is not None:
        _client.close()
        _client = None
        _client_loop = None
        logger.info("MongoDB connection closed")

