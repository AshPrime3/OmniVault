"""
OmniVault — FastAPI Application Entry Point.
Replaces Express app.js + server.js.
"""

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config.settings import settings
from app.config.logger import setup_logging
from app.config.database import get_database, close_database
from app.config.redis import init_redis, close_redis
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.rate_limit import limiter
from app.routers import auth, files, vault, ai

# Setup logging
setup_logging()
logger = logging.getLogger("omnivault")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # Startup
    logger.info(f"Starting OmniVault server on port {settings.PORT}")
    logger.info(f"Environment: {settings.NODE_ENV}")

    # Test MongoDB connection
    try:
        db = get_database()
        await db.command("ping")
        logger.info("MongoDB connected successfully")
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")
        raise

    # Initialize Redis
    await init_redis()

    yield

    # Shutdown
    await close_redis()
    await close_database()
    logger.info("OmniVault server shut down")


app = FastAPI(
    title="OmniVault API",
    description="Zero-knowledge encrypted file sharing platform",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── Rate limiting ────────────────────────────────────────────────────────────
app.state.limiter = limiter


# Custom rate limit error to return {"message": ...} format
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"message": "Too many requests, please try again later"},
    )


app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# ─── Security headers (Helmet equivalent) ────────────────────────────────────
app.add_middleware(SecurityHeadersMiddleware)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CLIENT_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-file-iv", "x-original-name"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(files.router)
app.include_router(vault.router)
app.include_router(ai.router)


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ─── HTTPException handler — return {"message": ...} for frontend compat ────
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )


# ─── Global exception handler ────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(status_code=500, content={"message": "Internal server error"})


# ─── Validation error handler (Pydantic) ──────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error.get("loc", []) if str(loc) != "body")
        errors.append({
            "field": field,
            "message": error.get("msg", "Validation error"),
        })
    return JSONResponse(
        status_code=400,
        content={
            "message": "Validation error",
            "errors": errors,
        },
    )


# ─── Request logging (Morgan equivalent) ─────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} {response.status_code} - {request.client.host if request.client else '-'}")
    return response
