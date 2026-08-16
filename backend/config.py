"""
Central settings for Policy Intelligence.

WHY this file exists:
  API keys, file paths, and free-tier rate limits must live in one place
  loaded from the environment — never hardcoded in pipeline code. That keeps
  secrets out of git and lets Railway inject values at deploy time.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    """Runtime configuration. Defaults match a local 72-hour demo."""

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    groq_api_key: str = ""
    primary_llm: str = "gemini"

    sqlite_path: str = str(BACKEND_DIR / "data" / "sqlite" / "policy_intel.db")
    chroma_path: str = str(BACKEND_DIR / "data" / "chroma")
    upload_dir: str = str(BACKEND_DIR / "data" / "uploads")

    max_pdf_size_mb: int = 10
    max_chunks_per_policy: int = 500
    embedding_model: str = "all-MiniLM-L6-v2"
    cors_origins: str = "http://localhost:3000"

    gemini_rpm_limit: int = 14
    groq_rpm_limit: int = 28

    def cors_origin_list(self) -> list[str]:
        """Split comma-separated CORS origins into a list FastAPI can use."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cache settings so we do not re-read the env file on every request."""
    return Settings()
