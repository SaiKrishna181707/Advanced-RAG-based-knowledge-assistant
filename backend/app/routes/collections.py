"""Collections (knowledge spaces) API."""
from __future__ import annotations

import logging
import re

from flask import Blueprint, request

from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import chunks as chunks_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import corpus as corpus_repo
from ..db.repositories import documents as documents_repo
from ..deps import current_user
from ..security import require_auth
from ..errors import ConflictError, NotFoundError, ValidationError, ok
from ..rag import index_store
from ..validators import json_body, optional_string, parse_object_ids, require_string

logger = logging.getLogger(__name__)

collections_bp = Blueprint("collections", __name__)

HEX_COLOR = re.compile(r"^#[0-9a-fA-F]{6}$")


def _collection_payload(collection: dict, *, document_count: int = 0, chunk_count: int = 0,
                        storage_bytes: int = 0) -> dict:
    return {
        "id": str(collection["_id"]),
        "name": collection.get("name"),
        "description": collection.get("description") or "",
        "color": collection.get("color") or collections_repo.DEFAULT_COLLECTION_COLOR,
        "document_count": document_count,
        "chunk_count": chunk_count,
        "storage_bytes": storage_bytes,
        "created_at": collection.get("created_at"),
        "updated_at": collection.get("updated_at"),
    }


@collections_bp.route("/", methods=["GET"])
@require_auth
def list_collections():
    db = get_db()
    user = current_user(db)
    collections = collections_repo.list_collections(db, user["_id"])
    document_counts = collections_repo.document_counts(db, user["_id"])
    chunk_counts = collections_repo.chunk_counts(db, user["_id"])
    storage = collections_repo.storage_by_collection(db, user["_id"])

    payload = [
        _collection_payload(
            collection,
            document_count=document_counts.get(str(collection["_id"]), 0),
            chunk_count=chunk_counts.get(str(collection["_id"]), 0),
            storage_bytes=storage.get(str(collection["_id"]), 0),
        )
        for collection in collections
    ]
    unfiled = documents_repo.count_documents(db, user["_id"]) - sum(document_counts.values())
    return ok({"collections": payload, "unfiled_documents": max(0, unfiled)})


@collections_bp.route("/", methods=["POST"])
@require_auth
def create_collection():
    data = json_body()
    name = require_string(data, "name", min_length=1, max_length=80, label="collection name")
    description = optional_string(data, "description", max_length=300) or ""
    color = (
        optional_string(data, "color", max_length=9)
        or collections_repo.DEFAULT_COLLECTION_COLOR
    )
    if not HEX_COLOR.match(color):
        raise ValidationError("Colour must be a hex value such as #0d7d70.")

    db = get_db()
    user = current_user(db)
    if collections_repo.find_by_name(db, user["_id"], name):
        raise ConflictError(f"A collection named '{name}' already exists.")

    collection = collections_repo.create_collection(
        db, user["_id"], name=name, description=description, color=color
    )
    activity_repo.record(
        db, user["_id"], "collection.created", metadata={"name": name}
    )
    return ok({"collection": _collection_payload(collection)}, status=201)


@collections_bp.route("/<collection_id>", methods=["GET"])
@require_auth
def get_collection(collection_id: str):
    db = get_db()
    user = current_user(db)
    collection = collections_repo.get_collection(db, user["_id"], collection_id)
    if not collection:
        raise NotFoundError("That collection was not found.")

    documents = documents_repo.list_documents(db, user["_id"], collection_id=collection["_id"], limit=200)
    statuses: dict[str, int] = {}
    for document in documents:
        key = document.get("status", "unknown")
        statuses[key] = statuses.get(key, 0) + 1

    return ok(
        {
            "collection": _collection_payload(
                collection,
                document_count=len(documents),
                chunk_count=chunks_repo.count_for_collection(
                    db, user["_id"], collection["_id"]
                ),
                storage_bytes=sum(item.get("file_size") or 0 for item in documents),
            ),
            "documents": [
                {
                    "id": str(item["_id"]),
                    "name": item.get("original_name"),
                    "status": item.get("status"),
                    "page_count": item.get("page_count"),
                    "chunk_count": item.get("chunk_count", 0),
                    "file_size": item.get("file_size"),
                    "created_at": item.get("created_at"),
                }
                for item in documents
            ],
            "statistics": {"by_status": statuses, "total_documents": len(documents)},
        }
    )


