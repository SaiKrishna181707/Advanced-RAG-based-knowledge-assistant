"""Plans, usage metering, preferences, analytics and the public catalogue."""
from __future__ import annotations

import io


def _upload(client, headers, name: str, text: str):
    response = client.post(
        "/api/documents/upload",
        data={"file": (io.BytesIO(text.encode()), name)},
        headers=headers,
        content_type="multipart/form-data",
    )
    return response


def test_plan_catalogue_is_public_and_consistent(client):
    response = client.get("/api/plans")
    assert response.status_code == 200
    data = response.get_json()["data"]

    keys = [plan["key"] for plan in data["plans"]]
    assert keys == ["free", "pro", "team"]

    free, pro, team = data["plans"]
    assert free["price_monthly"] == 0
    assert free["document_limit"] < pro["document_limit"] < team["document_limit"]
    assert free["monthly_questions"] < pro["monthly_questions"] < team["monthly_questions"]
    assert free["storage_limit_bytes"] < pro["storage_limit_bytes"]
    assert all(plan["highlights"] for plan in data["plans"])
    assert sum(1 for plan in data["plans"] if plan["highlighted"]) == 1

    # Highlights may only name entitlements the server enforces. Collaboration
    # and queueing features are not implemented, so they must not be sold.
    advertised = " ".join(h for plan in data["plans"] for h in plan["highlights"]).lower()
    for unimplemented in ("priority", "queue", "shared", "team member", "collaborat", "workspace"):
        assert unimplemented not in advertised

    assert data["billing"]["provider"] is None
    assert "No payment provider" in data["billing"]["note"]


def test_new_account_starts_on_the_free_plan_with_a_fresh_usage_window(client, make_user):
    headers, user, _credentials = make_user()
    assert user["subscription_plan"] == "free"

    usage = client.get("/api/me/usage", headers=headers).get_json()["data"]["usage"]
    assert usage["plan"] == "free"
    assert usage["documents"] == {"used": 0, "limit": 25, "label": "0 / 25", "percent": 0}
    assert usage["questions"]["used"] == 0
    assert usage["storage"]["used_bytes"] == 0
    assert usage["storage"]["label"].endswith("/ 100.0 MB")
    assert usage["limits"]["max_file_size_mb"] == 25


def test_upload_and_question_usage_is_metered(client, make_user, wait_for_ready, monkeypatch):
    from app.services import llm_service

    monkeypatch.setattr(
        llm_service,
        "generate_answer",
        lambda *a, **k: {"answer": "Answer.", "sources": [], "model": "stub", "llm_ms": 1, "usage": None},
    )

    headers, _user, _credentials = make_user()
    body = b"Metered document content for usage accounting."
    upload = _upload(client, headers, "metered.txt", body.decode())
    assert upload.status_code == 202
    document_id = upload.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)

    client.post("/api/chat/ask", json={"question": "How big is this?"}, headers=headers)

    usage = client.get("/api/me/usage", headers=headers).get_json()["data"]["usage"]
    assert usage["documents"]["used"] == 1
    assert usage["documents"]["label"] == "1 / 25"
    assert usage["storage"]["used_bytes"] == len(body)
    assert usage["questions"]["used"] == 1
    assert usage["this_month"]["documents_uploaded"] == 1
    assert usage["this_month"]["processing_operations"] == 1
    assert usage["storage"]["percent"] >= 0


def test_deleting_a_document_releases_storage(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    body = b"Temporary content that will be deleted to free storage."
    upload = _upload(client, headers, "temp.txt", body.decode())
    document_id = upload.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)

    before = client.get("/api/me/usage", headers=headers).get_json()["data"]["usage"]
    assert before["storage"]["used_bytes"] == len(body)

    client.delete(f"/api/documents/{document_id}", headers=headers)

    after = client.get("/api/me/usage", headers=headers).get_json()["data"]["usage"]
    assert after["documents"]["used"] == 0
    assert after["storage"]["used_bytes"] == 0
    assert after["this_month"]["storage_bytes"] == 0


def test_document_limit_is_enforced_from_plan_configuration(client, make_user, db, wait_for_ready):
    from bson import ObjectId

    headers, user, _credentials = make_user()

    # Shrink the plan for this user rather than uploading 25 files.
    from app.services import plans

    original = plans.PLANS["free"]
    import dataclasses

    plans.PLANS["free"] = dataclasses.replace(original, document_limit=1)
    try:
        first = _upload(client, headers, "one.txt", "First document contents.")
        assert first.status_code == 202
        wait_for_ready(headers, first.get_json()["data"]["document"]["id"])

        second = _upload(client, headers, "two.txt", "Second document contents.")
        assert second.status_code == 402
        error = second.get_json()["error"]
        assert error["code"] == "usage_limit_reached"
        assert "plan allows 1 documents" in error["message"]
        assert "upgrade" in error["message"].lower()

        # The rejected upload must not leave an orphan document or file behind.
        assert db.documents.count_documents({"user_id": ObjectId(user["id"])}) == 1
    finally:
        plans.PLANS["free"] = original


