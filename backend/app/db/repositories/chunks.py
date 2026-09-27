"""Chunk persistence. Chunks are the retrieval corpus and the citation source."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId


def insert_chunks(db, chunks: list[dict]) -> int:
    if not chunks:
        return 0
    now = dt.datetime.now(dt.timezone.utc)
    for chunk in chunks:
        chunk.setdefault("_id", ObjectId())
        chunk.setdefault("created_at", now)
    db.chunks.insert_many(chunks, ordered=False)
    return len(chunks)


def get_chunk(db, user_id, chunk_id) -> dict | None:
    try:
        oid = ObjectId(str(chunk_id))
    except Exception:
        return None
    return db.chunks.find_one({"_id": oid, "user_id": ObjectId(str(user_id))})


def iter_for_user(db, user_id, *, document_ids=None, collection_id=None):
    """Yield every chunk in the user's corpus, optionally filtered by scope."""
    query: dict = {"user_id": ObjectId(str(user_id))}
    if document_ids:
        query["document_id"] = {"$in": [ObjectId(str(item)) for item in document_ids]}
    elif collection_id is not None:
        query["collection_id"] = ObjectId(str(collection_id))
    projection = {
        "_id": 1,
        "document_id": 1,
        "collection_id": 1,
        "document_name": 1,
        "content": 1,
        "page_number": 1,
        "chunk_index": 1,
        "char_count": 1,
    }
    for chunk in db.chunks.find(query, projection).sort("chunk_index", 1):
        yield chunk


def list_for_document(db, user_id, document_id, *, limit: int = 500) -> list[dict]:
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return []
    return list(
        db.chunks.find({"user_id": ObjectId(str(user_id)), "document_id": oid})
        .sort("chunk_index", 1)
        .limit(limit)
    )


def count_for_document(db, user_id, document_id) -> int:
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return 0
    return db.chunks.count_documents(
        {"user_id": ObjectId(str(user_id)), "document_id": oid}
    )


def count_for_user(db, user_id) -> int:
    return db.chunks.count_documents({"user_id": ObjectId(str(user_id))})


def count_for_collection(db, user_id, collection_id) -> int:
    """Chunks belonging to one collection. Unfiled chunks are not counted."""
    try:
        oid = ObjectId(str(collection_id))
    except Exception:
        return 0
    return db.chunks.count_documents(
        {"user_id": ObjectId(str(user_id)), "collection_id": oid}
    )


def delete_for_document(db, user_id, document_id) -> int:
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return 0
    return db.chunks.delete_many(
        {"user_id": ObjectId(str(user_id)), "document_id": oid}
    ).deleted_count


def delete_for_collection(db, user_id, collection_id) -> int:
    try:
        oid = ObjectId(str(collection_id))
    except Exception:
        return 0
    return db.chunks.delete_many(
        {"user_id": ObjectId(str(user_id)), "collection_id": oid}
    ).deleted_count


def get_many(db, user_id, chunk_ids: list) -> list[dict]:
    if not chunk_ids:
        return []
    oids = []
    for item in chunk_ids:
        try:
            oids.append(ObjectId(str(item)))
        except Exception:
            continue
    if not oids:
        return []
    return list(db.chunks.find({"_id": {"$in": oids}, "user_id": ObjectId(str(user_id))}))