@collections_bp.route("/<collection_id>", methods=["PATCH"])
@require_auth
def update_collection(collection_id: str):
    data = json_body()
    fields: dict = {}

    if "name" in data:
        name = require_string(data, "name", min_length=1, max_length=80, label="collection name")
        fields["name"] = name
    if "description" in data:
        fields["description"] = optional_string(data, "description", max_length=300) or ""
    if "color" in data:
        color = optional_string(data, "color", max_length=9)
        if color and not HEX_COLOR.match(color):
            raise ValidationError("Colour must be a hex value such as #0d7d70.")
        fields["color"] = color or collections_repo.DEFAULT_COLLECTION_COLOR

    if not fields:
        raise ValidationError("Nothing to update.")

    db = get_db()
    user = current_user(db)
    updated = collections_repo.update_collection(db, user["_id"], collection_id, fields=fields)
    if not updated:
        raise NotFoundError("That collection was not found.")

    return ok({"collection": _collection_payload(updated)})


@collections_bp.route("/<collection_id>", methods=["DELETE"])
@require_auth
def delete_collection(collection_id: str):
    """Delete a collection. Its documents are kept and become unfiled."""
    db = get_db()
    user = current_user(db)
    collection = collections_repo.delete_collection(db, user["_id"], collection_id)
    if not collection:
        raise NotFoundError("That collection was not found.")

    documents_repo.update_many_collection(db, user["_id"], collection_id, None)
    from bson import ObjectId

    db.chunks.update_many(
        {"user_id": ObjectId(str(user["_id"])), "collection_id": ObjectId(str(collection_id))},
        {"$set": {"collection_id": None}},
    )
    corpus_repo.bump_revision(db, user["_id"])
    index_store.invalidate(user["_id"])
    activity_repo.record(db, user["_id"], "collection.deleted", metadata={"name": collection.get("name")})
    return ok(
        {
            "message": (
                f"'{collection.get('name')}' was deleted. Its documents are still available "
                "and are no longer in a collection."
            )
        }
    )


@collections_bp.route("/<collection_id>/documents", methods=["POST"])
@require_auth
def move_documents(collection_id: str):
    data = json_body()
    document_ids = parse_object_ids(data.get("document_ids"), field="document_ids")
    if not document_ids:
        raise ValidationError("Select at least one document.")

    db = get_db()
    user = current_user(db)
    collection = collections_repo.get_collection(db, user["_id"], collection_id)
    if not collection:
        raise NotFoundError("That collection was not found.")

    # Ownership is checked per document: a single unknown or foreign id fails the
    # whole request rather than being silently skipped.
    owned = {
        str(item["_id"])
        for item in documents_repo.get_documents_by_ids(db, user["_id"], document_ids)
    }
    unexpected = [str(item) for item in document_ids if str(item) not in owned]
    if unexpected:
        raise NotFoundError("One or more of those documents was not found.")

    moved = 0
    for document_id in document_ids:
        if documents_repo.set_document_collection(db, user["_id"], document_id, collection["_id"]):
            moved += 1
            _sync_document_chunks(db, user["_id"], document_id, collection["_id"])

    corpus_repo.bump_revision(db, user["_id"])
    index_store.invalidate(user["_id"])
    return ok({"moved": moved, "collection_id": str(collection["_id"])})


def _sync_document_chunks(db, user_id, document_id, collection_id) -> None:
    from bson import ObjectId

    db.chunks.update_many(
        {"user_id": ObjectId(str(user_id)), "document_id": ObjectId(str(document_id))},
        {"$set": {"collection_id": collection_id}},
    )
