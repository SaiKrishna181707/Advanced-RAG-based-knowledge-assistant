import os
import pickle
import time
from urllib import response
import numpy as np
import faiss

FAISS_INDEX_PATH = "/tmp/faiss.index"
CHUNK_STORE_PATH = "/tmp/chunk_store.pkl"
EMBEDDING_DIM = 1024  # Cohere embed-english-v3.0 dimension

_index = None
_chunk_store = []
_cohere_client = None


def _get_cohere():
    global _cohere_client
    if _cohere_client is None:
        import cohere
        api_key = os.getenv("COHERE_API_KEY")
        if not api_key:
            raise ValueError("COHERE_API_KEY not set in environment")
        _cohere_client = cohere.Client(api_key=api_key)
    return _cohere_client


def _embed_texts(texts: list, input_type: str = "search_document") -> np.ndarray:
    """
    Embed texts using Cohere embed-english-v3.0.
    input_type: "search_document" for chunks, "search_query" for queries.
    This distinction is important — Cohere optimizes differently for each.
    """
    client = _get_cohere()
    all_embeddings = []
    batch_size = 90  # Cohere allows up to 96 per batch

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        for attempt in range(3):
            try:
                response = client.embed(
                    texts=batch,
                    model="embed-english-light-v3.0",
                    input_type=input_type,
                )
                all_embeddings.extend(response.embeddings)
                break
            except Exception as e:
                if attempt == 2:
                    raise ValueError(f"Cohere embedding failed: {e}")
                time.sleep(2)

    return np.array(all_embeddings, dtype="float32")


def _get_index():
    global _index, _chunk_store
    if _index is not None:
        return _index, _chunk_store
    if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(CHUNK_STORE_PATH):
        _index = faiss.read_index(FAISS_INDEX_PATH)
        with open(CHUNK_STORE_PATH, "rb") as f:
            _chunk_store = pickle.load(f)
        print(f"[Embedder] Loaded FAISS index: {_index.ntotal} vectors")
    else:
        # Use IndexFlatIP for cosine similarity (Cohere embeddings are normalized)
        _index = faiss.IndexFlatIP(EMBEDDING_DIM)
        _chunk_store = []
        print("[Embedder] Created new FAISS index")
    return _index, _chunk_store


def _save_index():
    faiss.write_index(_index, FAISS_INDEX_PATH)
    with open(CHUNK_STORE_PATH, "wb") as f:
        pickle.dump(_chunk_store, f)


def embed_and_store(chunks: list, document_id: int) -> list:
    index, chunk_store = _get_index()
    texts = [c["content"] for c in chunks]
    print(f"[Embedder] Embedding {len(texts)} chunks via Cohere...")
    embeddings = _embed_texts(texts, input_type="search_document")
    # Normalize for cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / np.maximum(norms, 1e-9)

    start_idx = index.ntotal
    index.add(embeddings)

    for i, chunk in enumerate(chunks):
        chunk_store.append({
            "faiss_id": start_idx + i,
            "document_id": document_id,
            "content": chunk["content"],
            "page_number": chunk["page_number"],
            "source": chunk["source"],
        })

    _save_index()
    print(f"[Embedder] Done. Index now has {index.ntotal} vectors.")
    return list(range(start_idx, start_idx + len(chunks)))


def search(query: str, top_k: int = 5) -> list:
    index, chunk_store = _get_index()
    if index.ntotal == 0:
        return []

    # Use search_query type for queries — Cohere optimizes differently
    query_embedding = _embed_texts([query], input_type="search_query")
    norm = np.linalg.norm(query_embedding)
    query_embedding = query_embedding / max(norm, 1e-9)

    k = min(top_k, index.ntotal)
    # IndexFlatIP returns dot product (= cosine similarity for normalized vectors)
    scores, indices = index.search(query_embedding, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue
        results.append({
            **chunk_store[idx],
            "score": float(score),  # Now a real 0-1 cosine similarity score
        })
    return results


def delete_document_vectors(document_id: int):
    global _index, _chunk_store
    _get_index()
    remaining = [c for c in _chunk_store if c["document_id"] != document_id]
    if not remaining:
        _index = faiss.IndexFlatIP(EMBEDDING_DIM)
        _chunk_store = []
        _save_index()
        return
    embeddings = _embed_texts([c["content"] for c in remaining],
                               input_type="search_document")
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / np.maximum(norms, 1e-9)
    new_index = faiss.IndexFlatIP(EMBEDDING_DIM)
    new_index.add(embeddings)
    for i, chunk in enumerate(remaining):
        chunk["faiss_id"] = i
    _index = new_index
    _chunk_store = remaining
    _save_index()