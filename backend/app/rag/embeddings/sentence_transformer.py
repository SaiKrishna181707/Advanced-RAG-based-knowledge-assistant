"""
Optional sentence-transformers provider (true semantic embeddings).

Enable with::

    EMBEDDING_PROVIDER=sentence_transformers
    EMBEDDING_MODEL=all-MiniLM-L6-v2

This requires the ``sentence-transformers`` extra (and therefore PyTorch), which is
why it is not the default: PyTorch publishes no Windows ARM64 wheel, and the model
plus runtime do not fit comfortably in Render's 512 MB free tier.
"""
from __future__ import annotations

import numpy as np

from .base import EmbeddingProvider


class SentenceTransformerProvider(EmbeddingProvider):
    name = "sentence_transformers"

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:  # pragma: no cover - depends on optional extra
            raise RuntimeError(
                "EMBEDDING_PROVIDER is 'sentence_transformers' but the package is not "
                "installed. Run: pip install sentence-transformers"
            ) from exc

        self.model = model_name
        self._model = SentenceTransformer(model_name)
        self.dimension = int(self._model.get_sentence_embedding_dimension())

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimension), dtype="float32")
        vectors = self._model.encode(
            texts,
            batch_size=32,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
        return np.asarray(vectors, dtype="float32")
