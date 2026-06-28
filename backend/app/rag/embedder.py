import os
import pickle
import time
import requests
import numpy as np
import faiss

_BASE = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
FAISS_INDEX_PATH = "/tmp/faiss.index"
CHUNK_STORE_PATH = "/tmp/chunk_store.pkl"
EMBEDDING_DIM = 384
HF_API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"

_index = None
_chunk_store = []

def _get_headers():
    token = os.getenv("HF_TOKEN", "")
    return {"Authorization": f"Bearer {token}"} if token else {}

def _embed_texts(texts: list) -> np.ndarray:
    all_embeddings = []
    for i in range(0, len(texts), 32):
        batch = texts[i:i+32]
        for attempt in range(3):
            try:
                response = requests.post(
                    HF_API_URL,
                    headers=_get_headers(),
                    json={"inputs": batch, "options": {"wait_for_model": True}},
                    timeout=60
                )
                if response.status_code == 200:
                    embeddings = response.json()
                    if isinstance(embeddings[0][0], list):
                        embeddings = [np.mean(e, axis=0) for e in embeddings]
                    all_embeddings.extend(embeddings)
                    break
                elif response.status_code == 503:
                    time.sleep(10)
                else:
                    raise ValueError(f"HF API error {response.status_code}: {response.text}")
            except requests.exceptions.Timeout:
                if attempt == 2:
                    raise ValueError("HuggingFace API timeout")
                time.sleep(5)
    return np.array(all_embeddings, dtype="float32")

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
    os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)
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
    query_embedding = _embed_texts([query])
    k = min(top_k, index.ntotal)
    distances, indices = index.search(query_embedding, k)
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