def test_file_size_limit_is_enforced_from_plan_configuration(client, make_user):
    from app.services import plans

    original = plans.PLANS["free"]
    import dataclasses

    plans.PLANS["free"] = dataclasses.replace(original, max_file_size_mb=0)
    try:
        headers, _user, _credentials = make_user()
        response = _upload(
            client, headers, "small.txt", "Small but over a zero megabyte limit."
        )
        assert response.status_code == 402
        assert "up to 0 MB" in response.get_json()["error"]["message"]
    finally:
        plans.PLANS["free"] = original


def test_question_limit_is_enforced(client, make_user, monkeypatch):
    from app.services import llm_service, plans

    monkeypatch.setattr(
        llm_service,
        "generate_answer",
        lambda *a, **k: {"answer": "Answer.", "sources": [], "model": "stub", "llm_ms": 1, "usage": None},
    )

    headers, _user, _credentials = make_user()
    original = plans.PLANS["free"]
    import dataclasses

    plans.PLANS["free"] = dataclasses.replace(original, monthly_questions=1)
    try:
        assert client.post("/api/chat/ask", json={"question": "First?"}, headers=headers).status_code == 200

        second = client.post("/api/chat/ask", json={"question": "Second?"}, headers=headers)
        assert second.status_code == 402
        assert "used all 1 questions" in second.get_json()["error"]["message"]

        # Search is not metered as a question, so it still works.
        assert client.post("/api/search/", json={"query": "anything"}, headers=headers).status_code == 200
    finally:
        plans.PLANS["free"] = original


def test_changing_plan_updates_entitlements_without_charging(client, make_user):
    headers, _user, _credentials = make_user()

    response = client.post("/api/me/plan", json={"plan": "pro"}, headers=headers)
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert data["user"]["subscription_plan"] == "pro"
    assert data["usage"]["plan"] == "pro"
    assert data["usage"]["documents"]["limit"] == 1000
    assert data["usage"]["questions"]["limit"] == 10000
    assert data["billing"]["charged"] is False
    assert data["billing"]["provider"] is None

    downgraded = client.post("/api/me/plan", json={"plan": "free"}, headers=headers)
    assert downgraded.get_json()["data"]["user"]["subscription_plan"] == "free"

    invalid = client.post("/api/me/plan", json={"plan": "enterprise"}, headers=headers)
    assert invalid.status_code == 422

    activity = client.get("/api/me/activity", headers=headers).get_json()["data"]["activity"]
    assert any(item["event"] == "subscription.changed" for item in activity)


def test_preferences_round_trip_and_validation(client, make_user):
    headers, _user, _credentials = make_user()

    defaults = client.get("/api/me/preferences", headers=headers).get_json()["data"]
    assert defaults["preferences"]["response_style"] == "concise"
    assert defaults["preferences"]["theme"] == "system"
    from app.config import settings as app_settings

    # The model is configurable, so assert the contract rather than a literal name.
    assert defaults["options"]["model"]["name"] == app_settings.groq_model
    assert defaults["options"]["model"]["configured"] is True
    assert defaults["options"]["max_retrieval_count"] == 4
    assert set(defaults["options"]["response_styles"][0]) == {"value", "label"}

    collection = client.post(
        "/api/collections/", json={"name": "Preferred"}, headers=headers
    ).get_json()["data"]["collection"]

    updated = client.patch(
        "/api/me/preferences",
        json={
            "response_style": "detailed",
            "theme": "dark",
            "default_collection_id": collection["id"],
            "retrieval_count": 3,
        },
        headers=headers,
    )
    assert updated.status_code == 200
    preferences = updated.get_json()["data"]["preferences"]
    assert preferences["response_style"] == "detailed"
    assert preferences["theme"] == "dark"
    assert preferences["default_collection_id"] == collection["id"]
    assert preferences["retrieval_count"] == 3

    persisted = client.get("/api/me/preferences", headers=headers).get_json()["data"]["preferences"]
    assert persisted == preferences

    assert (
        client.patch("/api/me/preferences", json={"response_style": "shouty"}, headers=headers).status_code
        == 422
    )
    assert client.patch("/api/me/preferences", json={"theme": "neon"}, headers=headers).status_code == 422
    assert client.patch("/api/me/preferences", json={}, headers=headers).status_code == 422
    assert (
        client.patch(
            "/api/me/preferences",
            json={"default_collection_id": "000000000000000000000000"},
            headers=headers,
        ).status_code
        == 404
    )
    # The free plan retrieves at most 4 passages.
    assert (
        client.patch("/api/me/preferences", json={"retrieval_count": 9}, headers=headers).status_code
        == 422
    )


