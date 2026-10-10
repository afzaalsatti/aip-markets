import json
import os
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AIP Markets"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database (SQLite local default; use Postgres URL on hosted backends if you need persistence)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./asset_intelligence.db")
    SYNC_DATABASE_URL: str = os.getenv("SYNC_DATABASE_URL", "sqlite:///./asset_intelligence.db")

    # Local LLM / Ollama — on hosted APIs without Ollama, set USE_MOCK_LLM_FALLBACK=true
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5:3b"
    USE_MOCK_LLM_FALLBACK: bool = False

    # Market Data API Settings
    USE_MOCK_MARKET_DATA: bool = False
    YFINANCE_CACHE_TTL_MINUTES: int = 15
    FRED_API_KEY: str = ""

    # Security & CORS — auth not implemented; SECRET_KEY unused today
    SECRET_KEY: str = "dev_secret_key_change_in_production_987654321_super_secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    # Comma-separated or JSON list via env, e.g. CORS_ORIGINS=https://app.vercel.app,http://localhost:3000
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None or value == "":
            return [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8000",
            ]
        if isinstance(value, list):
            return [str(v).strip() for v in value if str(v).strip()]
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                parsed = json.loads(raw)
                return [str(v).strip() for v in parsed if str(v).strip()]
            return [part.strip() for part in raw.split(",") if part.strip()]
        return value


settings = Settings()
