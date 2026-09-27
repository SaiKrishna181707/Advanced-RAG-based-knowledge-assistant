"""Conversation and chat API."""
from __future__ import annotations

import json
import logging
from collections.abc import Iterator

from flask import Blueprint, Response, stream_with_context

from ..config import settings
from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import conversations as conversations_repo
from ..db.repositories import documents as documents_repo
from ..db.repositories import feedback as feedback_repo
from ..deps import current_user
from ..errors import NotFoundError, ValidationError, ok
from ..rag import retriever
from ..ratelimit import limit
from ..security import require_auth
from ..services import llm_service, usage_service
from ..serializers import conversation_payload, message_payload
from ..services import scope as scope_service
from ..validators import (
    clamp_int,
    json_body,
    optional_string,
    parse_object_id,
    parse_object_ids,
    require_string,
)

logger = logging.getLogger(__name__)

chat_bp = Blueprint("chat", __name__)

SCOPE_MODES = ("all", "collection", "documents")
DEFAULT_SCOPE = scope_service.DEFAULT_SCOPE

# Aliases kept so the call sites below read unchanged; the implementations live in
# app.serializers and app.services.scope so conversations and search share them.
_conversation_payload = conversation_payload
_message_payload = message_payload
_parse_scope = scope_service.parse_scope
_scope_filter = scope_service.scope_filter
_scope_label = scope_service.scope_label


def _style_for(user: dict) -> str:
    style = ((user.get("preferences") or {}).get("response_style")) or "concise"
    return style if style in llm_service.STYLE_INSTRUCTIONS else "concise"


def _prepare_turn(db, user, payload: dict) -> dict:
    """Shared setup for streaming and blocking answers."""
    regenerate = bool(payload.get("regenerate"))
    conversation_id = payload.get("conversation_id")

    conversation = None
    if conversation_id:
        conversation = conversations_repo.get_conversation(db, user["_id"], conversation_id)
        if not conversation:
            raise NotFoundError("That conversation was not found.")

    if regenerate:
        if not conversation:
            raise ValidationError("Regenerating needs an existing conversation.")
        previous = conversations_repo.recent_messages(db, user["_id"], conversation["_id"], limit=4)
        question = next(
            (item.get("content") for item in reversed(previous) if item.get("role") == "user"),
            None,
        )
        if not question:
            raise ValidationError("There is no previous question to regenerate.")
        conversations_repo.delete_trailing_assistant_message(db, user["_id"], conversation["_id"])
    else:
        question = require_string(payload, "question", min_length=1, max_length=2000, label="question")

    if payload.get("scope") is not None:
        scope = _parse_scope(db, user, payload.get("scope"))
    else:
        scope = conversation.get("scope") if conversation else dict(DEFAULT_SCOPE)
        scope = scope or dict(DEFAULT_SCOPE)

    if not conversation:
        title = question[:60] + ("..." if len(question) > 60 else "")
        conversation = conversations_repo.create_conversation(
            db, user["_id"], title=title, scope=scope
        )
    elif payload.get("scope") is not None:
        conversations_repo.update_conversation(db, user["_id"], conversation["_id"], fields={"scope": scope})

    usage_service.assert_can_ask(db, user)
    plan = usage_service.plan_for(user)

    collection_id, document_ids = _scope_filter(scope)
    started = _now()
    chunks = retriever.search(
        db,
        user["_id"],
        question,
        top_k=min(
            clamp_int(
                payload.get("top_k"),
                default=plan.retrieval_top_k,
                minimum=1,
                maximum=settings.max_top_k,
            ),
            plan.retrieval_top_k,
        ),
        collection_id=collection_id,
        document_ids=document_ids,
    )
    retrieval_ms = round((_now() - started) * 1000)

    # A question can arrive while part of the scope is still being indexed. The
    # answer is still correct for what is indexed, but the user deserves to know
    # the scope was incomplete rather than assuming the material is simply absent.
    pending = documents_repo.count_pending(
        db, user["_id"], collection_id=collection_id, document_ids=document_ids
    )
    notice = None
    if pending:
        plural = pending != 1
        notice = (
            f"{pending} document{'s' if plural else ''} in this scope "
            f"{'are' if plural else 'is'} still being processed, so "
            f"{'they' if plural else 'it'} may not be reflected in this answer yet."
        )

    history = conversations_repo.recent_messages(db, user["_id"], conversation["_id"], limit=40)
    history_turns = min(plan.history_turns, settings.history_turns)

    if not regenerate:
        conversations_repo.add_message(
            db,
            {
                "user_id": user["_id"],
                "conversation_id": conversation["_id"],
                "role": "user",
                "content": question,
                "sources": None,
            },
        )
        conversations_repo.touch_conversation(
            db, user["_id"], conversation["_id"], preview=question
        )

    usage_service.record_question(db, user["_id"])
    activity_repo.record(
        db,
        user["_id"],
        "question.asked",
        metadata={"conversation_id": str(conversation["_id"]), "question": question[:120]},
    )

    return {
        "conversation": conversation,
        "question": question,
        "chunks": chunks,
        "retrieval_ms": retrieval_ms,
        "scope": scope,
        "scope_label": _scope_label(db, user, scope),
        "notice": notice,
        "style": _style_for(user),
        "history": history,
        "history_turns": history_turns,
        "regenerate": regenerate,
    }


