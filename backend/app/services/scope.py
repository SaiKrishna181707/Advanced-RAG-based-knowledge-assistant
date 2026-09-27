"""
Retrieval-scope parsing and resolution.

A scope says which part of a user's knowledge base a question may draw on:
everything, one collection, or an explicit set of documents. Referenced ids are
always re-verified against the owner's own records, so a scope can never be used
to reach another user's data.
"""
from __future__ import annotations

from ..db.repositories import collections as collections_repo
from ..errors import NotFoundError, ValidationError
from ..validators import parse_object_ids

SCOPE_MODES = ("all", "collection", "documents")
DEFAULT_SCOPE = {"mode": "all", "collection_id": None, "document_ids": []}


def parse_scope(db, user, raw) -> dict:
    if not isinstance(raw, dict):
        return dict(DEFAULT_SCOPE)

    mode = raw.get("mode") or "all"
    if mode not in SCOPE_MODES:
        raise ValidationError("Scope mode must be 'all', 'collection' or 'documents'.")

    if mode == "collection":
        collection_id = raw.get("collection_id")
        if not collection_id:
            raise ValidationError("Choose a collection or switch the scope back to all documents.")
        collection = collections_repo.get_collection(db, user["_id"], collection_id)
        if not collection:
            raise NotFoundError("That collection does not exist.")
        return {"mode": "collection", "collection_id": collection["_id"], "document_ids": []}

    if mode == "documents":
        document_ids = parse_object_ids(raw.get("document_ids"), field="document_ids", limit=50)
        if not document_ids:
            raise ValidationError("Select at least one document or switch the scope back to all.")
        return {"mode": "documents", "collection_id": None, "document_ids": document_ids}

    return dict(DEFAULT_SCOPE)


def scope_filter(scope: dict) -> tuple[object | None, list[str] | None]:
    """Return (collection_id, document_ids) suitable for the retriever."""
    if scope.get("mode") == "collection":
        return scope.get("collection_id"), None
    if scope.get("mode") == "documents":
        return None, [str(item) for item in scope.get("document_ids") or []]
    return None, None


def scope_label(db, user, scope: dict) -> str:
    if scope.get("mode") == "collection":
        collection = collections_repo.get_collection(db, user["_id"], scope.get("collection_id"))
        return f"collection '{collection.get('name')}'" if collection else "a collection"
    if scope.get("mode") == "documents":
        count = len(scope.get("document_ids") or [])
        return f"{count} selected document{'s' if count != 1 else ''}"
    return "all documents"