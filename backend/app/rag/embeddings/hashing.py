"""
Deterministic feature-hashing embedder.

Why this exists
---------------
The pre-existing implementation hashed tokens with Python's builtin ``hash()``,
which is salted per interpreter process (``PYTHONHASHSEED``). Vectors written by
one process therefore never matched queries from another, so a persisted index
silently degraded into noise.

This implementation keeps the dependency-free approach but makes it correct and
meaningfully stronger:

* ``blake2b`` gives a stable bucket for a token on every machine and process.
* Signed buckets (the classic ``alternate_sign`` trick from scikit-learn's
  ``HashingVectorizer``) cancel collision bias instead of always accumulating.
* Sublinear term frequency, ``1 + log(tf)``, stops repeated words dominating.
* Unigrams plus word bigrams retain some phrase information.
* Vectors are L2-normalised so inner product equals cosine similarity.

It is a lexical model, not a semantic one. It is the default because it needs no
model download and fits Render's free tier; set ``EMBEDDING_PROVIDER`` to
``sentence_transformers`` for true semantic embeddings. Hybrid retrieval with BM25
compensates for much of the lexical gap. See docs/ARCHITECTURE.md.
"""
from __future__ import annotations

import hashlib
import math
import re

import numpy as np

from .base import EmbeddingProvider

_TOKEN_PATTERN = re.compile(r"[a-z][a-z0-9']{1,}")

# A small, fixed stop list. Removing these raises precision for a lexical model
# because they contribute almost no signal but occupy buckets.
_STOPWORDS = frozenset(
    """
    a an and are as at be been being but by for from had has have he her his how
    i if in into is it its me my no not of on or our out she than that the their
    them then there these they this to too up us was we were what when where which
    who why will with would you your
    """.split()
)


class HashingEmbeddingProvider(EmbeddingProvider):
    name = "hashing"
    model = "blake2b-tf-bigram"

    def __init__(self, dimension: int = 1024, bigram_weight: float = 0.75) -> None:
        self.dimension = max(128, int(dimension))
        self.bigram_weight = float(bigram_weight)

    def _bucket(self, term: str) -> tuple[int, float]:
        digest = hashlib.blake2b(term.encode("utf-8"), digest_size=8).digest()
        value = int.from_bytes(digest, "big")
        index = value % self.dimension
        sign = 1.0 if (value >> 63) & 1 else -1.0
        return index, sign

    def _tokenize(self, text: str) -> list[str]:
        return _TOKEN_PATTERN.findall(text.lower())

    def _encode_one(self, text: str) -> np.ndarray:
        vector = np.zeros(self.dimension, dtype="float32")
        tokens = [token for token in self._tokenize(text) if token not in _STOPWORDS]
        if not tokens:
            return vector

        counts: dict[str, float] = {}
        for token in tokens:
            counts[token] = counts.get(token, 0.0) + 1.0
        for first, second in zip(tokens, tokens[1:]):
            bigram = f"{first}_{second}"
            counts[bigram] = counts.get(bigram, 0.0) + self.bigram_weight

        for term, frequency in counts.items():
            index, sign = self._bucket(term)
            vector[index] += sign * (1.0 + math.log(frequency))

        norm = float(np.linalg.norm(vector))
        if norm > 0.0:
            vector /= norm
        return vector

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dimension), dtype="float32")
        return np.vstack([self._encode_one(text) for text in texts]).astype("float32")