def _persist_assistant(db, user, turn: dict, answer: str, llm_ms: int) -> dict:
    sources = llm_service.build_sources(turn["chunks"])
    message = conversations_repo.add_message(
        db,
        {
            "user_id": user["_id"],
            "conversation_id": turn["conversation"]["_id"],
            "role": "assistant",
            "content": answer,
            "sources": sources,
            "retrieval_ms": turn["retrieval_ms"],
            "llm_ms": llm_ms,
            "model": settings.groq_model,
        },
    )
    conversations_repo.touch_conversation(
        db, user["_id"], turn["conversation"]["_id"], preview=turn["question"]
    )
    return message


@chat_bp.route("/ask", methods=["POST"])
@limit("chat", settings.rate_limit_chat)
@require_auth
def ask():
    """Blocking answer generation. Streaming is the primary path; this one is simple."""
    payload = json_body()
    db = get_db()
    user = current_user(db)
    turn = _prepare_turn(db, user, payload)

    started = _now()
    result = llm_service.generate_answer(
        turn["question"],
        turn["chunks"],
        history=turn["history"],
        style=turn["style"],
        max_turns=turn["history_turns"],
        scope_label=turn["scope_label"],
    )
    llm_ms = result["llm_ms"] if result["llm_ms"] else round((_now() - started) * 1000)
    message = _persist_assistant(db, user, turn, result["answer"], llm_ms)

    return ok(
        {
            "answer": result["answer"],
            "sources": result["sources"],
            "conversation_id": str(turn["conversation"]["_id"]),
            "message_id": str(message["_id"]),
            "retrieval_ms": turn["retrieval_ms"],
            "llm_ms": llm_ms,
            "model": result["model"],
            "usage": result.get("usage"),
            "notice": turn["notice"],
        }
    )


@chat_bp.route("/stream", methods=["POST"])
@limit("chat", settings.rate_limit_chat)
@require_auth
def stream():
    """Server-pushed answer generation as newline-delimited JSON events."""
    payload = json_body()
    db = get_db()
    user = current_user(db)
    turn = _prepare_turn(db, user, payload)

    def generate() -> Iterator[str]:
        yield _event(
            {
                "type": "meta",
                "conversation_id": str(turn["conversation"]["_id"]),
                "title": turn["conversation"].get("title"),
                "scope_label": turn["scope_label"],
                "retrieval_ms": turn["retrieval_ms"],
                "model": llm_service.model_status()["resolved_model"],
                "notice": turn["notice"],
            }
        )
        yield _event({"type": "sources", "sources": llm_service.build_sources(turn["chunks"])})

        collected: list[str] = []
        started = _now()
        try:
            for delta in llm_service.stream_answer(
                turn["question"],
                turn["chunks"],
                history=turn["history"],
                style=turn["style"],
                max_turns=turn["history_turns"],
                scope_label=turn["scope_label"],
            ):
                collected.append(delta)
                yield _event({"type": "delta", "text": delta})
        except Exception as exc:
            message = getattr(exc, "message", None) or "The answer service is unavailable."
            logger.warning("Streaming failed", extra={"event": "stream_failed"})
            answer = "".join(collected).strip()
            if answer:
                _persist_assistant(db, user, turn, answer, round((_now() - started) * 1000))
            yield _event({"type": "error", "message": message, "partial": bool(answer)})
            return

        llm_ms = round((_now() - started) * 1000)
        answer = "".join(collected).strip()
        message = _persist_assistant(db, user, turn, answer, llm_ms)
        yield _event(
            {
                "type": "done",
                "message_id": str(message["_id"]),
                "conversation_id": str(turn["conversation"]["_id"]),
                "retrieval_ms": turn["retrieval_ms"],
                "llm_ms": llm_ms,
                "model": llm_service.model_status()["resolved_model"],
                "source_count": len(turn["chunks"]),
            }
        )

    response = Response(stream_with_context(generate()), mimetype="application/x-ndjson")
    response.headers["Cache-Control"] = "no-cache, no-transform"
    response.headers["X-Accel-Buffering"] = "no"
    return response


@chat_bp.route("/followups", methods=["POST"])
@require_auth
def followups():
    """Suggest follow-up questions for a completed answer."""
    payload = json_body()
    message_id = payload.get("message_id")
    question = optional_string(payload, "question", max_length=2000)
    answer = optional_string(payload, "answer", max_length=6000)
    document_names: list[str] = []

    db = get_db()
    user = current_user(db)

    if message_id:
        message = conversations_repo.get_message(db, user["_id"], message_id)
        if not message:
            raise NotFoundError("That message was not found.")
        answer = message.get("content") or ""
        document_names = [
            source.get("document")
            for source in (message.get("sources") or [])
            if source.get("document")
        ]
        if not question:
            history = conversations_repo.recent_messages(
                db, user["_id"], message["conversation_id"], limit=10
            )
            question = next(
                (item.get("content") for item in reversed(history) if item.get("role") == "user"),
                "",
            )

    if not answer:
        raise ValidationError("There is no answer to base suggestions on.")

    suggestions = llm_service.generate_followups(
        question or "", answer, document_names=document_names
    )
    return ok({"suggestions": suggestions})


def _event(payload: dict) -> str:
    return json.dumps(payload, default=str) + "\n"


def _now() -> float:
    import time

    return time.perf_counter()
