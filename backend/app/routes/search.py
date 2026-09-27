"""Knowledge search API.

Exposes the same hybrid retriever the chat uses, plus filters. Search results are
enriched with document and collection metadata so the UI can show Document / Page /
Snippet / Relevance / Collection without extra round trips.
"""
from __future__ import annotations

import datetime as dt
import logging

from bson import ObjectId
from flask import Blueprint, request

from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import chunks as chunks_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import documents as documents_repo
from ..deps import current_user
from ..errors import ValidationError, ok
from ..rag import retriever
from ..ratelimit import limit
from ..security import require_auth
from ..validators import clamp_int, optional_string, parse_object_ids, parse_object_id

logger = logging.getLogger(__name__)

search_bp = Blueprint("search", __name__)

MAX_RESULTS = 25


def _parse_date(value, *, field: str) -> dt.datetime | None:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise ValidationError(f"'{field}' must be an ISO date string.")
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = dt.datetime.fromisoformat(text)
    except ValueError as exc:
        raise ValidationError(f"'{field}' must be an ISO date such as 2026-01-31.") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def _resolve_scope(db, user_id, *, collection_id, document_ids, date_from, date_to):
    """Turn the filter set into an explicit list of allowed document ids (or None = all)."""
    needs_document_set = bool(collection_id or document_ids or date_from or date_to)
    if not needs_document_set:
        return None

    query: dict = {"user_id": ObjectId(str(user_id))}
    if collection_id:
        query["collection_id"] = ObjectId(str(collection_id))
    if document_ids:
        query["_id"] = {"$in": [ObjectId(str(item)) for item in document_ids]}
    if date_from or date_to:
        window: dict = {}
        if date_from:
            window["$gte"] = date_from
        if date_to:
            window["$lte"] = date_to
        query["created_at"] = window

    found = db.documents.find(query, {"_id": 1})
    return [str(item["_id"]) for item in found]


def _document_metadata(db, user_id, document_ids: list[str]) -> dict[str, dict]:
    if not document_ids:
        return {}
    oids = [ObjectId(item) for item in document_ids]
    rows = db.documents.find(
        {"_id": {"$in": oids}, "user_id": ObjectId(str(user_id))},
        {"original_name": 1, "collection_id": 1, "page_count": 1, "created_at": 1, "status": 1},
    )
    return {str(row["_id"]): row for row in rows}


def _collection_names(db, user_id) -> dict[str, str]:
    return {
        str(item["_id"]): item.get("name") or "Collection"
        for item in collections_repo.list_collections(db, user_id)
    }


