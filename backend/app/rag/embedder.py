import os
import pickle
import hashlib
import numpy as np
import faiss

FAISS_INDEX_PATH = "/tmp/faiss.index"
CHUNK_STORE_PATH = "/tmp/chunk_store.pkl"
EMBEDDING_DIM = 256

_index = None
_chunk_store = []
_vocab = {}


def _tokenize(text: str) -> list:
    import re
    return re.findall(r'\b[a-z]{2,}\b', text.lower())


def _get_vocab():
    global _vocab
    if not _vocab and os.path.exists("/tmp/vocab.pkl"):
        with open("/tmp/vocab.pkl", "rb") as f:
            _vocab = pickle.load(f)
    return _vocab


def _save_vocab():
    with open("/tmp/vocab.pkl", "wb") as f:
        pickle.dump(_vocab, f)


def _text_to_vector(text: str) -> np.ndarray:
    """Convert text to a fixed-size vector using hashing trick."""
    tokens = _tokenize(text)
    vec = np.zeros(EMBEDDING_DIM, dtype="float32")
    for token in tokens:
        # Hash each token to a bucket position
        idx = int(hashlib.md5(token.encode()).hexdigest(), 16) % EMBEDDING_DIM
        vec[idx] += 1.0
    # Normalize
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
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
    else:
        _index = faiss.IndexFlatL2(EMBEDDING_DIM)
        _chunk_store = []
    return _index, _chunk_store


def _save_index():
    faiss.write_index(_index, FAISS_INDEX_PATH)
    with open(CHUNK_STORE_PATH, "wb") as f:
        pickle.dump(_chunk_store, f)


def embed_and_store(chunks: list, document_id: int) -> list:
    index, chunk_store = _get_index()
    texts = [c["content"] for c in chunks]
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
    return list(range(start_idx, start_idx + len(chunks)))


def search(query: str, top_k: int = 5) -> list:
    index, chunk_store = _get_index()
    if index.ntotal == 0:
        return []
    query_vec = _embed_texts([query])
    k = min(top_k, index.ntotal)
    distances, indices = index.search(query_vec, k)
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:
            continue
        results.append({**chunk_store[idx], "score": float(1 / (1 + dist))})
    return results


def delete_document_vectors(document_id: int):
    global _index, _chunk_store
    _get_index()
    remaining = [c for c in _chunk_store if c["document_id"] != document_id]
    if not remaining:
        _index = faiss.IndexFlatL2(EMBEDDING_DIM)
        _chunk_store = []
        _save_index()
        return
    embeddings = _embed_texts([c["content"] for c in remaining])
    new_index = faiss.IndexFlatL2(EMBEDDING_DIM)
    new_index.add(embeddings)
    for i, chunk in enumerate(remaining):
        chunk["faiss_id"] = i
    _index = new_index
    _chunk_store = remaining
    _save_index()