"""Analytics API.

One composite endpoint rather than a dozen small ones: the analytics page needs all
of it at once, and a single round trip keeps the page fast. Every figure is derived
from real stored data, so an empty account shows zeros instead of fabricated numbers.
"""
from __future__ import annotations

from flask import Blueprint

from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import chunks as chunks_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import conversations as conversations_repo
from ..db.repositories import documents as documents_repo
from ..db.repositories import feedback as feedback_repo
from ..db.serialize import docs_out
from ..deps import current_user
from ..errors import ok
from ..security import require_auth
from ..services import usage_service

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/", methods=["GET"])
@require_auth
def overview():
    """Everything the analytics dashboard renders, in a single payload."""
    db = get_db()
    user = current_user(db)
    user_id = user["_id"]

    totals = documents_repo.aggregate_totals(db, user_id)
    chunk_total = chunks_repo.count_for_user(db, user_id)
    latency = conversations_repo.aggregate_avg_latency(db, user_id)
    usage = usage_service.usage_summary(db, user)

    return ok(
        {
            "totals": {
                "documents": int(totals.get("documents", 0)),
                "pages": int(totals.get("pages", 0)),
                "chunks": int(chunk_total),
                "questions": int(conversations_repo.count_messages(db, user_id)),
                "user_questions": _count_user_questions(db, user_id),
                "conversations": conversations_repo.count_conversations(db, user_id),
                "storage_bytes": int(totals.get("storage_bytes", 0)),
                "storage_label": usage_service.format_bytes(int(totals.get("storage_bytes", 0))),
                "processing_failures": int(totals.get("failures", 0)),
            },
            "performance": {
                "avg_retrieval_ms": latency.get("avg_retrieval_ms", 0.0),
                "avg_llm_ms": latency.get("avg_llm_ms", 0.0),
                "answers": latency.get("answers", 0),
            },
            "usage": usage,
            "documents_by_collection": _documents_by_collection(db, user_id),
            "documents_by_status": _documents_by_status(db, user_id),
            "most_queried_documents": conversations_repo.top_documents_queried(db, user_id, limit=6),
            "questions_over_time": conversations_repo.aggregate_messages_by_day(db, user_id, days=30),
            "feedback": feedback_repo.aggregate_summary(db, user_id),
            "activity": docs_out(activity_repo.list_recent(db, user_id, limit=15)),
        }
    )


def _count_user_questions(db, user_id) -> int:
    from bson import ObjectId

    return db.messages.count_documents({"user_id": ObjectId(str(user_id)), "role": "user"})


def _documents_by_collection(db, user_id) -> list[dict]:
    rows = documents_repo.aggregate_by_collection(db, user_id)
    names = {
        str(item["_id"]): item.get("name") or "Collection"
        for item in collections_repo.list_collections(db, user_id)
    }
    payload = []
    for row in rows:
        key = str(row["_id"]) if row.get("_id") else None
        payload.append(
            {
                "collection_id": key,
                "name": names.get(key, "Unfiled") if key else "Unfiled",
                "count": row["count"],
            }
        )
    return sorted(payload, key=lambda item: item["count"], reverse=True)


def _documents_by_status(db, user_id) -> list[dict]:
    return [
        {"status": row["_id"] or "unknown", "count": row["count"]}
        for row in documents_repo.aggregate_by_status(db, user_id)
    ]