@search_bp.route("/", methods=["POST"])
@limit("search", 120)
@require_auth
def search():
    """Run a semantic, keyword or hybrid search across the user's knowledge base."""
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ValidationError("A JSON object body is required.")

    query = optional_string(payload, "query", max_length=500) or ""
    if len(query.strip()) < 2:
        raise ValidationError("Enter at least two characters to search.")

    mode = (payload.get("mode") or "hybrid").lower()
    if mode not in retriever.MODES:
        raise ValidationError("Search mode must be semantic, keyword or hybrid.")

    collection_id = payload.get("collection_id") or None
    if collection_id:
        collection_id = parse_object_id(collection_id, field="collection_id")
    document_ids = [str(item) for item in parse_object_ids(payload.get("document_ids"), field="document_ids", limit=100)]
    date_from = _parse_date(payload.get("date_from"), field="date_from")
    date_to = _parse_date(payload.get("date_to"), field="date_to")
    if date_from and date_to and date_from > date_to:
        raise ValidationError("The start date must be before the end date.")
    page_filter = payload.get("page_number")
    page_number = clamp_int(page_filter, default=0, minimum=0, maximum=100000) if page_filter else None
    top_k = clamp_int(payload.get("top_k"), default=10, minimum=1, maximum=MAX_RESULTS)

    db = get_db()
    user = current_user(db)

    scope_ids = _resolve_scope(
        db,
        user["_id"],
        collection_id=collection_id,
        document_ids=document_ids,
        date_from=date_from,
        date_to=date_to,
    )
    if scope_ids is not None and not scope_ids:
        return ok({"results": [], "count": 0, "mode": mode, "query": query})

    started_ms = _now()
    raw = retriever.search(
        db,
        user["_id"],
        query,
        top_k=top_k,
        document_ids=scope_ids,
        mode=mode,
    )
    elapsed_ms = round((_now() - started_ms) * 1000)

    metadata = _document_metadata(db, user["_id"], [item["document_id"] for item in raw if item.get("document_id")])
    names = _collection_names(db, user["_id"])

    results = []
    for item in raw:
        if page_number and item.get("page_number") != page_number:
            continue
        document = metadata.get(item.get("document_id") or "", {})
        collection_key = str(document.get("collection_id")) if document.get("collection_id") else None
        results.append(
            {
                "chunk_id": item["chunk_id"],
                "document_id": item["document_id"],
                "document_name": item.get("document_name") or document.get("original_name") or "Document",
                "page_number": item.get("page_number"),
                "collection_id": collection_key,
                "collection_name": names.get(collection_key) if collection_key else None,
                "snippet": item.get("snippet"),
                "content": item.get("content"),
                "score": item.get("score"),
                "relevance": item.get("relevance"),
                "similarity": item.get("similarity"),
                "keyword_score": item.get("keyword_score"),
                "rank": item.get("rank"),
                "document_created_at": document.get("created_at"),
            }
        )

    if query.strip():
        activity_repo.record(
            db,
            user["_id"],
            "search.performed",
            metadata={"query": query[:120], "mode": mode, "results": len(results)},
        )

    return ok(
        {
            "results": results,
            "count": len(results),
            "mode": mode,
            "query": query,
            "latency_ms": elapsed_ms,
            "filters_applied": {
                "collection_id": str(collection_id) if collection_id else None,
                "document_ids": document_ids,
                "date_from": date_from,
                "date_to": date_to,
                "page_number": page_number,
            },
        }
    )


@search_bp.route("/chunk/<chunk_id>", methods=["GET"])
@require_auth
def get_chunk(chunk_id: str):
    """Full text of a single retrieved chunk, for the source inspector."""
    db = get_db()
    user = current_user(db)
    chunk = chunks_repo.get_chunk(db, user["_id"], chunk_id)
    if not chunk:
        from ..errors import NotFoundError

        raise NotFoundError("That source passage was not found.")
    document = documents_repo.get_document(db, user["_id"], chunk.get("document_id"))
    return ok(
        {
            "chunk": {
                "id": str(chunk["_id"]),
                "document_id": str(chunk["document_id"]) if chunk.get("document_id") else None,
                "document_name": chunk.get("document_name") or (document or {}).get("original_name"),
                "page_number": chunk.get("page_number"),
                "content": chunk.get("content"),
                "chunk_index": chunk.get("chunk_index"),
            },
            "document": {
                "id": str(document["_id"]) if document else None,
                "name": (document or {}).get("original_name"),
                "page_count": (document or {}).get("page_count"),
                "status": (document or {}).get("status"),
            }
            if document
            else None,
        }
    )


@search_bp.route("/options", methods=["GET"])
@require_auth
def options():
    """Filter options for the search UI: collections and documents."""
    db = get_db()
    user = current_user(db)
    collections = collections_repo.list_collections(db, user["_id"])
    documents = documents_repo.list_documents(db, user["_id"], limit=200)
    return ok(
        {
            "collections": [
                {"id": str(item["_id"]), "name": item.get("name")} for item in collections
            ],
            "documents": [
                {
                    "id": str(item["_id"]),
                    "name": item.get("original_name"),
                    "collection_id": str(item["collection_id"]) if item.get("collection_id") else None,
                    "page_count": item.get("page_count"),
                    "status": item.get("status"),
                    "created_at": item.get("created_at"),
                }
                for item in documents
            ],
            "modes": list(retriever.MODES),
        }
    )


def _now() -> float:
    import time

    return time.perf_counter()