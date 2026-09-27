"""Small, explicit request-validation helpers."""
from __future__ import annotations

import re
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from flask import request

from .errors import ValidationError

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9._ -]")


def json_body() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("A JSON object body is required.")
    return data


def require_string(
    data: dict,
    field: str,
    *,
    min_length: int = 1,
    max_length: int = 255,
    label: str | None = None,
) -> str:
    label = label or field.replace("_", " ")
    value = data.get(field)
    if value is None or not isinstance(value, str):
        raise ValidationError(f"'{label}' is required.")
    cleaned = value.strip()
    if len(cleaned) < min_length:
        raise ValidationError(f"'{label}' must be at least {min_length} characters.")
    if len(cleaned) > max_length:
        raise ValidationError(f"'{label}' must be at most {max_length} characters.")
    return cleaned


def optional_string(
    data: dict,
    field: str,
    *,
    max_length: int = 255,
    label: str | None = None,
) -> str | None:
    value = data.get(field)
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValidationError(f"'{label or field}' must be text.")
    cleaned = value.strip()
    if len(cleaned) > max_length:
        raise ValidationError(
            f"'{label or field}' must be at most {max_length} characters."
        )
    return cleaned or None


def clamp_int(value: Any, *, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return max(minimum, min(parsed, maximum))


def parse_object_id(value: Any, *, field: str = "id") -> ObjectId:
    """Convert a client-supplied id into an ObjectId, or fail cleanly."""
    if isinstance(value, ObjectId):
        return value
    if not isinstance(value, str) or not ObjectId.is_valid(value):
        raise ValidationError(f"'{field}' is not a valid identifier.")
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise ValidationError(f"'{field}' is not a valid identifier.") from exc


def parse_object_ids(values: Any, *, field: str = "ids", limit: int = 50) -> list[ObjectId]:
    if values is None:
        return []
    if not isinstance(values, list):
        raise ValidationError(f"'{field}' must be a list of identifiers.")
    if len(values) > limit:
        raise ValidationError(f"'Please select at most {limit} items.'")
    return [parse_object_id(item, field=field) for item in values]


def clean_display_name(value: str, *, fallback: str = "Untitled") -> str:
    """Strip control characters from user-supplied display text."""
    cleaned = _CONTROL_CHARS.sub("", value).strip()
    return cleaned or fallback


def sanitize_filename(value: str, *, fallback: str = "document") -> str:
    """Return a filesystem-safe name. Never used to build the stored path alone."""
    name = _CONTROL_CHARS.sub("", value).strip().replace("\\", "/").split("/")[-1]
    name = _SAFE_FILENAME.sub("_", name).strip(" ._")
    return name or fallback


def file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower().strip()
