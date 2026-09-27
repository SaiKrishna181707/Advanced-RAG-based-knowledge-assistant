import os
import re
from rank_bm25 import BM25Okapi
from . import embedder


def _tokenize(text: str) -> list:
    return re.findall(r"\b[a-zA-Z][a-zA-Z0-9]{1,}\b", text.lower())


def retrieve(query: str, top_k: int = None) -> list:
    top_k = top_k or int(os.getenv("RETRIEVAL_TOP_K", 5))
    top_k = max(1, min(top_k, 20))

    _, chunk_store = embedder._get_index()
    if not chunk_store:
        return []

    query_tokens = _tokenize(query)
    corpus = [_tokenize(c["content"]) for c in chunk_store]
    bm25 = BM25Okapi(corpus)
    bm25_scores = bm25.get_scores(query_tokens)

    vector_results = embedder.search(query, top_k=min(top_k * 3, len(chunk_store)))
    vector_rank = {r["faiss_id"]: rank for rank, r in enumerate(vector_results, start=1)}

    # Reciprocal Rank Fusion is less sensitive to raw score scale differences.
    bm25_order = sorted(
        range(len(chunk_store)),
        key=lambda i: bm25_scores[i],
        reverse=True,
    )

    bm25_rank = {chunk_store[i]["faiss_id"]: rank for rank, i in enumerate(bm25_order, start=1)}

    scored = []
    for chunk in chunk_store:
        fid = chunk["faiss_id"]
        r_bm25 = bm25_rank.get(fid)
        r_vector = vector_rank.get(fid)

        rrf = 0.0
        if r_bm25 is not None:
            rrf += 0.65 / (60 + r_bm25)
        if r_vector is not None:
            rrf += 0.35 / (60 + r_vector)

        scored.append({**chunk, "rrf_score": rrf, "score": rrf})

    scored.sort(key=lambda x: x["rrf_score"], reverse=True)
    return scored[:top_k]
