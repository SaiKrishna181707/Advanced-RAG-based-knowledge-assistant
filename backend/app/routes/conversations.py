"""Conversation history API.

Owns everything about conversations that is not answer generation: listing,
renaming, deleting, clearing, and per-answer feedback. Chat itself lives in routes/chat.py.
"""
from __future__ import annotations

import logging

from flask import Blueprint, request

from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import conversations as conversations_repo
from ..db.repositories import feedback as feedback_repo
from ..deps import current_user
from ..errors import NotFoundError, ValidationError, ok
from ..security import require_auth
from ..serializers import conversation_detail_payload, conversation_payload
from ..services import scope as scope_service
from ..validators import clamp_int, json_body, optional_string, parse_object_id, require_string

logger = logging.getLogger(__name__)

conversations_bp = Blueprint("conversations", __name__)

RATINGS = ("up", "down")


@conversations_bp.route("/", methods=["GET"])
@require_auth
def list_conversations():
    """List, newest first, optionally filtered by a title search."""
    db = get_db()
    user = current_user(db)
    search = request.args.get("q") or None
    limit = clamp_int(request.args.get("limit"), default=50, minimum=1, maximum=200)
    skip = clamp_int(request.args.get("skip"), default=0, minimum=0, maximum=100000)

    conversations = conversations_repo.list_conversations(
        db, user["_id"], search=search, limit=limit, skip=skip
    )
    return ok(
        {
            "conversations": [conversation_payload(item) for item in conversations],
            "total": conversations_repo.count_conversations(db, user["_id"]),
            "search": search,
        }
    )


@conversations_bp.route("/", methods=["POST"])
@require_auth
def create_conversation():
    data = json_body()
    title = optional_string(data, "title", max_length=120) or "New conversation"
    db = get_db()
    user = current_user(db)
    scope = scope_service.parse_scope(db, user, data.get("scope"))

    conversation = conversations_repo.create_conversation(
        db, user["_id"], title=title, scope=scope
    )
    return ok({"conversation": conversation_payload(conversation)}, status=201)


@conversations_bp.route("/<conversation_id>", methods=["GET"])
@require_auth
def get_conversation(conversation_id: str):
    db = get_db()
    user = current_user(db)
    conversation = conversations_repo.get_conversation(db, user["_id"], conversation_id)
    if not conversation:
        raise NotFoundError("That conversation was not found.")
    messages = conversations_repo.list_messages(db, user["_id"], conversation["_id"])
    return ok({"conversation": conversation_detail_payload(conversation, messages)})


@conversations_bp.route("/<conversation_id>", methods=["PATCH"])
@require_auth
def update_conversation(conversation_id: str):
    """Rename a conversation and/or change its default retrieval scope."""
    data = json_body()
    db = get_db()
    user = current_user(db)
    conversation = conversations_repo.get_conversation(db, user["_id"], conversation_id)
    if not conversation:
        raise NotFoundError("That conversation was not found.")

    fields: dict = {}
    if "title" in data:
        fields["title"] = require_string(data, "title", min_length=1, max_length=120, label="title")
    if "scope" in data:
        fields["scope"] = scope_service.parse_scope(db, user, data.get("scope"))
    if not fields:
        raise ValidationError("Provide a title or a scope to update.")

    updated = conversations_repo.update_conversation(db, user["_id"], conversation["_id"], fields=fields)
    return ok({"conversation": conversation_payload(updated)})


@conversations_bp.route("/<conversation_id>", methods=["DELETE"])
@require_auth
def delete_conversation(conversation_id: str):
    db = get_db()
    user = current_user(db)
    conversation = conversations_repo.delete_conversation(db, user["_id"], conversation_id)
    if not conversation:
        raise NotFoundError("That conversation was not found.")
    activity_repo.record(
        db,
        user["_id"],
        "conversation.deleted",
        metadata={"title": conversation.get("title")},
    )
    return ok({"deleted": True, "id": str(conversation["_id"])})


@conversations_bp.route("/<conversation_id>/clear", methods=["POST"])
@require_auth
def clear_conversation(conversation_id: str):
    """Remove every message but keep the conversation itself."""
    db = get_db()
    user = current_user(db)
    conversation = conversations_repo.get_conversation(db, user["_id"], conversation_id)
    if not conversation:
        raise NotFoundError("That conversation was not found.")

    db.messages.delete_many(
        {"conversation_id": conversation["_id"], "user_id": user["_id"]}
    )
    updated = conversations_repo.update_conversation(
        db,
        user["_id"],
        conversation["_id"],
        fields={"title": conversation.get("title") or "New conversation"},
    )
    db.conversations.update_one(
        {"_id": conversation["_id"], "user_id": user["_id"]},
        {"$set": {"message_count": 0, "last_message_preview": ""}},
    )
    refreshed = conversations_repo.get_conversation(db, user["_id"], conversation["_id"])
    return ok(
        {
            "cleared": True,
            "conversation": conversation_payload(refreshed or updated),
        }
    )


@conversations_bp.route("/<conversation_id>/feedback", methods=["POST"])
@require_auth
def submit_feedback(conversation_id: str):
    """Record a thumbs up/down (with optional comment) for one assistant answer."""
    data = json_body()
    rating = require_string(data, "rating", min_length=2, max_length=4, label="rating").lower()
    if rating not in RATINGS:
        raise ValidationError("Rating must be 'up' or 'down'.")
    comment = optional_string(data, "comment", max_length=1000)
    message_id = parse_object_id(data.get("message_id"), field="message_id")

    db = get_db()
    user = current_user(db)
    conversation = conversations_repo.get_conversation(db, user["_id"], conversation_id)
    if not conversation:
        raise NotFoundError("That conversation was not found.")

    message = conversations_repo.get_message(db, user["_id"], message_id)
    if not message or message.get("conversation_id") != conversation["_id"]:
        raise NotFoundError("That message was not found in this conversation.")
    if message.get("role") != "assistant":
        raise ValidationError("Only answers can be rated.")

    record = feedback_repo.upsert_feedback(
        db,
        user_id=user["_id"],
        message_id=message["_id"],
        conversation_id=conversation["_id"],
        rating=rating,
        comment=comment,
    )
    activity_repo.record(db, user["_id"], "answer.rated", metadata={"rating": rating})
    return ok({"rating": record.get("rating"), "comment": record.get("comment")})
