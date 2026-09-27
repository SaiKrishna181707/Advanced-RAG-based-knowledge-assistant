"""Conversation and message persistence."""
from __future__ import annotations

import datetime as dt
import re

from bson import ObjectId


def create_conversation(db, user_id, *, title: str = "New conversation", scope: dict | None = None) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    document = {
        "_id": ObjectId(),
        "user_id": ObjectId(str(user_id)),
        "title": title,
        "scope": scope or {"mode": "all", "collection_id": None, "document_ids": []},
        "message_count": 0,
        "last_message_preview": "",
        "created_at": now,
        "updated_at": now,
    }
    db.conversations.insert_one(document)
    return document


def get_conversation(db, user_id, conversation_id) -> dict | None:
    try:
        oid = ObjectId(str(conversation_id))
    except Exception:
        return None
    return db.conversations.find_one({"_id": oid, "user_id": ObjectId(str(user_id))})


def list_conversations(
    db,
    user_id,
    *,
    search: str | None = None,
    limit: int = 50,
    skip: int = 0,
) -> list[dict]:
    query: dict = {"user_id": ObjectId(str(user_id))}
    if search:
        query["title"] = {"$regex": re.escape(search[:80]), "$options": "i"}
    cursor = (
        db.conversations.find(query)
        .sort("updated_at", -1)
        .skip(max(0, skip))
        .limit(max(1, min(limit, 200)))
    )
    return list(cursor)


def count_conversations(db, user_id) -> int:
    return db.conversations.count_documents({"user_id": ObjectId(str(user_id))})


def update_conversation(db, user_id, conversation_id, *, fields: dict) -> dict | None:
    allowed = {"title", "scope"}
    update = {key: value for key, value in fields.items() if key in allowed and value is not None}
    if not update:
        return get_conversation(db, user_id, conversation_id)
    update["updated_at"] = dt.datetime.now(dt.timezone.utc)
    return db.conversations.find_one_and_update(
        {"_id": ObjectId(str(conversation_id)), "user_id": ObjectId(str(user_id))},
        {"$set": update},
        return_document=True,
    )


def touch_conversation(db, user_id, conversation_id, *, preview: str) -> None:
    db.conversations.update_one(
        {"_id": ObjectId(str(conversation_id)), "user_id": ObjectId(str(user_id))},
        {
            "$set": {
                "updated_at": dt.datetime.now(dt.timezone.utc),
                "last_message_preview": preview[:160],
            },
            "$inc": {"message_count": 1},
        },
    )


def delete_conversation(db, user_id, conversation_id) -> dict | None:
    try:
        oid = ObjectId(str(conversation_id))
    except Exception:
        return None
    conversation = db.conversations.find_one_and_delete(
        {"_id": oid, "user_id": ObjectId(str(user_id))}
    )
    if conversation:
        db.messages.delete_many({"conversation_id": oid, "user_id": ObjectId(str(user_id))})
    return conversation


def add_message(db, message: dict) -> dict:
    message.setdefault("_id", ObjectId())
    message.setdefault("created_at", dt.datetime.now(dt.timezone.utc))
    db.messages.insert_one(message)
    return message


def list_messages(db, user_id, conversation_id, *, limit: int = 200) -> list[dict]:
    try:
        oid = ObjectId(str(conversation_id))
    except Exception:
        return []
    cursor = (
        db.messages.find({"conversation_id": oid, "user_id": ObjectId(str(user_id))})
        .sort("created_at", 1)
        .limit(max(1, min(limit, 500)))
    )
    return list(cursor)


def recent_messages(db, user_id, conversation_id, *, limit: int = 8) -> list[dict]:
    """Most recent messages in chronological order, for LLM context."""
    try:
        oid = ObjectId(str(conversation_id))
    except Exception:
        return []
    cursor = (
        db.messages.find({"conversation_id": oid, "user_id": ObjectId(str(user_id))})
        .sort("created_at", -1)
        .limit(limit)
    )
    return list(reversed(list(cursor)))


def get_message(db, user_id, message_id) -> dict | None:
    try:
        oid = ObjectId(str(message_id))
    except Exception:
        return None
    return db.messages.find_one({"_id": oid, "user_id": ObjectId(str(user_id))})


def delete_trailing_assistant_message(db, user_id, conversation_id) -> None:
    last = db.messages.find_one(
        {"conversation_id": ObjectId(str(conversation_id)), "user_id": ObjectId(str(user_id))},
        sort=[("created_at", -1)],
    )
    if last and last.get("role") == "assistant":
        db.messages.delete_one({"_id": last["_id"]})


def count_messages(db, user_id) -> int:
    return db.messages.count_documents({"user_id": ObjectId(str(user_id))})


def aggregate_messages_by_day(db, user_id, *, days: int = 30) -> list[dict]:
    since = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)
    pipeline = [
        {
            "$match": {
                "user_id": ObjectId(str(user_id)),
                "role": "user",
                "created_at": {"$gte": since},
            }
        },
        {
            "$group": {
                "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                "count": {"$sum": 1},
            }
        },
        {"$sort": {"_id": 1}},
    ]
    return [{"date": row["_id"], "count": row["count"]} for row in db.messages.aggregate(pipeline)]


def aggregate_avg_latency(db, user_id) -> dict:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id)), "role": "assistant"}},
        {
            "$group": {
                "_id": None,
                "avg_retrieval_ms": {"$avg": "$retrieval_ms"},
                "avg_llm_ms": {"$avg": "$llm_ms"},
                "answers": {"$sum": 1},
            }
        },
    ]
    rows = list(db.messages.aggregate(pipeline))
    if not rows:
        return {"avg_retrieval_ms": 0.0, "avg_llm_ms": 0.0, "answers": 0}
    row = rows[0]
    return {
        "avg_retrieval_ms": round(row.get("avg_retrieval_ms") or 0.0, 1),
        "avg_llm_ms": round(row.get("avg_llm_ms") or 0.0, 1),
        "answers": row.get("answers", 0),
    }


def top_documents_queried(db, user_id, *, limit: int = 5) -> list[dict]:
    pipeline = [
        {"$match": {"user_id": ObjectId(str(user_id)), "role": "assistant"}},
        {"$unwind": "$sources"},
        {"$group": {"_id": "$sources.document_id", "name": {"$first": "$sources.document_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    return [
        {"document_id": str(row["_id"]), "name": row.get("name") or "Unknown", "count": row["count"]}
        for row in db.messages.aggregate(pipeline)
        if row.get("_id")
    ]
