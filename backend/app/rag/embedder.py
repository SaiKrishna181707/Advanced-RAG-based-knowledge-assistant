"""
rag/embedder.py  —  Embedding + FAISS Vector Store

What is an embedding?
  A chunk of text like "how to sort an array" → a list of 384 numbers (a vector).
  Similar texts produce vectors that are close together in 384-dimensional space.
  This is how semantic search works — we don't match keywords, we match meaning.

What is FAISS?
  Facebook AI Similarity Search — an ultra-fast library for finding the nearest
  vectors to a query vector. You already used it in your CLIP+FAISS bootcamp project!
  Same concept here, just with text instead of images.

Model: all-MiniLM-L6-v2
  - Free, runs locally, no API key needed
  - 384-dimensional output
  - ~80MB download on first use
"""

import os
import pickle
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

# --- Singleton pattern ---
# We load the model once and reuse it. Loading takes ~5 seconds.
_model = None
_index = None          # FAISS index
_chunk_store = []      # Parallel list: chunk_store[i] = metadata for vector i

FAISS_INDEX_PATH = os.path.join(os.path.dirname(__file__), "../../storage/faiss.index")
CHUNK_STORE_PATH = os.path.join(os.path.dirname(__file__), "../../storage/chunk_store.pkl")
EMBEDDING_DIM = 384    # dimension of all-MiniLM-L6-v2


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        print(f"[Embedder] Loading model: {model_name} ...")
        _model = SentenceTransformer(model_name)
        print("[Embedder] Model loaded.")
    return _model


def _get_index():
    global _index, _chunk_store

    if _index is not None:
        return _index, _chunk_store

    # Try loading saved index from disk
    if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(CHUNK_STORE_PATH):
        _index = faiss.read_index(FAISS_INDEX_PATH)
        with open(CHUNK_STORE_PATH, "rb") as f:
            _chunk_store = pickle.load(f)
        print(f"[Embedder] Loaded FAISS index with {_index.ntotal} vectors.")
    else:
        # Create a fresh flat L2 index
        _index = faiss.IndexFlatL2(EMBEDDING_DIM)
        _chunk_store = []
        print("[Embedder] Created new FAISS index.")

    return _index, _chunk_store


def _save_index():
    os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)
    faiss.write_index(_index, FAISS_INDEX_PATH)
    with open(CHUNK_STORE_PATH, "wb") as f:
        pickle.dump(_chunk_store, f)


def embed_and_store(chunks: list[dict], document_id: int) -> list[int]:
    """
    Takes text chunks, embeds them, adds to FAISS index.
    Returns list of FAISS indices (one per chunk) so we can link back to DB rows.
    """
    model = _get_model()
    index, chunk_store = _get_index()

    texts = [c["content"] for c in chunks]

    # Embed all chunks at once (batched — much faster than one by one)
    print(f"[Embedder] Embedding {len(texts)} chunks...")
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)
    embeddings = np.array(embeddings, dtype="float32")

    # Record starting position so we can return the FAISS IDs
    start_idx = index.ntotal

    # Add to FAISS
    index.add(embeddings)

    # Store metadata alongside — chunk_store[faiss_id] = {content, page, doc_id, ...}
    for i, chunk in enumerate(chunks):
        chunk_store.append({
            "faiss_id": start_idx + i,
            "document_id": document_id,
            "content": chunk["content"],
            "page_number": chunk["page_number"],
            "source": chunk["source"],
        })

    _save_index()
    print(f"[Embedder] Stored. Index now has {index.ntotal} vectors.")

    # Return the FAISS positions for each chunk
    return list(range(start_idx, start_idx + len(chunks)))


def search(query: str, top_k: int = 5) -> list[dict]:
    """
    Semantic search: embed the query, find nearest chunks in FAISS.
    Returns list of { content, page_number, document_id, score } sorted by relevance.
    """
    model = _get_model()
    index, chunk_store = _get_index()

    if index.ntotal == 0:
        return []

    # Embed the query
    query_embedding = model.encode([query], show_progress_bar=False)
    query_embedding = np.array(query_embedding, dtype="float32")

    # Search — returns (distances, indices) arrays of shape (1, top_k)
    k = min(top_k, index.ntotal)
    distances, indices = index.search(query_embedding, k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx == -1:    # FAISS returns -1 for empty slots
            continue
        meta = chunk_store[idx]
        results.append({
            **meta,
            "score": float(1 / (1 + dist)),   # Convert L2 distance to 0-1 similarity score
        })

    return results


def delete_document_vectors(document_id: int):
    """
    FAISS flat index doesn't support deletion, so we rebuild without this doc's vectors.
    Called when user deletes a document.
    """
    global _index, _chunk_store
    index, chunk_store = _get_index()

    # Keep only chunks NOT belonging to this document
    remaining = [c for c in chunk_store if c["document_id"] != document_id]

    if not remaining:
        _index = faiss.IndexFlatL2(EMBEDDING_DIM)
        _chunk_store = []
        _save_index()
        return

    # Re-embed the remaining chunks and rebuild
    model = _get_model()
    texts = [c["content"] for c in remaining]
    embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)
    embeddings = np.array(embeddings, dtype="float32")

    new_index = faiss.IndexFlatL2(EMBEDDING_DIM)
    new_index.add(embeddings)

    # Update faiss_id in metadata to match new positions
    for i, chunk in enumerate(remaining):
        chunk["faiss_id"] = i

    _index = new_index
    _chunk_store = remaining
    _save_index()
