"""
Per-user hybrid search index.

The index holds two views of the same corpus:

* a dense vector index (FAISS ``IndexFlatIP`` when available, otherwise an exact
  NumPy inner-product index) over L2-normalised embeddings, and
* a BM25 index over the chunk text.

MongoDB remains the source of truth. The index is a derived structure built from
the ``chunks`` collection and cached in memory keyed by the user's corpus revision,
so it is rebuilt only when the corpus actually changes.
"""
from __future__ import annotations

import logging
import re
import threading
from collections import OrderedDict
from typing import Protocol, Sequence

import numpy as np

from ..db.repositories import chunks as chunks_repo
from ..db.repositories import corpus as corpus_repo
from .embeddings import embed_texts, embedding_signature

logger = logging.getLogger(__name__)

MAX_CACHED_USERS = 8
_TOKEN_PATTERN = re.compile(r"[a-z][a-z0-9']{1,}")


def tokenize(text: str) -> list[str]:
    """Shared lexical tokenizer for BM25 indexing and querying."""
    return _TOKEN_PATTERN.findall((text or "").lower())


# --------------------------------------------------------------------- backends


class VectorBackend(Protocol):
    dimension: int

    @property
    def ntotal(self) -> int: ...

    def add(self, vectors: np.ndarray) -> None: ...

    def search(
        self,
        query_vector: np.ndarray,
        k: int,
        allowed_positions: Sequence[int] | None = None,
    ) -> tuple[list[float], list[int]]: ...


class FaissBackend:
    """FAISS IndexFlatIP. Inner product on unit vectors equals cosine similarity."""

    def __init__(self, dimension: int) -> None:
        import faiss

        self._faiss = faiss
        self.dimension = dimension
        self._index = faiss.IndexFlatIP(dimension)

    @property
    def ntotal(self) -> int:
        return int(self._index.ntotal)

    def add(self, vectors: np.ndarray) -> None:
        if vectors.size == 0:
            return
        self._index.add(np.ascontiguousarray(vectors, dtype="float32"))

    def search(self, query_vector, k, allowed_positions=None):
        if self.ntotal == 0 or k <= 0:
            return [], []
        query = np.ascontiguousarray(query_vector.reshape(1, -1), dtype="float32")

        if allowed_positions is not None:
            positions = [int(item) for item in allowed_positions]
            if not positions:
                return [], []
            k = min(k, len(positions))
            selector = self._faiss.IDSelectorBatch(np.array(positions, dtype="int64"))
            params = self._faiss.SearchParameters(sel=selector)
            scores, indices = self._index.search(query, k, params=params)
        else:
            k = min(k, self.ntotal)
            scores, indices = self._index.search(query, k)

        return _clean_results(scores[0], indices[0])


class NumpyBackend:
    """Exact inner-product search. Used when faiss-cpu is not installed."""

    def __init__(self, dimension: int) -> None:
        self.dimension = dimension
        self._matrix = np.zeros((0, dimension), dtype="float32")

    @property
    def ntotal(self) -> int:
        return int(self._matrix.shape[0])

    def add(self, vectors: np.ndarray) -> None:
        if vectors.size == 0:
            return
        self._matrix = np.vstack([self._matrix, np.asarray(vectors, dtype="float32")])

    def search(self, query_vector, k, allowed_positions=None):
        if self.ntotal == 0 or k <= 0:
            return [], []
        query = np.asarray(query_vector, dtype="float32").reshape(-1)
        if allowed_positions is not None:
            positions = np.asarray([int(item) for item in allowed_positions], dtype="int64")
            if positions.size == 0:
                return [], []
            subset = self._matrix[positions]
            scores = subset @ query
            k = min(k, scores.shape[0])
            top = np.argpartition(-scores, k - 1)[:k]
            order = top[np.argsort(-scores[top])]
            return [float(scores[i]) for i in order], [int(positions[i]) for i in order]

        scores = self._matrix @ query
        k = min(k, scores.shape[0])
        top = np.argpartition(-scores, k - 1)[:k]
        order = top[np.argsort(-scores[top])]
        return [float(scores[i]) for i in order], [int(i) for i in order]


def _clean_results(scores, indices) -> tuple[list[float], list[int]]:
    clean_scores: list[float] = []
    clean_indices: list[int] = []
    for score, index in zip(scores, indices):
        if int(index) < 0:
            continue
        clean_scores.append(float(score))
        clean_indices.append(int(index))
    return clean_scores, clean_indices


def build_vector_backend(dimension: int) -> VectorBackend:
    try:
        return FaissBackend(dimension)
    except Exception:
        logger.info(
            "faiss-cpu unavailable, using the NumPy vector backend",
            extra={"event": "vector_backend_fallback"},
        )
        return NumpyBackend(dimension)


# ------------------------------------------------------------------ index object


