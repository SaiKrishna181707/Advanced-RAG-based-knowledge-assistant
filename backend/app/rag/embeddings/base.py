"""Embedding provider interface."""
from __future__ import annotations

from abc import ABC, abstractmethod

import numpy as np


class EmbeddingProvider(ABC):
    """Converts text into L2-normalised float32 vectors."""

    name: str = "base"
    dimension: int = 0
    model: str = ""

    @abstractmethod
    def encode(self, texts: list[str]) -> np.ndarray:
        """Return an ``(len(texts), dimension)`` float32 array of unit vectors."""

    @property
    def signature(self) -> str:
        """Stable identifier used to version vector indexes."""
        return f"{self.name}:{self.model or 'default'}:{self.dimension}"

    def encode_batched(self, texts: list[str], *, batch_size: int = 64) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimension), dtype="float32")
        chunks = [
            self.encode(texts[start : start + batch_size])
            for start in range(0, len(texts), batch_size)
        ]
        return np.vstack(chunks).astype("float32")
