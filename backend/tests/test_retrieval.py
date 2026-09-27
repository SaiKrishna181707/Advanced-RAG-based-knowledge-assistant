"""Hybrid retrieval: RRF fusion, search modes, filters and relevance ordering."""
from __future__ import annotations

import io

from app.rag.retriever import reciprocal_rank_fusion


def _upload(client, headers, name: str, text: str):
    response = client.post(
        "/api/documents/upload",
        data={"file": (io.BytesIO(text.encode()), name)},
        headers=headers,
        content_type="multipart/form-data",
    )
    assert response.status_code == 202, response.get_json()
    return response.get_json()["data"]["document"]["id"]


def test_reciprocal_rank_fusion_rewards_candidates_ranked_by_both_sources():
    dense = [(0, 0.9), (1, 0.8), (2, 0.1)]
    lexical = [(1, 12.0), (3, 9.0), (0, 1.0)]

    fused = reciprocal_rank_fusion([(dense, 1.0), (lexical, 1.0)], k=60)

    # Position 0 is 1st in dense and 3rd in lexical; position 1 is 2nd in both.
    assert set(fused) == {0, 1, 2, 3}
    assert fused[1] > fused[0], "agreeing rankings must outrank a single strong signal"
    assert fused[0] > fused[2]
    assert fused[3] > 0


def test_reciprocal_rank_fusion_respects_weights_and_ignores_zero_weight():
    dense = [(0, 1.0)]
    lexical = [(1, 1.0)]

    dense_only = reciprocal_rank_fusion([(dense, 1.0), (lexical, 0.0)], k=60)
    assert 1 not in dense_only
    assert dense_only[0] > 0

    weighted = reciprocal_rank_fusion([(dense, 1.0), (lexical, 0.5)], k=60)
    assert weighted[0] > weighted[1]


