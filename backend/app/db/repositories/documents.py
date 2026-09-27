"""Document metadata persistence."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId

from ...errors import ConflictError
from ..serialize import doc_out, docs_out


def create_document(db, document: dict) -> dict:
    document.setdefault("_id", ObjectId())
    now = dt.datetime.now(dt.timezone.utc)
    document.setdefault("created_at", now)
    document["updated_at"] = now
    try:
        db.documents.insert_one(document)
    except Exception as exc:
        if exc.__class__.__name__ == "DuplicateKeyError":
            raise ConflictError(
                "Document already exists.",
                code="duplicate_document",
            ) from exc
        raise
    return document


def find_by_checksum(db, user_id, sha256: str) -> dict | None:
    return db.documents.find_one({"user_id": ObjectId(str(user_id)), "sha256": sha256})


def list_documents(
    db,
    user_id,
    *,
    collection_id=None,
    status: str | None = None,
    search: str | None = None,
    limit: int = 100,
    skip: int = 0,
) -> list[dict]:
    query: dict = {"user_id": ObjectId(str(user_id))}
    if collection_id is not None:
        query["collection_id"] = ObjectId(str(collection_id))
    if status:
        query["status"] = status
    if search:
        query["original_name"] = {"$regex": _escape_regex(search), "$options": "i"}
    cursor = (
        db.documents.find(query)
        .sort("created_at", -1)
        .skip(max(0, skip))
        .limit(max(1, min(limit, 200)))
    )
    return list(cursor)


def count_documents(db, user_id, *, collection_id=None) -> int:
    query: dict = {"user_id": ObjectId(str(user_id))}
    if collection_id is not None:
        query["collection_id"] = ObjectId(str(collection_id))
    return db.documents.count_documents(query)


def count_pending(db, user_id, *, collection_id=None, document_ids=None) -> int:
    """Documents in scope that are still processing and therefore not searchable.

    Lets the chat layer warn that an answer may be incomplete because part of the
    requested scope has not finished indexing yet.
    """
    query: dict = {
        "user_id": ObjectId(str(user_id)),
        "status": {"$in": ["uploading", "processing", "indexing"]},
    }
    if document_ids:
        query["_id"] = {"$in": [ObjectId(str(item)) for item in document_ids]}
    elif collection_id is not None:
        query["collection_id"] = ObjectId(str(collection_id))
    return db.documents.count_documents(query)


def get_document(db, user_id, document_id) -> dict | None:
    """Ownership-scoped fetch. Returns None when the document is not the user's."""
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return None
    return db.documents.find_one({"_id": oid, "user_id": ObjectId(str(user_id))})


def get_by_id(db, document_id) -> dict | None:
    """Internal fetch by id only. Never expose this result without an owner check."""
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return None
    return db.documents.find_one({"_id": oid})


def get_documents_by_ids(db, user_id, document_ids: list) -> list[dict]:
    if not document_ids:
        return []
    oids = [ObjectId(str(item)) for item in document_ids]
    return list(
        db.documents.find({"_id": {"$in": oids}, "user_id": ObjectId(str(user_id))})
    )


def update_document(db, user_id, document_id, *, fields: dict) -> dict | None:
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return None
    payload = dict(fields)
    payload["updated_at"] = dt.datetime.now(dt.timezone.utc)
    return db.documents.find_one_and_update(
        {"_id": oid, "user_id": ObjectId(str(user_id))},
        {"$set": payload},
        return_document=True,
    )


def delete_document(db, user_id, document_id) -> dict | None:
    try:
        oid = ObjectId(str(document_id))
    except Exception:
        return None
    return db.documents.find_one_and_delete(
        {"_id": oid, "user_id": ObjectId(str(user_id))}
    )


def set_document_collection(db, user_id, document_id, collection_id) -> dict | None:
    return update_document(db, user_id, document_id, fields={"collection_id": collection_id})


def update_many_collection(db, user_id, collection_id, new_collection_id) -> int:
    """Reassign every document in a collection. Used when a collection is deleted."""
    try:
        oid = ObjectId(str(collection_id))
    except Exception:
        return 0
    result = db.documents.update_many(
        {"user_id": ObjectId(str(user_id)), "collection_id": oid},
        {
            "$set": {
                "collection_id": new_collection_id,
                "updated_at": dt.datetime.now(dt.timezone.utc),
            }
        },
    )
    return result.modified_count


def aggregate_totals(db, user_id) -> dict:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id))}},
        {
            "$group": {
                "_id": None,
                "documents": {"$sum": 1},
                "pages": {"$sum": {"$ifNull": ["$page_count", 0]}},
                "chunks": {"$sum": {"$ifNull": ["$chunk_count", 0]}},
                "storage_bytes": {"$sum": {"$ifNull": ["$file_size", 0]}},
                "failures": {
                    "$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}
                },
            }
        },
    ]
    result = list(db.documents.aggregate(pipeline))
    return result[0] if result else {
        "documents": 0, "pages": 0, "chunks": 0, "storage_bytes": 0, "failures": 0,
    }


def aggregate_by_collection(db, user_id) -> list[dict]:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id))}},
        {"$group": {"_id": "$collection_id", "count": {"$sum": 1}}},
    ]
    return list(db.documents.aggregate(pipeline))


def aggregate_by_status(db, user_id) -> list[dict]:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id))}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    return list(db.documents.aggregate(pipeline))


def _escape_regex(value: str) -> str:
    import re
    return re.escape(value[:80])
