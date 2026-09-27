"""Activity feed. Records meaningful user actions for the dashboard."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId


def record(db, user_id, event: str, *, metadata: dict | None = None) -> None:
    db.activity.insert_one(
        {
            "_id": ObjectId(),
            "user_id": ObjectId(str(user_id)),
            "event": event,
            "metadata": metadata or {},
            "created_at": dt.datetime.now(dt.timezone.utc),
        }
    )


def list_recent(db, user_id, *, limit: int = 20) -> list[dict]:
    return list(
        db.activity.find({"user_id": ObjectId(str(user_id))})
        .sort("created_at", -1)
        .limit(max(1, min(limit, 100)))
    )


def count_by_event(db, user_id) -> dict[str, int]:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id))}},
        {"$group": {"_id": "$event", "count": {"$sum": 1}}},
    ]
    return {row["_id"]: row["count"] for row in db.activity.aggregate(pipeline)}
