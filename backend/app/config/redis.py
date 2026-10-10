"""
OmniVault — Redis connection with in-memory fallback.
Mirrors the Node.js Redis service: unified get/setEx interface.
"""

import logging
import time
from typing import Optional
import redis.asyncio as aioredis
from app.config.settings import settings

logger = logging.getLogger("omnivault")

_redis_client: Optional[aioredis.Redis] = None
_use_in_memory: bool = False
_in_memory_store: dict = {}


async def init_redis():
    """Try to connect to Redis. Fall back to in-memory on failure."""
    global _redis_client, _use_in_memory

    try:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
        )
        await _redis_client.ping()
        logger.info("Redis connected successfully")
    except Exception as exc:
        logger.warning(f"Redis connection failed ({exc}), using in-memory blacklist fallback")
        _use_in_memory = True
        _redis_client = None


async def close_redis():
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None


class RedisService:
    """Unified interface that works with both Redis and in-memory fallback."""

    async def get(self, key: str) -> Optional[str]:
        if not _use_in_memory and _redis_client is not None:
            try:
                return await _redis_client.get(key)
            except Exception:
                pass

        # In-memory fallback
        item = _in_memory_store.get(key)
        if item is None:
            return None
        if item.get("expiry") and time.time() > item["expiry"]:
            del _in_memory_store[key]
            return None
        return item.get("value")

    async def set_ex(self, key: str, ttl_seconds: int, value: str):
        if not _use_in_memory and _redis_client is not None:
            try:
                await _redis_client.setex(key, ttl_seconds, value)
                return
            except Exception:
                pass

        # In-memory fallback
        _in_memory_store[key] = {
            "value": value,
            "expiry": time.time() + ttl_seconds,
        }


redis_service = RedisService()

