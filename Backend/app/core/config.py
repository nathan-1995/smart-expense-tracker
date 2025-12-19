from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List, Union
import json


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Uses Pydantic Settings for validation and type safety.
    Values are loaded from .env file in the Backend directory.
    """

    # Database Configuration
    DATABASE_URL: str

    # JWT Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Security
    BCRYPT_COST_FACTOR: int = 12

    # Application Configuration
    PROJECT_NAME: str = "FinTrack"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # CORS Configuration
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        # Custom domains (Production)
        "https://fintracker.cc",
        "https://www.fintracker.cc",

        # Custom domains (Development)
        "https://dev.fintracker.cc",
        "https://www.dev.fintracker.cc",

        # Local dev
        "http://localhost:3000",
        "http://127.0.0.1:3000",

        # Without nginx proxy
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from JSON string or return list as-is."""
        if isinstance(v, str):
            try:
                # Try to parse as JSON array string
                return json.loads(v)
            except json.JSONDecodeError:
                # If it's a single origin string, wrap it in a list
                return [v]
        return v

    # Account Security
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30

    # Email Configuration (Zoho ZeptoMail)
    ZEPTOMAIL_API_URL: str = "https://api.zeptomail.com/v1.1/email"
    ZEPTOMAIL_API_KEY: str
    FROM_EMAIL: str

    # Frontend URL (for email links)
    FRONTEND_URL: str = "https://fintracker.cc"

    # Google Gemini API Configuration
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Document Processing Configuration
    MAX_DOCUMENT_SIZE_MB: int = 10
    DOCUMENT_PROCESSING_TIMEOUT_SECONDS: int = 45

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Create global settings instance
settings = Settings()
