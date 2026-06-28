import os
from rank_bm25 import BM25Okapi
from . import embedder
import re


def _tokenize(text: str) -> list:
    return re.findall(r'\b[a-zA-Z][a-zA-Z0-9]{1,}\b', text.lower())


def retrieve(query: str, top_k: int = None) -> list:
    top_k = top_k or int(os.getenv("RETRIEVAL_TOP_K", 5))

    # Get all chunks from store
    _, chunk_store = embedder._get_index()
    if not chunk_store:
        return []

    # BM25 over ALL chunks — much better for exact term matching
    corpus = [_tokenize(c["content"]) for c in chunk_store]
    bm25 = BM25Okapi(corpus)
    query_tokens = _tokenize(query)
    bm25_scores = bm25.get_scores(query_tokens)

    # FAISS vector search
    vector_results = embedder.search(query, top_k=top_k * 2)
    vector_ids = {r["faiss_id"]: r["score"] for r in vector_results}

    # Fuse: BM25 rank + vector score
    scored = []
    for i, chunk in enumerate(chunk_store):
        bm25_score = float(bm25_scores[i])
        vector_score = vector_ids.get(chunk["faiss_id"], 0.0)

        # Normalize BM25 score
        max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1
        norm_bm25 = bm25_score / max_bm25

        # Combined score: BM25 weighted higher since it's more reliable here
        combined = (0.65 * norm_bm25) + (0.35 * vector_score)
        scored.append({**chunk, "rrf_score": combined, "score": combined})

    # Sort and return top_k
    scored.sort(key=lambda x: x["rrf_score"], reverse=True)
    return scored[:top_k]