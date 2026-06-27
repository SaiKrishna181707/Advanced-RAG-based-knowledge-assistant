"""
rag/retriever.py  —  Hybrid Retrieval

We combine TWO search methods and merge their results:

1. Dense search (semantic):   embedding similarity via FAISS
   → Finds meaning-level matches ("car" matches "automobile")

2. Sparse search (keyword):   BM25 — classic TF-IDF style keyword matching
   → Finds exact term matches ("SQLAlchemy" matches "SQLAlchemy")

Hybrid retrieval significantly outperforms either method alone.
Final ranking uses Reciprocal Rank Fusion (RRF) — a simple but effective formula.
"""

import os
from rank_bm25 import BM25Okapi
from . import embedder


def retrieve(query: str, top_k: int = None) -> list[dict]:
    """
    Main retrieval function.
    Returns ranked list of relevant chunks with metadata.
    """
    top_k = top_k or int(os.getenv("RETRIEVAL_TOP_K", 5))

    # 1. Semantic search
    semantic_results = embedder.search(query, top_k=top_k * 2)

    if not semantic_results:
        return []

    # 2. BM25 keyword search over the same candidate set
    # (We run BM25 over retrieved chunks, not the full index, for speed)
    bm25_results = _bm25_search(query, semantic_results, top_k=top_k * 2)

    # 3. Fuse rankings
    fused = _reciprocal_rank_fusion(semantic_results, bm25_results, top_k=top_k)

    return fused


def _bm25_search(query: str, candidates: list[dict], top_k: int) -> list[dict]:
    """BM25 over a candidate set of chunks."""
    if not candidates:
        return []

    corpus = [c["content"].lower().split() for c in candidates]
    bm25 = BM25Okapi(corpus)

    query_tokens = query.lower().split()
    scores = bm25.get_scores(query_tokens)

    ranked = sorted(
        zip(scores, candidates),
        key=lambda x: x[0],
        reverse=True
    )[:top_k]

    results = []
    for score, chunk in ranked:
        results.append({**chunk, "bm25_score": float(score)})

    return results


def _reciprocal_rank_fusion(
    semantic: list[dict],
    bm25: list[dict],
    top_k: int,
    k: int = 60
) -> list[dict]:
    """
    RRF formula: score(doc) = Σ 1/(k + rank)
    k=60 is the standard constant from the original RRF paper.
    """
    scores = {}

    # Build lookup by content (used as unique ID)
    all_chunks = {}

    for rank, chunk in enumerate(semantic):
        key = chunk["content"][:100]
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        all_chunks[key] = chunk

    for rank, chunk in enumerate(bm25):
        key = chunk["content"][:100]
        scores[key] = scores.get(key, 0) + 1 / (k + rank + 1)
        all_chunks[key] = chunk

    # Sort by fused score
    ranked_keys = sorted(scores, key=lambda k: scores[k], reverse=True)[:top_k]

    results = []
    for key in ranked_keys:
        chunk = all_chunks[key].copy()
        chunk["rrf_score"] = round(scores[key], 4)
        results.append(chunk)

    return results