class UserSearchIndex:
    """Dense + lexical views over one user's chunk corpus."""

    def __init__(self, user_id: str, revision: int, signature: str, dimension: int) -> None:
        self.user_id = user_id
        self.revision = revision
        self.signature = signature
        self.dimension = dimension
        self.entries: list[dict] = []
        self._vectors: VectorBackend | None = None
        self._bm25 = None

    @property
    def size(self) -> int:
        return len(self.entries)

    def allowed_positions(
        self,
        *,
        document_ids: Sequence[str] | None = None,
        collection_id: str | None = None,
    ) -> list[int] | None:
        """Positions matching a retrieval scope, or None when the scope is everything."""
        if document_ids:
            wanted = {str(item) for item in document_ids}
            return [
                position
                for position, entry in enumerate(self.entries)
                if entry["document_id"] in wanted
            ]
        if collection_id:
            wanted = str(collection_id)
            return [
                position
                for position, entry in enumerate(self.entries)
                if entry["collection_id"] == wanted
            ]
        return None

    def dense_search(self, query_vector, k: int, allowed=None):
        if self._vectors is None or self._vectors.ntotal == 0:
            return []
        scores, positions = self._vectors.search(query_vector, k, allowed)
        return list(zip(positions, scores))

    def lexical_search(self, query_tokens: list[str], k: int, allowed=None):
        if not query_tokens or self._bm25 is None:
            return []
        scores = np.asarray(self._bm25.get_scores(query_tokens), dtype="float32")
        if scores.size == 0:
            return []
        if allowed is not None:
            allowed_array = np.asarray(allowed, dtype="int64")
            if allowed_array.size == 0:
                return []
            subset = scores[allowed_array]
            take = min(k, subset.size)
            top = np.argpartition(-subset, take - 1)[:take]
            order = top[np.argsort(-subset[top])]
            return [
                (int(allowed_array[i]), float(subset[i]))
                for i in order
                if subset[i] > 0
            ]
        take = min(k, scores.size)
        top = np.argpartition(-scores, take - 1)[:take]
        order = top[np.argsort(-scores[top])]
        return [(int(i), float(scores[i])) for i in order if scores[i] > 0]


# ----------------------------------------------------------------------- builder


def build_index(db, user_id, revision: int, signature: str) -> UserSearchIndex:
    dimension = _dimension_for(signature)
    index = UserSearchIndex(str(user_id), revision, signature, dimension)

    contents: list[str] = []
    for chunk in chunks_repo.iter_for_user(db, user_id):
        content = chunk.get("content") or ""
        if not content.strip():
            continue
        index.entries.append(
            {
                "chunk_id": str(chunk["_id"]),
                "document_id": str(chunk["document_id"]) if chunk.get("document_id") else None,
                "collection_id": str(chunk["collection_id"]) if chunk.get("collection_id") else None,
                "document_name": chunk.get("document_name") or "Document",
                "page_number": chunk.get("page_number"),
                "location_unit": chunk.get("location_unit") or "page",
                "content": content,
            }
        )
        contents.append(content)

    if not contents:
        return index

    vectors = embed_texts(contents)
    if vectors.shape[1] != dimension:
        dimension = int(vectors.shape[1])
        index.dimension = dimension
    backend = build_vector_backend(dimension)
    backend.add(vectors)
    index._vectors = backend

    try:
        # BM25Plus rather than BM25Okapi: Okapi's IDF is negative for terms that occur
        # in most documents, which makes keyword search return nothing at all on small
        # corpora. BM25Plus cannot produce negative scores.
        from rank_bm25 import BM25Plus

        corpus = [tokenize(content) for content in contents]
        index._bm25 = BM25Plus(corpus)
    except Exception:
        logger.warning("BM25 index unavailable", extra={"event": "bm25_unavailable"})
        index._bm25 = None

    return index


def _dimension_for(signature: str) -> int:
    try:
        return int(signature.rsplit(":", 1)[-1])
    except (ValueError, IndexError):
        return embedding_dimension()


def embedding_dimension() -> int:
    from .embeddings import get_provider

    return int(get_provider().dimension)


# ------------------------------------------------------------------------- cache

_cache: "OrderedDict[str, UserSearchIndex]" = OrderedDict()
_cache_lock = threading.Lock()


def get_index(db, user_id) -> UserSearchIndex:
    """Return a fresh-enough index for the user, building it when the corpus moved."""
    key = str(user_id)
    revision = corpus_repo.get_revision(db, user_id)
    signature = embedding_signature()

    with _cache_lock:
        cached = _cache.get(key)
        if cached is not None and cached.revision == revision and cached.signature == signature:
            _cache.move_to_end(key)
            return cached

    index = build_index(db, user_id, revision, signature)

    with _cache_lock:
        _cache[key] = index
        _cache.move_to_end(key)
        while len(_cache) > MAX_CACHED_USERS:
            _cache.popitem(last=False)

    logger.info(
        "Search index built",
        extra={
            "event": "index_built",
            "user_id": key,
            "chunk_count": index.size,
            "result_count": revision,
        },
    )
    return index


def invalidate(user_id) -> None:
    """Drop a user's cached index. The next search rebuilds it from MongoDB."""
    with _cache_lock:
        _cache.pop(str(user_id), None)


def cached_index_count() -> int:
    with _cache_lock:
        return len(_cache)


def backend_name() -> str:
    """Name of the dense vector backend in use, for the health endpoint."""
    try:
        import faiss  # noqa: F401

        return "faiss"
    except Exception:
        return "numpy"


def get_provider():
    """The active embedding provider.

    Re-exported here so routes only need to import app.rag.index_store.
    """
    from .embeddings import get_provider as _get_provider

    return _get_provider()
