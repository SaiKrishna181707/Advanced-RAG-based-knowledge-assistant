"""
Chat: grounded answers, citations, streaming, regenerate, follow-ups, feedback and
conversation management.

The Groq API is stubbed. Answer *generation* is an external service; the behaviour
worth testing here is our own - retrieval, citation building, persistence, scope
handling and the streaming event protocol.
"""
from __future__ import annotations

import io
import json

import pytest

from app.services import llm_service

ANSWER = "The methodology uses two-stage retrieval [1]."
QUESTION = "What is the main methodology?"


@pytest.fixture()
def stub_llm(monkeypatch):
    """Replace the network calls while keeping build_context/build_sources real."""
    calls: dict = {"count": 0, "regenerate": 0}

    def fake_generate(question, chunks, **kwargs):
        calls["count"] += 1
        calls["question"] = question
        calls["chunks"] = chunks
        return {
            "answer": ANSWER,
            "sources": llm_service.build_sources(chunks),
            "model": "stub-model",
            "llm_ms": 12,
            "usage": {"total_tokens": 42},
        }

    def fake_stream(question, chunks, **kwargs):
        calls["count"] += 1
        calls["question"] = question
        calls["chunks"] = chunks
        for token in ("The methodology ", "uses two-stage ", "retrieval [1]."):
            yield token

    def fake_followups(question, answer, *, document_names=None, limit=3):
        return ["Explain the methodology", "Compare with another document"]

    monkeypatch.setattr(llm_service, "generate_answer", fake_generate)
    monkeypatch.setattr(llm_service, "stream_answer", fake_stream)
    monkeypatch.setattr(llm_service, "generate_followups", fake_followups)
    return calls


