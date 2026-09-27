"""Answer feedback storage."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId


def upsert_feedback(
    db,
    *,
    user_id,
    message_id,
    conversation_id,
    rating: str,
    comment: str | None = None,
) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    db.feedback.update_one(
        {"message_id": ObjectId(str(message_id))},
        {
            "$set": {
                "user_id": ObjectId(str(user_id)),
                "conversation_id": ObjectId(str(conversation_id)),
                "rating": rating,
                "comment": comment,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    db.messages.update_one(
        {"_id": ObjectId(str(message_id)), "user_id": ObjectId(str(user_id))},
        {"$set": {"feedback": rating}},
    )
    return db.feedback.find_one({"message_id": ObjectId(str(message_id))})


def get_for_message(db, user_id, message_id) -> dict | None:
    try:
        oid = ObjectId(str(message_id))
    except Exception:
        return None
    return db.feedback.find_one({"_id": oid, "user_id": ObjectId(str(user_id))}) or db.feedback.find_one(
        {"message_id": oid, "user_id": ObjectId(str(user_id))}
    )


def list_recent(db, user_id, *, limit: int = 50) -> list[dict]:
    return list(
        db.feedback.find({"user_id": ObjectId(str(user_id))})
        .sort("created_at", -1)
        .limit(limit)
    )


def aggregate_summary(db, user_id) -> dict:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id))}},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
    ]
    summary = {"up": 0, "down": 0}
    for row in db.feedback.aggregate(pipeline):
        if row["_id"] in summary:
            summary[row["_id"]] = row["count"]
    total = summary["up"] + summary["down"]
    summary["total"] = total
    summary["satisfaction"] = round(summary["up"] / total, 3) if total else None
    return summary
