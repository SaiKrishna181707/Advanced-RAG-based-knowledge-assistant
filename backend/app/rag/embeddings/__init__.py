"""
Embedding provider factory.

The provider is selected with ``EMBEDDING_PROVIDER``. Whatever is chosen, its
``signature`` (provider + model + dimension) is stamped into every vector index so
that a provider change invalidates stale indexes instead of silently degrading
retrieval.
"""
from __future__ import annotations

import logging
import threading

import numpy as np

from ...config import settings
from .base import EmbeddingProvider
from .hashing import HashingEmbeddingProvider

logger = logging.getLogger(__name__)

_provider: EmbeddingProvider | None = None
_lock = threading.Lock()


def _build_provider() -> EmbeddingProvider:
    name = settings.embedding_provider
    if name in {"sentence_transformers", "sentence-transformers", "st", "minilm"}:
        from .sentence_transformer import SentenceTransformerProvider

        return SentenceTransformerProvider(settings.embedding_model)
    if name in {"hashing", "local", "default"}:
        return HashingEmbeddingProvider(dimension=settings.embedding_dim)
    raise ValueError(
        f"Unsupported EMBEDDING_PROVIDER '{name}'. Use 'hashing' or 'sentence_transformers'."
    )


def get_provider() -> EmbeddingProvider:
    """Return the process-wide embedding provider, building it on first use."""
    global _provider
    if _provider is not None:
        return _provider
    with _lock:
        if _provider is None:
            _provider = _build_provider()
            logger.info(
                "Embedding provider ready",
                extra={"event": "embedding_provider_ready", "error_code": _provider.signature},
            )
        return _provider


def embedding_signature() -> str:
    return get_provider().signature


def embed_texts(texts: list[str]) -> np.ndarray:
    return get_provider().encode(texts)


def embed_query(text: str) -> np.ndarray:
    return get_provider().encode([text])[0]


__all__ = [
    "EmbeddingProvider",
    "HashingEmbeddingProvider",
    "embed_query",
    "embed_texts",
    "embedding_signature",
    "get_provider",
]
