"""
Multi-user data isolation.

This is the security property that matters most: a signed-in user must never be
able to reach another user's documents, chunks, collections or conversations,
including by guessing a valid ObjectId. Every cross-tenant request below must fail
with 404 (not 403), so the API does not confirm that the id exists at all.
"""
from __future__ import annotations

import io



def _upload(client, headers, name: str, text: str):
    response = client.post(
        "/api/documents/upload",
        data={"file": (io.BytesIO(text.encode()), name)},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert response.status_code == 202, response.get_json()
    return response.get_json()["data"]["document"]["id"]


def test_document_list_only_shows_own_documents(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    alice_doc = _upload(client, alice, "alice-notes.txt", "Alice private methodology notes.")
    _upload(client, bob, "bob-notes.txt", "Bob private dataset notes.")

    alice_documents = client.get("/api/documents/", headers=alice).get_json()["data"]["documents"]
    bob_documents = client.get("/api/documents/", headers=bob).get_json()["data"]["documents"]

    assert [item["id"] for item in alice_documents] == [alice_doc]
    assert all(item["name"].startswith("bob-") for item in bob_documents)
    assert len(bob_documents) == 1


def test_document_read_endpoints_block_other_users(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    alice_doc = _upload(client, alice, "private.txt", "Alice private retrieval notes.")

    for path in (
        f"/api/documents/{alice_doc}",
        f"/api/documents/{alice_doc}/status",
        f"/api/documents/{alice_doc}/content",
        f"/api/documents/{alice_doc}/chunks",
        f"/api/documents/{alice_doc}/file",
    ):
        response = client.get(path, headers=bob)
        assert response.status_code == 404, f"{path} leaked to another user ({response.status_code})"

    # ...and Alice can still read her own document.
    assert client.get(f"/api/documents/{alice_doc}", headers=alice).status_code == 200


def test_document_mutation_and_delete_block_other_users(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    alice_doc = _upload(client, alice, "private.txt", "Alice private mutation notes.")

    renamed = client.patch(
        f"/api/documents/{alice_doc}", json={"name": "stolen.txt"}, headers=bob
    )
    assert renamed.status_code == 404

    deleted = client.delete(f"/api/documents/{alice_doc}", headers=bob)
    assert deleted.status_code == 404

    # The document is untouched for its owner.
    document = client.get(f"/api/documents/{alice_doc}", headers=alice).get_json()["data"]["document"]
    assert document["name"] == "private.txt"


def test_unknown_and_malformed_ids_do_not_error_differently(client, make_user):
    alice, _alice_user, _ = make_user()
    missing = client.get("/api/documents/000000000000000000000000", headers=alice)
    malformed = client.get("/api/documents/not-an-object-id", headers=alice)
    # Both are indistinguishable 404s, so the API cannot be probed for which ids exist.
    assert missing.status_code == 404
    assert malformed.status_code == 404


def test_collections_are_isolated(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    created = client.post(
        "/api/collections/", json={"name": "Alice Research"}, headers=alice
    )
    assert created.status_code == 201
    alice_collection = created.get_json()["data"]["collection"]["id"]

    bob_list = client.get("/api/collections/", headers=bob).get_json()["data"]["collections"]
    assert all(item["id"] != alice_collection for item in bob_list)

    assert client.get(f"/api/collections/{alice_collection}", headers=bob).status_code == 404
    assert (
        client.patch(
            f"/api/collections/{alice_collection}", json={"name": "Hijacked"}, headers=bob
        ).status_code
        == 404
    )
    assert client.delete(f"/api/collections/{alice_collection}", headers=bob).status_code == 404

    still_there = client.get(f"/api/collections/{alice_collection}", headers=alice)
    assert still_there.status_code == 200
    assert still_there.get_json()["data"]["collection"]["name"] == "Alice Research"


def test_move_documents_cannot_steal_another_users_document(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    alice_doc = _upload(client, alice, "alice.txt", "Alice content for collection move.")
    bob_collection = client.post("/api/collections/", json={"name": "Bob Space"}, headers=bob)
    bob_collection_id = bob_collection.get_json()["data"]["collection"]["id"]

    response = client.post(
        f"/api/collections/{bob_collection_id}/documents",
        json={"document_ids": [alice_doc]},
        headers=bob,
    )
    assert response.status_code == 404

    document = client.get(f"/api/documents/{alice_doc}", headers=alice).get_json()["data"]["document"]
    assert document["collection_id"] != bob_collection_id


def test_collection_listing_hides_other_users_documents(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    _upload(client, alice, "alice.txt", "Alice collection content.")
    bob_collection = client.post("/api/collections/", json={"name": "Bob Space"}, headers=bob)
    bob_collection_id = bob_collection.get_json()["data"]["collection"]["id"]

    detail = client.get(f"/api/collections/{bob_collection_id}", headers=bob).get_json()["data"]
    assert detail["documents"] == []


def test_conversations_are_isolated(client, make_user, monkeypatch):
    from app.services import llm_service

    monkeypatch.setattr(
        llm_service,
        "generate_answer",
        lambda *a, **k: {"answer": "Grounded answer.", "sources": [], "model": "test", "llm_ms": 1, "usage": None},
    )

    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    _upload(client, alice, "alice.txt", "Alice conversation content about methodology.")

    asked = client.post("/api/chat/ask", json={"question": "What is the methodology?"}, headers=alice)
    assert asked.status_code == 200
    conversation_id = asked.get_json()["data"]["conversation_id"]

    assert client.get(f"/api/conversations/{conversation_id}", headers=bob).status_code == 404
    assert client.delete(f"/api/conversations/{conversation_id}", headers=bob).status_code == 404
    assert (
        client.patch(
            f"/api/conversations/{conversation_id}", json={"title": "Stolen"}, headers=bob
        ).status_code
        == 404
    )

    bob_list = client.get("/api/conversations/", headers=bob).get_json()["data"]["conversations"]
    assert all(item["id"] != conversation_id for item in bob_list)


def test_feedback_cannot_target_another_users_message(client, make_user, monkeypatch):
    from app.services import llm_service

    monkeypatch.setattr(
        llm_service,
        "generate_answer",
        lambda *a, **k: {"answer": "Grounded answer.", "sources": [], "model": "test", "llm_ms": 1, "usage": None},
    )

    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()
    _upload(client, alice, "alice.txt", "Alice feedback content.")

    asked = client.post("/api/chat/ask", json={"question": "Anything?"}, headers=alice).get_json()["data"]

    response = client.post(
        f"/api/conversations/{asked['conversation_id']}/feedback",
        json={"message_id": asked["message_id"], "rating": "up"},
        headers=bob,
    )
    assert response.status_code == 404


def test_search_never_returns_another_users_chunk(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    _upload(client, alice, "alice-secret.txt", "Zephyrquartz methodology is confidential.")

    response = client.post(
        "/api/search/", json={"query": "Zephyrquartz methodology", "mode": "hybrid"}, headers=bob
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["results"] == []

    alice_results = client.post(
        "/api/search/", json={"query": "Zephyrquartz methodology", "mode": "hybrid"}, headers=alice
    ).get_json()["data"]["results"]
    assert len(alice_results) == 1

    # Bob cannot pull the passage by chunk id either.
    chunk_id = alice_results[0]["chunk_id"]
    assert client.get(f"/api/search/chunk/{chunk_id}", headers=bob).status_code == 404


def test_requests_without_a_token_are_rejected_globally(client):
    endpoints = [
        ("get", "/api/documents/"),
        ("get", "/api/collections/"),
        ("get", "/api/conversations/"),
        ("get", "/api/me/overview"),
        ("get", "/api/me/usage"),
        ("get", "/api/me/activity"),
        ("get", "/api/me/preferences"),
        ("get", "/api/analytics/"),
        ("get", "/api/search/options"),
        ("post", "/api/chat/ask"),
        ("post", "/api/search/"),
    ]
    for method, path in endpoints:
        response = getattr(client, method)(path, json={})
        assert response.status_code == 401, f"{method.upper()} {path} was public"


def test_usage_and_limits_are_per_account(client, make_user, wait_for_ready):
    """One account's uploads and questions must never move another's meters."""
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    document_id = _upload(client, alice, "alice-big.txt", "A" * 5000)
    wait_for_ready(alice, document_id)

    alice_usage = client.get("/api/me/usage", headers=alice).get_json()["data"]["usage"]
    bob_usage = client.get("/api/me/usage", headers=bob).get_json()["data"]["usage"]

    assert alice_usage["documents"]["used"] == 1
    assert alice_usage["storage"]["used_bytes"] > 0
    assert bob_usage["documents"]["used"] == 0
    assert bob_usage["storage"]["used_bytes"] == 0
    assert bob_usage["questions"]["used"] == 0


def test_changing_one_plan_does_not_change_another_account(client, make_user):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    assert client.post("/api/me/plan", json={"plan": "pro"}, headers=alice).status_code == 200

    alice_plan = client.get("/api/me/usage", headers=alice).get_json()["data"]["usage"]
    bob_plan = client.get("/api/me/usage", headers=bob).get_json()["data"]["usage"]

    assert alice_plan["plan"] == "pro"
    assert bob_plan["plan"] == "free"
    assert bob_plan["documents"]["limit"] != alice_plan["documents"]["limit"]


def test_analytics_counts_only_the_callers_corpus(client, make_user, wait_for_ready):
    alice, _alice_user, _ = make_user()
    bob, _bob_user, _ = make_user()

    document_id = _upload(client, alice, "alice-corpus.txt", "Alice keeps a private corpus.")
    wait_for_ready(alice, document_id)

    alice_analytics = client.get("/api/analytics/", headers=alice).get_json()["data"]
    bob_analytics = client.get("/api/analytics/", headers=bob).get_json()["data"]

    assert alice_analytics["totals"]["documents"] == 1
    assert bob_analytics["totals"]["documents"] == 0

    alice_overview = client.get("/api/me/overview", headers=alice).get_json()["data"]
    bob_overview = client.get("/api/me/overview", headers=bob).get_json()["data"]
    assert alice_overview["counts"]["documents"] == 1
    assert bob_overview["counts"]["documents"] == 0