def _upload(client, headers, name: str, text: str):
    response = client.post(
        "/api/documents/upload",
        data={"file": (io.BytesIO(text.encode()), name)},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert response.status_code == 202, response.get_json()
    return response.get_json()["data"]["document"]["id"]


def _corpus(client, headers, wait_for_ready, name="methodology.txt"):
    document_id = _upload(
        client,
        headers,
        name,
        "The main methodology is a two-stage retrieval evaluation using reciprocal rank fusion. " * 5,
    )
    wait_for_ready(headers, document_id)
    return document_id


def test_ask_returns_grounded_answer_with_citations(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    document_id = _corpus(client, headers, wait_for_ready)

    response = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers)
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert data["answer"] == ANSWER
    assert data["conversation_id"] and data["message_id"]
    assert data["model"] == "stub-model"
    assert data["retrieval_ms"] >= 0
    assert data["llm_ms"] == 12

    assert len(data["sources"]) == len(stub_llm["chunks"]) > 0
    source = data["sources"][0]
    assert source["index"] == 1
    assert source["document_id"] == document_id
    assert source["document"] == "methodology.txt"
    assert source["content"] and source["snippet"]
    assert 0 < source["relevance"] <= 1


def test_ask_persists_conversation_and_messages(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    asked = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]
    conversation_id = asked["conversation_id"]

    detail = client.get(f"/api/conversations/{conversation_id}", headers=headers).get_json()["data"]
    conversation = detail["conversation"]

    assert conversation["title"] == QUESTION
    assert conversation["message_count"] == 2
    assert conversation["last_message_preview"] == QUESTION
    assert [item["role"] for item in conversation["messages"]] == ["user", "assistant"]
    assert conversation["messages"][0]["content"] == QUESTION
    assert conversation["messages"][1]["content"] == ANSWER
    assert conversation["messages"][1]["sources"]
    assert conversation["messages"][1]["retrieval_ms"] is not None

    listed = client.get("/api/conversations/", headers=headers).get_json()["data"]
    assert [item["id"] for item in listed["conversations"]] == [conversation_id]


def test_conversation_history_is_sent_to_the_model(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    first = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]
    client.post(
        "/api/chat/ask",
        json={"question": "What dataset did they use?", "conversation_id": first["conversation_id"]},
        headers=headers,
    )

    messages = llm_service.build_messages(
        "What dataset did they use?",
        stub_llm["chunks"],
        history=[
            {"role": "user", "content": QUESTION},
            {"role": "assistant", "content": ANSWER},
        ],
        max_turns=4,
    )
    roles = [item["role"] for item in messages]
    assert roles == ["system", "user", "assistant", "user"]
    assert "Reciprocal Rank Fusion" in messages[0]["content"] or "ALBATROSS" in messages[0]["content"]


def test_history_window_is_bounded(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    conversation_id = None
    for turn in range(5):
        payload = {"question": f"Follow-up question number {turn}?"}
        if conversation_id:
            payload["conversation_id"] = conversation_id
        conversation_id = client.post(
            "/api/chat/ask", json=payload, headers=headers
        ).get_json()["data"]["conversation_id"]

    detail = client.get(f"/api/conversations/{conversation_id}", headers=headers).get_json()["data"]
    # Every message is stored...
    assert len(detail["conversation"]["messages"]) == 10
    # ...but the prompt only carries the last 3 turns (6 messages), not the whole history.
    window = llm_service.history_messages(detail["conversation"]["messages"], 3)
    assert len(window) == 6
    assert window[0]["content"] == "Follow-up question number 2?"
    # The window ends on the answering turn: question 4 and the reply to it.
    assert window[-2]["content"] == "Follow-up question number 4?"
    assert window[-1]["role"] == "assistant"
    assert len(llm_service.history_messages(detail["conversation"]["messages"], 1)) == 2


def test_stream_emits_the_documented_ndjson_event_sequence(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    response = client.post("/api/chat/stream", json={"question": QUESTION}, headers=headers)
    assert response.status_code == 200
    assert response.mimetype == "application/x-ndjson"

    events = [json.loads(line) for line in response.get_data(as_text=True).splitlines() if line.strip()]
    kinds = [event["type"] for event in events]
    assert kinds == ["meta", "sources", "delta", "delta", "delta", "done"]

    meta = events[0]
    assert meta["conversation_id"]
    assert meta["scope_label"] == "all documents"
    assert meta["model"]

    assert events[1]["sources"][0]["document"] == "methodology.txt"

    streamed = "".join(event["text"] for event in events if event["type"] == "delta")
    assert streamed == ANSWER

    done = events[-1]
    assert done["message_id"]
    assert done["source_count"] > 0

    # The streamed answer is persisted, so a reload shows the same thing.
    detail = client.get(
        f"/api/conversations/{meta['conversation_id']}", headers=headers
    ).get_json()["data"]
    assert detail["conversation"]["messages"][1]["content"] == ANSWER


def test_stream_reports_a_provider_failure_as_an_error_event(client, make_user, wait_for_ready, monkeypatch):
    from app.errors import UpstreamError

    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    def exploding_stream(*args, **kwargs):
        yield "partial answer"
        raise UpstreamError("The answer service is unavailable right now.")

    monkeypatch.setattr(llm_service, "stream_answer", exploding_stream)

    response = client.post("/api/chat/stream", json={"question": QUESTION}, headers=headers)
    events = [json.loads(line) for line in response.get_data(as_text=True).splitlines() if line.strip()]
    kinds = [event["type"] for event in events]
    assert kinds[-1] == "error"
    assert events[-1]["partial"] is True
    assert events[-1]["message"] == "The answer service is unavailable right now."


def test_regenerate_replaces_the_last_answer_without_duplicating_it(
    client, make_user, wait_for_ready, stub_llm
):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    first = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]
    again = client.post(
        "/api/chat/ask",
        json={"conversation_id": first["conversation_id"], "regenerate": True},
        headers=headers,
    )
    assert again.status_code == 200

    detail = client.get(
        f"/api/conversations/{first['conversation_id']}", headers=headers
    ).get_json()["data"]
    roles = [item["role"] for item in detail["conversation"]["messages"]]
    assert roles == ["user", "assistant"], "regenerate must replace, not append"


def test_regenerate_without_a_previous_question_is_rejected(client, make_user, stub_llm):
    headers, _user, _credentials = make_user()
    conversation = client.post("/api/conversations/", json={}, headers=headers).get_json()["data"]["conversation"]

    response = client.post(
        "/api/chat/ask",
        json={"conversation_id": conversation["id"], "regenerate": True},
        headers=headers,
    )
    assert response.status_code == 422


def test_ask_validates_the_question(client, make_user, stub_llm):
    headers, _user, _credentials = make_user()
    assert client.post("/api/chat/ask", json={}, headers=headers).status_code == 422
    assert client.post("/api/chat/ask", json={"question": ""}, headers=headers).status_code == 422
    assert (
        client.post("/api/chat/ask", json={"question": "x" * 3000}, headers=headers).status_code == 422
    )
    # An unknown conversation id is a 404, and a malformed one is treated the same
    # way rather than leaking whether the id exists.
    assert (
        client.post(
            "/api/chat/ask", json={"question": "Valid?", "conversation_id": "nope"}, headers=headers
        ).status_code
        == 404
    )


def test_document_scope_limits_retrieval(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    first = _upload(client, headers, "first.txt", "Alpha source material about optics. " * 5)
    wait_for_ready(headers, first)
    second = _upload(client, headers, "second.txt", "Beta source material about acoustics. " * 5)
    wait_for_ready(headers, second)

    response = client.post(
        "/api/chat/ask",
        json={
            "question": "What material is described?",
            "scope": {"mode": "documents", "document_ids": [first]},
        },
        headers=headers,
    )
    assert response.status_code == 200
    assert {chunk["document_id"] for chunk in stub_llm["chunks"]} == {first}
    assert response.get_json()["data"]["sources"][0]["document_id"] == first


def test_collection_scope_limits_retrieval(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    collection = client.post(
        "/api/collections/", json={"name": "Acoustics"}, headers=headers
    ).get_json()["data"]["collection"]

    inside = _upload(client, headers, "inside.txt", "Gamma resonance material inside. " * 5)
    wait_for_ready(headers, inside)
    client.patch(f"/api/documents/{inside}", json={"collection_id": collection["id"]}, headers=headers)

    outside = _upload(client, headers, "outside.txt", "Delta resonance material outside. " * 5)
    wait_for_ready(headers, outside)

    client.post(
        "/api/chat/ask",
        json={"question": "What resonance material?", "scope": {"mode": "collection", "collection_id": collection["id"]}},
        headers=headers,
    )
    assert {chunk["document_id"] for chunk in stub_llm["chunks"]} == {inside}


def test_scope_rejects_unknown_or_missing_targets(client, make_user, stub_llm):
    headers, _user, _credentials = make_user()

    missing_collection = client.post(
        "/api/chat/ask",
        json={"question": "Anything?", "scope": {"mode": "collection"}},
        headers=headers,
    )
    assert missing_collection.status_code == 422

    unknown = client.post(
        "/api/chat/ask",
        json={"question": "Anything?", "scope": {"mode": "collection", "collection_id": "000000000000000000000000"}},
        headers=headers,
    )
    assert unknown.status_code == 404

    empty_documents = client.post(
        "/api/chat/ask",
        json={"question": "Anything?", "scope": {"mode": "documents", "document_ids": []}},
        headers=headers,
    )
    assert empty_documents.status_code == 422

    bad_mode = client.post(
        "/api/chat/ask",
        json={"question": "Anything?", "scope": {"mode": "everything"}},
        headers=headers,
    )
    assert bad_mode.status_code == 422


def test_followups_are_generated_from_the_answer(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    asked = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]
    response = client.post(
        "/api/chat/followups", json={"message_id": asked["message_id"]}, headers=headers
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["suggestions"] == [
        "Explain the methodology",
        "Compare with another document",
    ]

    assert client.post("/api/chat/followups", json={}, headers=headers).status_code == 422
    assert (
        client.post(
            "/api/chat/followups", json={"message_id": "000000000000000000000000"}, headers=headers
        ).status_code
        == 404
    )


def test_feedback_can_be_changed_and_is_reflected_on_the_message(
    client, make_user, wait_for_ready, stub_llm
):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)
    asked = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]

    path = f"/api/conversations/{asked['conversation_id']}/feedback"
    up = client.post(
        path, json={"message_id": asked["message_id"], "rating": "up"}, headers=headers
    )
    assert up.status_code == 200
    assert up.get_json()["data"]["rating"] == "up"

    down = client.post(
        path,
        json={"message_id": asked["message_id"], "rating": "down", "comment": "Too vague"},
        headers=headers,
    )
    assert down.status_code == 200
    assert down.get_json()["data"]["rating"] == "down"
    assert down.get_json()["data"]["comment"] == "Too vague"

    detail = client.get(
        f"/api/conversations/{asked['conversation_id']}", headers=headers
    ).get_json()["data"]
    assert detail["conversation"]["messages"][1]["feedback"] == "down"

    analytics = client.get("/api/analytics/", headers=headers).get_json()["data"]
    assert analytics["feedback"]["down"] == 1
    assert analytics["feedback"]["up"] == 0
    assert analytics["feedback"]["total"] == 1


def test_feedback_rejects_invalid_rating_and_non_assistant_message(
    client, make_user, wait_for_ready, stub_llm
):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)
    asked = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]
    detail = client.get(
        f"/api/conversations/{asked['conversation_id']}", headers=headers
    ).get_json()["data"]
    user_message_id = detail["conversation"]["messages"][0]["id"]

    path = f"/api/conversations/{asked['conversation_id']}/feedback"
    assert client.post(path, json={"message_id": asked["message_id"], "rating": "maybe"}, headers=headers).status_code == 422
    assert client.post(path, json={"rating": "up"}, headers=headers).status_code == 422
    assert (
        client.post(path, json={"message_id": user_message_id, "rating": "up"}, headers=headers).status_code
        == 422
    )


def test_conversation_rename_search_clear_and_delete(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)

    first = client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers).get_json()["data"]
    conversation_id = first["conversation_id"]

    renamed = client.patch(
        f"/api/conversations/{conversation_id}", json={"title": "Methodology review"}, headers=headers
    )
    assert renamed.status_code == 200
    assert renamed.get_json()["data"]["conversation"]["title"] == "Methodology review"

    found = client.get("/api/conversations/?q=methodology", headers=headers).get_json()["data"]
    assert [item["id"] for item in found["conversations"]] == [conversation_id]

    missing = client.get("/api/conversations/?q=astrophysics", headers=headers).get_json()["data"]
    assert missing["conversations"] == []

    cleared = client.post(f"/api/conversations/{conversation_id}/clear", headers=headers)
    assert cleared.status_code == 200
    assert cleared.get_json()["data"]["conversation"]["message_count"] == 0
    assert cleared.get_json()["data"]["conversation"]["title"] == "Methodology review"

    after_clear = client.get(f"/api/conversations/{conversation_id}", headers=headers).get_json()["data"]
    assert after_clear["conversation"]["messages"] == []

    deleted = client.delete(f"/api/conversations/{conversation_id}", headers=headers)
    assert deleted.status_code == 200
    assert client.get(f"/api/conversations/{conversation_id}", headers=headers).status_code == 404


