"""API payload shapes shared by the chat and conversation routes."""
from __future__ import annotations

DEFAULT_SCOPE = {"mode": "all", "collection_id": None, "document_ids": []}


def scope_payload(scope: dict | None) -> dict:
    scope = scope or DEFAULT_SCOPE
    return {
        "mode": scope.get("mode", "all"),
        "collection_id": str(scope["collection_id"]) if scope.get("collection_id") else None,
        "document_ids": [str(item) for item in scope.get("document_ids") or []],
    }


def conversation_payload(conversation: dict) -> dict:
    return {
        "id": str(conversation["_id"]),
        "title": conversation.get("title"),
        "message_count": conversation.get("message_count", 0),
        "last_message_preview": conversation.get("last_message_preview") or "",
        "scope": scope_payload(conversation.get("scope")),
        "created_at": conversation.get("created_at"),
        "updated_at": conversation.get("updated_at"),
    }


def conversation_detail_payload(conversation: dict, messages: list[dict]) -> dict:
    payload = conversation_payload(conversation)
    payload["messages"] = [message_payload(message) for message in messages]
    return payload


def message_payload(message: dict) -> dict:
    payload = {
        "id": str(message["_id"]),
        "role": message.get("role"),
        "content": message.get("content"),
        "created_at": message.get("created_at"),
        "feedback": message.get("feedback"),
    }
    if message.get("sources"):
        payload["sources"] = message["sources"]
    if message.get("retrieval_ms") is not None:
        payload["retrieval_ms"] = message["retrieval_ms"]
    if message.get("llm_ms") is not None:
        payload["llm_ms"] = message["llm_ms"]
    if message.get("model"):
        payload["model"] = message["model"]
    return payload