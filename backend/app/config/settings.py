"""
OmniVault — Application Settings (pydantic-settings)
Loads configuration from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Server
    PORT: int = 5000
    NODE_ENV: str = "development"
    CLIENT_URL: str = "http://localhost:5173"

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017/securevault"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    JWT_SECRET: str = "change_me_in_production_omnivault_secret_key_32bytes"
    JWT_EXPIRES_IN: str = "7d"


    # AWS S3
    AWS_ACCESS_KEY_ID: Optional[str] = ""
    AWS_SECRET_ACCESS_KEY: Optional[str] = ""
    AWS_REGION: str = "ap-south-1"
    AWS_BUCKET_NAME: str = "securevault-files"

    # Groq AI
    GROQ_API_KEY: Optional[str] = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def is_local_storage(self) -> bool:
        """Determine whether to use local filesystem instead of S3."""
        return (
            not self.AWS_ACCESS_KEY_ID
            or self.AWS_ACCESS_KEY_ID.strip() in ("", "your_aws_access_key")
            or not self.AWS_SECRET_ACCESS_KEY
            or self.AWS_SECRET_ACCESS_KEY.strip() in ("", "your_aws_secret_key")
        )

    @property
    def jwt_expiry_seconds(self) -> int:
        """Convert JWT_EXPIRES_IN (e.g. '7d', '24h') to seconds."""
        val = self.JWT_EXPIRES_IN.strip()
        if val.endswith("d"):
            return int(val[:-1]) * 86400
        elif val.endswith("h"):
            return int(val[:-1]) * 3600
        elif val.endswith("m"):
            return int(val[:-1]) * 60
        else:
            return int(val)


settings = Settings()
