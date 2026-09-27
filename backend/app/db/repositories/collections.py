"""Collection (knowledge space) persistence."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from ...errors import ConflictError


# Collections default to the brand accent so a new one never starts out with an
# off-brand colour in the UI.
DEFAULT_COLLECTION_COLOR = "#0d7d70"


def create_collection(
    db, user_id, *, name: str, description: str = "", color: str = DEFAULT_COLLECTION_COLOR
) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    document = {
        "_id": ObjectId(),
        "user_id": ObjectId(str(user_id)),
        "name": name,
        "description": description,
        "color": color,
        "created_at": now,
        "updated_at": now,
    }
    try:
        db.collections.insert_one(document)
    except DuplicateKeyError as exc:
        raise ConflictError(
            f"A collection named '{name}' already exists.",
            code="collection_name_taken",
        ) from exc
    return document


def list_collections(db, user_id) -> list[dict]:
    return list(
        db.collections.find({"user_id": ObjectId(str(user_id))}).sort("name", 1)
    )


def get_collection(db, user_id, collection_id) -> dict | None:
    try:
        oid = ObjectId(str(collection_id))
    except Exception:
        return None
    return db.collections.find_one({"_id": oid, "user_id": ObjectId(str(user_id))})


def find_by_name(db, user_id, name: str) -> dict | None:
    return db.collections.find_one(
        {"user_id": ObjectId(str(user_id)), "name": name.strip()}
    )


def update_collection(db, user_id, collection_id, *, fields: dict) -> dict | None:
    allowed = {"name", "description", "color"}
    update = {key: value for key, value in fields.items() if key in allowed and value is not None}
    if not update:
        return get_collection(db, user_id, collection_id)
    update["updated_at"] = dt.datetime.now(dt.timezone.utc)
    try:
        return db.collections.find_one_and_update(
            {"_id": ObjectId(str(collection_id)), "user_id": ObjectId(str(user_id))},
            {"$set": update},
            return_document=True,
        )
    except DuplicateKeyError as exc:
        raise ConflictError(
            "Another collection already uses that name.",
            code="collection_name_taken",
        ) from exc


def delete_collection(db, user_id, collection_id) -> dict | None:
    try:
        oid = ObjectId(str(collection_id))
    except Exception:
        return None
    return db.collections.find_one_and_delete(
        {"_id": oid, "user_id": ObjectId(str(user_id))}
    )


def document_counts(db, user_id) -> dict[str, int]:
    """Map of collection id string to document count, for list rendering."""
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id)), "collection_id": {"$ne": None}}},
        {"$group": {"_id": "$collection_id", "count": {"$sum": 1}}},
    ]
    return {str(row["_id"]): row["count"] for row in db.documents.aggregate(pipeline)}


def chunk_counts(db, user_id) -> dict[str, int]:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id)), "collection_id": {"$ne": None}}},
        {"$group": {"_id": "$collection_id", "count": {"$sum": 1}}},
    ]
    return {str(row["_id"]): row["count"] for row in db.chunks.aggregate(pipeline)}


def storage_by_collection(db, user_id) -> dict[str, int]:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id)), "collection_id": {"$ne": None}}},
        {"$group": {"_id": "$collection_id", "bytes": {"$sum": {"$ifNull": ["$file_size", 0]}}}},
    ]
    return {str(row["_id"]): row["bytes"] for row in db.documents.aggregate(pipeline)}


def ensure_default(db, user_id) -> dict:
    """Return the user's default collection, creating it on first use."""
    existing = find_by_name(db, user_id, "General")
    if existing:
        return existing
    return create_collection(
        db,
        user_id,
        name="General",
        description="Default space for documents that are not filed elsewhere.",
    )
