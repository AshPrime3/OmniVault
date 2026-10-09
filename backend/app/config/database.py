"""
OmniVault — MongoDB connection (async via Motor).
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config.settings import settings

logger = logging.getLogger("omnivault")

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
        )
        logger.info("MongoDB client created")
    return _client


def get_database():
    """Return the default database parsed from MONGO_URI."""
    client = get_client()
    return client.get_default_database(default="securevault")


async def close_database():
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("MongoDB connection closed")
