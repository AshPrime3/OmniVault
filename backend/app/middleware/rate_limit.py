"""
OmniVault — Rate limiting (SlowAPI).
Mirrors the Express rate-limit tiers: auth, download, general.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Create a shared limiter instance keyed by client IP
limiter = Limiter(key_func=get_remote_address)

# Rate limit strings (SlowAPI format)
AUTH_RATE_LIMIT = "20/15minutes"        # 20 requests per 15 minutes
DOWNLOAD_RATE_LIMIT = "30/15minutes"    # 30 requests per 15 minutes
API_RATE_LIMIT = "100/15minutes"        # 100 requests per 15 minutes
