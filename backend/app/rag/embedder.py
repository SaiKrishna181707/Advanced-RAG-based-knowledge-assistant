import os
import pickle
import re
import numpy as np
import faiss

DEFAULT_EMBEDDING_DIM = 512
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", DEFAULT_EMBEDDING_DIM))

FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", "/tmp/faiss.index")
CHUNK_STORE_PATH = os.getenv("CHUNK_STORE_PATH", "/tmp/chunk_store.pkl")

_index = None
_chunk_store = []


def _tokenize(text: str) -> list:
    return re.findall(r"\b[a-zA-Z][a-zA-Z0-9]{1,}\b", text.lower())


def _text_to_vector(text: str) -> np.ndarray:
    """
    Deterministic feature-hashing embedding using unigrams + bigrams.

    This is intentionally lightweight and fully local. It is lexical rather
    than a transformer embedding, so the UI/docs should describe it accurately.
    """
    tokens = _tokenize(text)
    vec = np.zeros(EMBEDDING_DIM, dtype="float32")

    for token in tokens:
        idx = hash(token) % EMBEDDING_DIM
        vec[abs(idx)] += 1.0

    for i in range(len(tokens) - 1):
        bigram = f"{tokens[i]}_{tokens[i + 1]}"
        idx = hash(bigram) % EMBEDDING_DIM
        vec[abs(idx)] += 1.5

    if tokens:
        vec /= len(tokens)

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec /= norm

    return vec


def _embed_texts(texts: list) -> np.ndarray:
    return np.array([_text_to_vector(t) for t in texts], dtype="float32")


def _get_index():
    global _index, _chunk_store
    if _index is not None:
        return _index, _chunk_store

    if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(CHUNK_STORE_PATH):
        _index = faiss.read_index(FAISS_INDEX_PATH)
        with open(CHUNK_STORE_PATH, "rb") as f:
            _chunk_store = pickle.load(f)
        if _index.d != EMBEDDING_DIM:
            raise ValueError(
                f"Embedding dimension mismatch: index={_index.d}, configured={EMBEDDING_DIM}. "
                "Delete the persisted FAISS files and re-index the documents."
            )
        print(f"[Embedder] Loaded FAISS index: {_index.ntotal} vectors")
    else:
        _index = faiss.IndexFlatIP(EMBEDDING_DIM)
        _chunk_store = []
        print(f"[Embedder] Created new FAISS index ({EMBEDDING_DIM}d, inner product)")

    return _index, _chunk_store


def _save_index():
    os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)
    os.makedirs(os.path.dirname(CHUNK_STORE_PATH), exist_ok=True)
    faiss.write_index(_index, FAISS_INDEX_PATH)
    with open(CHUNK_STORE_PATH, "wb") as f:
        pickle.dump(_chunk_store, f)


def embed_and_store(chunks: list, document_id: int) -> list:
    index, chunk_store = _get_index()
    if not chunks:
        return []

    texts = [c["content"] for c in chunks]
    print(f"[Embedder] Embedding {len(texts)} chunks locally...")
    embeddings = _embed_texts(texts)
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
    if index.ntotal == 0 or top_k <= 0:
        return []

    query_vec = _embed_texts([query])
    k = min(max(top_k, 1), index.ntotal)
    scores, indices = index.search(query_vec, k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(chunk_store):
            continue
        results.append({**chunk_store[idx], "score": float(score)})
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

    embeddings = _embed_texts([c["content"] for c in remaining])
    new_index = faiss.IndexFlatIP(EMBEDDING_DIM)
    new_index.add(embeddings)

    for i, chunk in enumerate(remaining):
        chunk["faiss_id"] = i

    _index = new_index
    _chunk_store = remaining
    _save_index()
