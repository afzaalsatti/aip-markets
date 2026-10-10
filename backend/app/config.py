import json
from typing import Annotated, Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

_DEFAULT_CORS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]


def _parse_cors(value: Any) -> list[str]:
    if value is None or value == "":
        return list(_DEFAULT_CORS)
    if isinstance(value, list):
        return [str(v).strip() for v in value if str(v).strip()]
    if isinstance(value, str):
        raw = value.strip()
        # Strip accidental wrapping quotes from hosting dashboards
        if (raw.startswith('"') and raw.endswith('"')) or (
            raw.startswith("'") and raw.endswith("'")
        ):
            raw = raw[1:-1].strip()
        if raw.startswith("["):
            parsed = json.loads(raw)
            return [str(v).strip() for v in parsed if str(v).strip()]
        return [part.strip() for part in raw.split(",") if part.strip()]
    return list(_DEFAULT_CORS)


class Settings(BaseSettings):
    PROJECT_NAME: str = "AIP Markets"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Database (SQLite local default; use Postgres URL on hosted backends if you need persistence)
    DATABASE_URL: str = "sqlite+aiosqlite:///./asset_intelligence.db"
    SYNC_DATABASE_URL: str = "sqlite:///./asset_intelligence.db"

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
    # NoDecode: allow plain comma-separated env (Render) instead of JSON-only lists
    # Example: CORS_ORIGINS=https://app.vercel.app,http://localhost:3000
    CORS_ORIGINS: Annotated[list[str], NoDecode] = list(_DEFAULT_CORS)

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        return _parse_cors(value)


settings = Settings()