def test_hybrid_search_finds_the_matching_document(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    document_id = _upload(
        client,
        headers,
        "methodology.txt",
        "The main methodology is a two-stage retrieval evaluation using reciprocal rank fusion "
        "over a corpus of scientific abstracts. " * 6,
    )
    wait_for_ready(headers, document_id)

    response = client.post(
        "/api/search/",
        json={"query": "reciprocal rank fusion methodology", "mode": "hybrid"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.get_json()["data"]
    assert data["count"] >= 1
    assert data["mode"] == "hybrid"
    assert data["latency_ms"] >= 0

    top = data["results"][0]
    assert top["document_id"] == document_id
    assert top["document_name"] == "methodology.txt"
    assert top["rank"] == 1
    assert 0 < top["relevance"] <= 1
    assert top["snippet"]
    assert "reciprocal rank fusion" in top["content"].lower()


def test_all_three_search_modes_return_results(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    document_id = _upload(
        client,
        headers,
        "dataset.txt",
        "The dataset contains forty thousand labelled observations collected over three years. " * 6,
    )
    wait_for_ready(headers, document_id)

    for mode in ("hybrid", "semantic", "keyword"):
        response = client.post(
            "/api/search/", json={"query": "dataset observations", "mode": mode}, headers=headers
        )
        assert response.status_code == 200, mode
        results = response.get_json()["data"]["results"]
        assert results, f"{mode} search returned nothing"
        assert results[0]["document_id"] == document_id


def test_invalid_search_input_is_rejected(client, make_user):
    headers, _user, _credentials = make_user()

    assert client.post("/api/search/", json={"query": "a"}, headers=headers).status_code == 422
    assert (
        client.post(
            "/api/search/", json={"query": "valid query", "mode": "telepathy"}, headers=headers
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/search/",
            json={"query": "valid query", "date_from": "not-a-date"},
            headers=headers,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/search/",
            json={"query": "q", "date_from": "2026-02-01", "date_to": "2026-01-01"},
            headers=headers,
        ).status_code
        == 422
    )


def test_search_on_an_empty_knowledge_base_is_empty_not_an_error(client, make_user):
    headers, _user, _credentials = make_user()
    response = client.post(
        "/api/search/", json={"query": "anything at all", "mode": "hybrid"}, headers=headers
    )
    assert response.status_code == 200
    assert response.get_json()["data"]["results"] == []


def test_collection_filter_scopes_search_results(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()

    collection = client.post(
        "/api/collections/", json={"name": "Scoped Space"}, headers=headers
    ).get_json()["data"]["collection"]

    inside = _upload(
        client, headers, "inside.txt",
        "Quantumchromodynamics appears only inside the scoped collection. " * 4,
    )
    wait_for_ready(headers, inside)
    client.patch(f"/api/documents/{inside}", json={"collection_id": collection["id"]}, headers=headers)

    outside = _upload(
        client, headers, "outside.txt",
        "Quantumchromodynamics also appears outside the scoped collection. " * 4,
    )
    wait_for_ready(headers, outside)

    scoped = client.post(
        "/api/search/",
        json={"query": "quantumchromodynamics", "mode": "hybrid", "collection_id": collection["id"]},
        headers=headers,
    ).get_json()["data"]
    assert [item["document_id"] for item in scoped["results"]] == [inside]
    assert scoped["results"][0]["collection_id"] == collection["id"]

    unscoped = client.post(
        "/api/search/", json={"query": "quantumchromodynamics", "mode": "hybrid"}, headers=headers
    ).get_json()["data"]
    assert len(unscoped["results"]) == 2


def test_document_filter_and_date_filter(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    first = _upload(client, headers, "first.txt", "Betelgeuse observation log entry one. " * 4)
    wait_for_ready(headers, first)
    second = _upload(client, headers, "second.txt", "Betelgeuse observation log entry two. " * 4)
    wait_for_ready(headers, second)

    only_first = client.post(
        "/api/search/",
        json={"query": "betelgeuse observation", "document_ids": [first]},
        headers=headers,
    ).get_json()["data"]
    assert [item["document_id"] for item in only_first["results"]] == [first]

    future = client.post(
        "/api/search/",
        json={"query": "betelgeuse observation", "date_from": "2099-01-01"},
        headers=headers,
    ).get_json()["data"]
    assert future["results"] == []


def test_search_deduplicates_repeated_passages(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    repeated = "Repetitive sentence about retrieval quality metrics and evaluation. "
    document_id = _upload(client, headers, "repeats.txt", repeated * 30)
    wait_for_ready(headers, document_id)

    data = client.post(
        "/api/search/",
        json={"query": "retrieval quality metrics evaluation", "mode": "hybrid", "top_k": 10},
        headers=headers,
    ).get_json()["data"]

    fingerprints = [(item["document_id"], item["page_number"], item["content"][:160]) for item in data["results"]]
    assert len(fingerprints) == len(set(fingerprints)), "duplicate passages must be collapsed"


def test_search_options_and_chunk_lookup(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    document_id = _upload(client, headers, "options.txt", "Search options endpoint body. " * 4)
    wait_for_ready(headers, document_id)

    options = client.get("/api/search/options", headers=headers).get_json()["data"]
    assert [item["id"] for item in options["documents"]] == [document_id]
    assert options["modes"] == ["hybrid", "semantic", "keyword"]

    results = client.post(
        "/api/search/", json={"query": "search options endpoint"}, headers=headers
    ).get_json()["data"]["results"]
    chunk_id = results[0]["chunk_id"]

    chunk = client.get(f"/api/search/chunk/{chunk_id}", headers=headers).get_json()["data"]
    assert chunk["chunk"]["id"] == chunk_id
    assert chunk["chunk"]["document_id"] == document_id
    assert chunk["document"]["name"] == "options.txt"


def test_search_records_activity(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    document_id = _upload(client, headers, "activity.txt", "Activity tracking search content. " * 4)
    wait_for_ready(headers, document_id)

    client.post("/api/search/", json={"query": "activity tracking"}, headers=headers)
    activity = client.get("/api/me/activity", headers=headers).get_json()["data"]
    events = [item["event"] for item in activity["activity"]]
    assert "search.performed" in events
    assert activity["counts"]["search.performed"] >= 1