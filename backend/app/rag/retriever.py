"""
Hybrid retrieval.

Pipeline: query preprocessing -> dense (vector) and lexical (BM25) candidate
generation -> Reciprocal Rank Fusion -> scope filtering -> deduplication ->
top-k selection.

RRF is used instead of the previous weighted sum of raw scores because BM25 scores
and cosine similarities live on different, corpus-dependent scales. Fusing *ranks*
removes the need to normalise two incomparable quantities, and it is the standard
approach in hybrid search.
"""
from __future__ import annotations

import logging
import re
from typing import Sequence

from ..config import settings
from . import index_store
from .embeddings import embed_query
from .extractor import _clean_text
from .index_store import tokenize

logger = logging.getLogger(__name__)

MODES = ("hybrid", "semantic", "keyword")
_WHITESPACE = re.compile(r"\s+")


def preprocess_query(query: str) -> str:
    """Normalise a user query without destroying meaning."""
    cleaned = _WHITESPACE.sub(" ", (query or "").strip())
    return cleaned[:1000]


def reciprocal_rank_fusion(
    ranked_lists: Sequence[tuple[list[tuple[int, float]], float]],
    *,
    k: int | None = None,
) -> dict[int, float]:
    """Fuse several ranked result lists into a single score per position."""
    k = k or settings.rrf_k
    fused: dict[int, float] = {}
    for ranking, weight in ranked_lists:
        if weight <= 0:
            continue
        for rank, (position, _score) in enumerate(ranking, start=1):
            fused[position] = fused.get(position, 0.0) + weight / (k + rank)
    return fused


def search(
    db,
    user_id,
    query: str,
    *,
    top_k: int | None = None,
    candidates: int | None = None,
    collection_id=None,
    document_ids: Sequence[str] | None = None,
    mode: str = "hybrid",
) -> list[dict]:
    """Return the most relevant chunks for ``query`` within the user's scope."""
    cleaned = preprocess_query(query)
    if not cleaned:
        return []
    mode = mode if mode in MODES else "hybrid"

    index = index_store.get_index(db, user_id)
    if index.size == 0:
        return []

    allowed = index.allowed_positions(
        document_ids=[str(item) for item in document_ids] if document_ids else None,
        collection_id=str(collection_id) if collection_id else None,
    )
    if allowed is not None and not allowed:
        return []

    top_k = max(1, min(top_k or settings.retrieval_top_k, settings.max_top_k))
    pool = max(candidates or settings.retrieval_candidates, top_k * 4)
    pool = min(pool, index.size)

    dense: list[tuple[int, float]] = []
    lexical: list[tuple[int, float]] = []

    if mode in ("hybrid", "semantic"):
        try:
            dense = index.dense_search(embed_query(cleaned), pool, allowed)
        except Exception:
            logger.exception("Dense retrieval failed", extra={"event": "dense_retrieval_failed"})
            dense = []
    if mode in ("hybrid", "keyword"):
        lexical = index.lexical_search(tokenize(cleaned), pool, allowed)

    ranked_lists = [
        (dense, settings.dense_weight if mode == "hybrid" else 1.0),
        (lexical, settings.bm25_weight if mode == "hybrid" else 1.0),
    ]
    fused = reciprocal_rank_fusion(ranked_lists)
    if not fused:
        return []

    dense_scores = dict(dense)
    lexical_scores = dict(lexical)
    best = max(fused.values()) or 1.0

    ordered = sorted(fused.items(), key=lambda item: item[1], reverse=True)
    results: list[dict] = []
    seen: set[tuple] = set()

    for position, score in ordered:
        if len(results) >= top_k:
            break
        entry = index.entries[position]
        fingerprint = (
            entry["document_id"],
            entry["page_number"],
            entry["content"][:160].strip().lower(),
        )
        if fingerprint in seen:
            continue
        seen.add(fingerprint)

        results.append(
            {
                "chunk_id": entry["chunk_id"],
                "document_id": entry["document_id"],
                "document_name": entry["document_name"],
                "page_number": entry["page_number"],
                "location_unit": entry.get("location_unit") or "page",
                "collection_id": entry["collection_id"],
                "content": entry["content"],
                "snippet": _snippet(entry["content"]),
                "score": round(score, 6),
                "relevance": round(score / best, 4),
                "similarity": round(dense_scores.get(position, 0.0), 4),
                "keyword_score": round(lexical_scores.get(position, 0.0), 4),
                "rank": len(results) + 1,
            }
        )
    return results


def _snippet(content: str, limit: int = 320) -> str:
    text = _clean_text(content)
    if len(text) <= limit:
        return text
    cut = text[:limit]
    if " " in cut:
        cut = cut[: cut.rfind(" ")]
    return cut + "..."