def test_conversation_scope_can_be_updated_and_is_reused(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    document_id = _corpus(client, headers, wait_for_ready)

    created = client.post(
        "/api/conversations/",
        json={"title": "Scoped chat", "scope": {"mode": "documents", "document_ids": [document_id]}},
        headers=headers,
    )
    assert created.status_code == 201
    conversation = created.get_json()["data"]["conversation"]
    assert conversation["scope"]["mode"] == "documents"
    assert conversation["scope"]["document_ids"] == [document_id]

    client.post(
        "/api/chat/ask",
        json={"question": QUESTION, "conversation_id": conversation["id"]},
        headers=headers,
    )
    assert {chunk["document_id"] for chunk in stub_llm["chunks"]} == {document_id}

    updated = client.patch(
        f"/api/conversations/{conversation['id']}",
        json={"scope": {"mode": "all"}},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.get_json()["data"]["conversation"]["scope"]["mode"] == "all"


def test_activity_feed_records_questions(client, make_user, wait_for_ready, stub_llm):
    headers, _user, _credentials = make_user()
    _corpus(client, headers, wait_for_ready)
    client.post("/api/chat/ask", json={"question": QUESTION}, headers=headers)

    activity = client.get("/api/me/activity", headers=headers).get_json()["data"]["activity"]
    events = [item["event"] for item in activity]
    assert "question.asked" in events
    assert "document.uploaded" in events

# ------------------------------------------------------- incomplete scope notice


def test_answer_warns_when_part_of_the_scope_is_still_processing(
    client, make_user, db, stub_llm
):
    """A question asked mid-ingest must say the scope was incomplete.

    Retrieval can only see indexed chunks, so without this notice a user would
    reasonably conclude the material is missing from their documents.
    """
    from bson import ObjectId

    headers, user, _credentials = make_user()
    _upload(client, headers, "ready.txt", "Two-stage retrieval is the core method.")

    db.documents.insert_one(
        {
            "_id": ObjectId(),
            "user_id": ObjectId(user["id"]),
            "original_name": "large-handbook.pdf",
            "status": "processing",
            "chunk_count": 0,
            "file_size": 1024,
        }
    )

    body = client.post(
        "/api/chat/ask", headers=headers, json={"question": QUESTION}
    ).get_json()["data"]

    assert body["notice"] == (
        "1 document in this scope is still being processed, so it may not be "
        "reflected in this answer yet."
    )


def test_answer_has_no_notice_when_every_document_is_ready(client, make_user, stub_llm):
    headers, _user, _credentials = make_user()
    _upload(client, headers, "ready.txt", "Two-stage retrieval is the core method.")

    body = client.post(
        "/api/chat/ask", headers=headers, json={"question": QUESTION}
    ).get_json()["data"]

    assert body["notice"] is None


def test_notice_counts_only_pending_documents_in_scope(client, make_user, db, stub_llm):
    from bson import ObjectId

    headers, user, _credentials = make_user()
    for index in range(3):
        db.documents.insert_one(
            {
                "_id": ObjectId(),
                "user_id": ObjectId(user["id"]),
                "original_name": f"pending-{index}.pdf",
                "status": "processing",
                "chunk_count": 0,
                "file_size": 1024,
                # Distinct checksums: real uploads always carry one, and the
                # duplicate-detection index is unique per (user, checksum).
                "sha256": f"{index:064d}",
            }
        )

    body = client.post(
        "/api/chat/ask", headers=headers, json={"question": QUESTION}
    ).get_json()["data"]

    assert body["notice"] == (
        "3 documents in this scope are still being processed, so they may not be "
        "reflected in this answer yet."
    )


def test_stream_meta_includes_the_notice(client, make_user, db, stub_llm):
    from bson import ObjectId

    headers, user, _credentials = make_user()
    _upload(client, headers, "ready.txt", "Two-stage retrieval is the core method.")
    db.documents.insert_one(
        {
            "_id": ObjectId(),
            "user_id": ObjectId(user["id"]),
            "original_name": "big.pdf",
            "status": "indexing",
            "chunk_count": 0,
            "file_size": 1024,
        }
    )

    response = client.post(
        "/api/chat/stream", headers=headers, json={"question": QUESTION}
    )
    events = [
        json.loads(line)
        for line in response.get_data(as_text=True).splitlines()
        if line.strip()
    ]
    meta = next(event for event in events if event["type"] == "meta")

    assert "still being processed" in meta["notice"]
