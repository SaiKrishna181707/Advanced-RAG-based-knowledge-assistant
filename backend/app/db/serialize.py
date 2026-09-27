"""Conversion helpers between MongoDB documents and JSON-safe API payloads."""
from __future__ import annotations

import datetime as dt
from typing import Any

from bson import ObjectId


def to_iso(value: Any) -> Any:
    if isinstance(value, dt.datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=dt.timezone.utc)
        return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")
    return value


def jsonable(value: Any) -> Any:
    """Recursively convert BSON types into JSON-serialisable Python values."""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dt.datetime):
        return to_iso(value)
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [jsonable(item) for item in value]
    return value


def doc_out(document: dict | None) -> dict | None:
    """Map a stored document to its API shape: ``_id`` becomes ``id``."""
    if document is None:
        return None
    payload = dict(document)
    if "_id" in payload:
        payload["id"] = str(payload.pop("_id"))
    return jsonable(payload)


def docs_out(documents) -> list[dict]:
    return [doc_out(document) for document in documents]