def test_response_style_preference_reaches_the_model(client, make_user, wait_for_ready, monkeypatch):
    from app.services import llm_service

    captured = {}

    def fake_generate(question, chunks, **kwargs):
        captured.update(kwargs)
        return {"answer": "Answer.", "sources": [], "model": "stub", "llm_ms": 1, "usage": None}

    monkeypatch.setattr(llm_service, "generate_answer", fake_generate)

    headers, _user, _credentials = make_user()
    _upload(client, headers, "style.txt", "Response style content. " * 10)
    client.patch("/api/me/preferences", json={"response_style": "bulleted"}, headers=headers)
    client.post("/api/chat/ask", json={"question": "Style test?"}, headers=headers)

    assert captured["style"] == "bulleted"
    assert captured["scope_label"] == "all documents"


def test_dashboard_overview(client, make_user):
    headers, user, _credentials = make_user()
    response = client.get("/api/me/overview", headers=headers)
    assert response.status_code == 200
    data = response.get_json()["data"]

    assert data["user"]["id"] == user["id"]
    assert data["counts"] == {"documents": 0, "questions": 0, "collections": 1, "conversations": 0}
    assert data["recent_documents"] == []
    assert data["recent_conversations"] == []
    assert data["usage"]["plan"] == "free"
    assert isinstance(data["activity"], list)
    # A fresh account gets the default collection created at signup.
    collections = client.get("/api/collections/", headers=headers).get_json()["data"]["collections"]
    assert len(collections) == 1


def test_analytics_reports_real_numbers(client, make_user, wait_for_ready, monkeypatch):
    from app.services import llm_service

    monkeypatch.setattr(
        llm_service,
        "generate_answer",
        lambda *a, **k: {"answer": "Answer.", "sources": [], "model": "stub", "llm_ms": 7, "usage": None},
    )

    headers, _user, _credentials = make_user()
    empty = client.get("/api/analytics/", headers=headers).get_json()["data"]
    assert empty["totals"]["documents"] == 0
    assert empty["totals"]["chunks"] == 0
    assert empty["totals"]["questions"] == 0
    assert empty["totals"]["conversations"] == 0
    assert empty["performance"]["avg_llm_ms"] == 0.0
    assert empty["documents_by_collection"] == []
    assert empty["most_queried_documents"] == []
    assert empty["feedback"]["total"] == 0

    document_id = _upload(
        client, headers, "analytics.txt", "Analytics content for the dashboard. " * 6
    ).get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)
    client.post("/api/chat/ask", json={"question": "Analytics question?"}, headers=headers)

    filled = client.get("/api/analytics/", headers=headers).get_json()["data"]
    assert filled["totals"]["documents"] == 1
    assert filled["totals"]["chunks"] >= 1
    assert filled["totals"]["conversations"] == 1
    assert filled["totals"]["user_questions"] == 1
    assert filled["totals"]["storage_bytes"] > 0
    assert filled["totals"]["storage_label"].endswith(("B", "KB", "MB", "GB"))
    assert filled["totals"]["processing_failures"] == 0
    assert filled["performance"]["answers"] == 1
    assert filled["performance"]["avg_llm_ms"] == 7.0
    assert len(filled["most_queried_documents"]) == 1
    assert filled["most_queried_documents"][0]["document_id"] == document_id
    assert filled["documents_by_status"] == [{"status": "ready", "count": 1}]
    assert filled["usage"]["questions"]["used"] == 1


def test_analytics_groups_documents_by_collection(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    collection = client.post(
        "/api/collections/", json={"name": "Reporting"}, headers=headers
    ).get_json()["data"]["collection"]

    upload = _upload(client, headers, "grouped.txt", "Grouped analytics content body.")
    document_id = upload.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)
    client.patch(f"/api/documents/{document_id}", json={"collection_id": collection["id"]}, headers=headers)

    analytics = client.get("/api/analytics/", headers=headers).get_json()["data"]
    assert analytics["documents_by_collection"] == [
        {"collection_id": collection["id"], "name": "Reporting", "count": 1}
    ]


def test_health_endpoint_reports_each_dependency(client):
    response = client.get("/api/health")
    assert response.status_code in (200, 503)
    payload = response.get_json()["data"]

    assert payload["service"] == "albatross-api"
    assert payload["checks"]["api"]["status"] == "ok"
    assert payload["checks"]["database"]["status"] == "ok"
    assert payload["checks"]["database"]["engine"] == "mongodb"
    assert payload["checks"]["vector_index"]["status"] == "ok"
    assert payload["checks"]["llm"]["configured"] is True

    serialised = response.get_data(as_text=True)
    assert "gsk_" not in serialised and "mongodb://" not in serialised


def test_account_export_contains_only_summary_data(client, make_user, wait_for_ready):
    headers, user, _credentials = make_user()
    upload = _upload(client, headers, "export.txt", "Exportable content body.")
    wait_for_ready(headers, upload.get_json()["data"]["document"]["id"])

    export = client.get("/api/me/export", headers=headers).get_json()["data"]
    assert export["user"]["id"] == user["id"]
    assert [item["name"] for item in export["documents"]] == ["export.txt"]
    assert export["conversations"] == []
    assert "password_hash" not in str(export)
