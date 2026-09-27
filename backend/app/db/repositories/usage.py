"""Per-period usage metering, used to enforce subscription-plan limits."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId


def current_period() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m")


def get_usage(db, user_id, *, period: str | None = None) -> dict:
    period = period or current_period()
    document = db.usage.find_one(
        {"user_id": ObjectId(str(user_id)), "period": period}
    )
    if document:
        return document
    return {
        "user_id": ObjectId(str(user_id)),
        "period": period,
        "documents_uploaded": 0,
        "storage_bytes": 0,
        "questions_asked": 0,
        "processing_operations": 0,
    }


def increment(db, user_id, *, field: str, amount: int = 1) -> None:
    allowed = {
        "documents_uploaded",
        "storage_bytes",
        "questions_asked",
        "processing_operations",
    }
    if field not in allowed:
        raise ValueError(f"Unsupported usage field: {field}")
    now = dt.datetime.now(dt.timezone.utc)
    db.usage.update_one(
        {"user_id": ObjectId(str(user_id)), "period": current_period()},
        {
            "$inc": {field: amount},
            "$set": {"updated_at": now},
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )


def decrement(db, user_id, *, field: str, amount: int = 1) -> None:
    allowed = {"documents_uploaded", "storage_bytes"}
    if field not in allowed:
        raise ValueError(f"Unsupported usage field: {field}")
    db.usage.update_one(
        {"user_id": ObjectId(str(user_id)), "period": current_period()},
        {"$inc": {field: -abs(amount)}, "$set": {"updated_at": dt.datetime.now(dt.timezone.utc)}},
    )
