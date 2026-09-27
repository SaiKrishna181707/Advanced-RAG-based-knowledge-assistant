"""
Central configuration for the ALBATROSS backend.

Every environment read in the project happens here so the rest of the codebase
never calls ``os.getenv`` directly. Values are resolved once at import time.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_ROOT.parent

load_dotenv(BACKEND_ROOT / ".env")

DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
)

DEFAULT_ALLOWED_EXTENSIONS = ("pdf", "txt", "md", "markdown", "docx", "csv")

# Preferred Groq models, best first. The first model the API key can actually use
# wins, so a key that lacks access to the top choice still gets a working assistant.
GROQ_MODEL_PREFERENCE = (
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
)
DEFAULT_GROQ_MODEL = GROQ_MODEL_PREFERENCE[0]

DEFAULT_SECRETS = {
    "",
    "dev-secret-key",
    "change-this-to-a-random-string-in-production",
}


def _raw(name: str, default: str = "") -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return value.strip()


def _int(name: str, default: int) -> int:
    try:
        return int(_raw(name, str(default)))
    except (TypeError, ValueError):
        return default


def _float(name: str, default: float) -> float:
    try:
        return float(_raw(name, str(default)))
    except (TypeError, ValueError):
        return default


def _bool(name: str, default: bool = False) -> bool:
    return _raw(name, str(default)).lower() in {"1", "true", "yes", "on"}


def _list(name: str, default: tuple[str, ...]) -> list[str]:
    raw = _raw(name, "")
    if not raw:
        return list(default)
    return [item.strip().rstrip("/") for item in raw.split(",") if item.strip()]


class Settings:
    """Resolved configuration values for the running process."""

    def __init__(self) -> None:
        # --- Runtime ---
        self.env = _raw("APP_ENV", _raw("FLASK_ENV", "development")).lower()
        self.is_production = self.env in {"production", "prod"}

        # --- Secrets ---
        self.secret_key = _raw("FLASK_SECRET_KEY", "")
        self.jwt_secret = _raw("JWT_SECRET", "") or self.secret_key
        self.jwt_algorithm = "HS256"
        self.jwt_ttl_hours = _int("JWT_EXPIRES_HOURS", 168)

        # --- MongoDB ---
        self.mongodb_uri = _raw("MONGODB_URI", _raw("MONGO_URI", ""))
        self.mongodb_database = _raw("MONGODB_DATABASE", "albatross")
        self.mongodb_timeout_ms = _int("MONGODB_TIMEOUT_MS", 5000)

        # --- LLM ---
        self.groq_api_key = _raw("GROQ_API_KEY", "")
        self.groq_model = _raw("GROQ_MODEL", DEFAULT_GROQ_MODEL)
        # Reasoning models (gpt-oss, ...) spend part of ``max_tokens`` on hidden
        # reasoning before emitting any answer, so the budget has to be generous
        # and the effort level has to be explicit.
        self.llm_reasoning_effort = _raw("LLM_REASONING_EFFORT", "low").lower()
        self.llm_temperature = _float("LLM_TEMPERATURE", 0.1)
        self.llm_max_tokens = _int("LLM_MAX_TOKENS", 1024)
        self.llm_timeout_seconds = _float("LLM_TIMEOUT_SECONDS", 60.0)
        self.llm_model_timeout_seconds = _float("LLM_MODEL_TIMEOUT_SECONDS", 10.0)
        self.followup_max_tokens = _int("FOLLOWUP_MAX_TOKENS", 400)
        self.history_turns = _int("CONVERSATION_HISTORY_TURNS", 4)

        # --- Embeddings ---
        self.embedding_provider = _raw("EMBEDDING_PROVIDER", "hashing").lower()
        self.embedding_model = _raw("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        self.embedding_dim = _int("EMBEDDING_DIM", 1024)

        # --- Chunking ---
        self.chunk_size = _int("CHUNK_SIZE", 500)
        self.chunk_overlap = _int("CHUNK_OVERLAP", 50)
        self.min_chunk_chars = _int("MIN_CHUNK_CHARS", 30)

        # --- Retrieval ---
        self.retrieval_top_k = _int("RETRIEVAL_TOP_K", 5)
        self.retrieval_candidates = _int("RETRIEVAL_CANDIDATES", 40)
        self.max_top_k = _int("MAX_TOP_K", 20)
        self.rrf_k = _int("RRF_K", 60)
        self.bm25_weight = _float("BM25_WEIGHT", 0.5)
        self.dense_weight = _float("DENSE_WEIGHT", 0.5)

        # --- Uploads and storage ---
        self.max_file_size_mb = _int("MAX_FILE_SIZE_MB", 50)
        self.allowed_extensions = tuple(
            ext.lower().lstrip(".")
            for ext in _list("ALLOWED_EXTENSIONS", DEFAULT_ALLOWED_EXTENSIONS)
        )
        self.upload_folder = self._resolve_path("UPLOAD_FOLDER", BACKEND_ROOT / "uploads")
        self.storage_folder = self._resolve_path("STORAGE_FOLDER", BACKEND_ROOT / "storage")

        # --- CORS ---
        self.cors_origins = _list("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)

        # --- Rate limiting ---
        self.rate_limit_enabled = _bool("RATE_LIMIT_ENABLED", True)
        self.rate_limit_window_seconds = _int("RATE_LIMIT_WINDOW_SECONDS", 60)
        self.rate_limit_auth = _int("RATE_LIMIT_AUTH", 20)
        self.rate_limit_upload = _int("RATE_LIMIT_UPLOAD", 30)
        self.rate_limit_chat = _int("RATE_LIMIT_CHAT", 60)
        self.rate_limit_default = _int("RATE_LIMIT_DEFAULT", 300)

        # --- Misc ---
        self.log_level = _raw("LOG_LEVEL", "INFO").upper()
        self.max_preview_chars = _int("MAX_PREVIEW_CHARS", 20000)
        self.processing_mode = _raw("PROCESSING_MODE", "background").lower()

    @staticmethod
    def _resolve_path(name: str, default: Path) -> Path:
        raw = _raw(name, "")
        if not raw:
            return default
        candidate = Path(raw)
        if not candidate.is_absolute():
            candidate = BACKEND_ROOT / candidate
        return candidate

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    def startup_problems(self) -> list[str]:
        """Configuration gaps worth surfacing in logs and the health endpoint."""
        problems: list[str] = []
        if not self.mongodb_uri:
            problems.append("MONGODB_URI is not set, so persistence is unavailable.")
        if not self.groq_api_key or self.groq_api_key == "your_groq_api_key_here":
            problems.append("GROQ_API_KEY is not set, so answer generation is unavailable.")
        if not self.jwt_secret:
            problems.append("JWT_SECRET or FLASK_SECRET_KEY is not set, so authentication is unavailable.")
        if self.is_production:
            if self.secret_key in DEFAULT_SECRETS:
                problems.append("FLASK_SECRET_KEY is a default value in production.")
            if "*" in self.cors_origins:
                problems.append("CORS_ORIGINS allows '*' in production.")
        return problems


settings = Settings()
