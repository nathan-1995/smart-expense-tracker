from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


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
    BACKEND_CORS_ORIGINS: List[str] = [
    # Amplify frontend (Prod + Dev)
    "https://main.d3b3izli1zqily.amplifyapp.com", #these urls need to be changed when the app is deployed
    "https://dev.d3b3izli1zqily.amplifyapp.com",

    # Local dev
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    # Without nginx proxy
    "http://localhost:8000",
]

    # Account Security
    MAX_LOGIN_ATTEMPTS: int = 5
    ACCOUNT_LOCKOUT_DURATION_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


# Create global settings instance
settings = Settings()
