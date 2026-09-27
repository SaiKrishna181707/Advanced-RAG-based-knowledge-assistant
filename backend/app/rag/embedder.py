import os
import pickle
import re
import numpy as np
import faiss

DEFAULT_EMBEDDING_DIM = 512
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", DEFAULT_EMBEDDING_DIM))

_DATA_DIR = os.getenv("DATA_DIR", "/tmp")
FAISS_INDEX_PATH = os.getenv("FAISS_INDEX_PATH", os.path.join(_DATA_DIR, "faiss.index"))
CHUNK_STORE_PATH = os.getenv("CHUNK_STORE_PATH", os.path.join(_DATA_DIR, "chunk_store.pkl"))

_index = None
_chunk_store = []


def _tokenize(text: str) -> list:
    return re.findall(r"[a-zA-Z][a-zA-Z0-9]{1,}", text.lower())


def _text_to_vector(text: str) -> np.ndarray:
    """Local feature-hashing embedding with unigram and bigram features."""
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
    else:
        _index = faiss.IndexFlatIP(EMBEDDING_DIM)
        _chunk_store = []

    return _index, _chunk_store


def _save_index():
    for path in (FAISS_INDEX_PATH, CHUNK_STORE_PATH):
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)

    faiss.write_index(_index, FAISS_INDEX_PATH)
    with open(CHUNK_STORE_PATH, "wb") as f:
        pickle.dump(_chunk_store, f)


def embed_and_store(chunks: list, document_id: int) -> list:
    index, chunk_store = _get_index()
    if not chunks:
        return []

    embeddings = _embed_texts([c["content"] for c in chunks])
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
