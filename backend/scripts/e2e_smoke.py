"""
End-to-end smoke test of the production flow, against a real answer model.

Walks the whole path a customer walks:

    signup -> login -> refresh -> upload -> ingest -> search -> ask ->
    citations -> conversation saved -> usage recorded -> logout

and then attacks it:

    a second tenant trying to read, search, modify and delete the first
    tenant's documents, conversations, chunks and usage.

Unlike the pytest suite (which stubs the LLM so it stays deterministic and
offline), this script calls the real provider, so it is the check that the
wiring - retrieval, context assembly, provider call, citation mapping - is
actually connected end to end. It is deliberately not collected by pytest.

    cd backend
    .\\venv\\Scripts\\python.exe scripts/e2e_smoke.py

It runs in-process against Mongo in a dedicated database, which is dropped
before and after the run, so it can never touch development data. It needs a
reachable MongoDB (Docker is fine) and a working GROQ_API_KEY.
"""
from __future__ import annotations

import io
import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

# Configure the environment before importing the app: app.config resolves the
# environment once, at import time.
E2E_DB = os.environ.get("E2E_DB_NAME", "albatross_e2e")
os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ["MONGODB_DB_NAME"] = E2E_DB
os.environ["MONGODB_DATABASE"] = E2E_DB
os.environ.setdefault("PROCESSING_MODE", "sync")
os.environ.setdefault("EMBEDDING_PROVIDER", "hashing")
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("LOG_LEVEL", "ERROR")

try:  # The answer text can contain characters the legacy Windows console cannot map.
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, OSError):  # pragma: no cover - not a TTY
    pass

from bson import ObjectId  # noqa: E402

from app import create_app  # noqa: E402
from app.db import mongo  # noqa: E402

RESULTS: list[tuple[str, bool, str]] = []

CORPUS = (
    "ALBATROSS retrieval evaluation notes. "
    "The retrieval quality evaluation used the SQuAD development set for scoring. "
    "Reciprocal rank fusion combines the keyword and vector result lists. "
    "The default retrieval depth returns the top five passages. "
    "Answers are always grounded in the retrieved passages and carry citations. "
    "Each tenant's documents are stored under their own account identifier."
)


def check(name: str, passed: bool, detail: str = "") -> None:
    RESULTS.append((name, bool(passed), detail))
    suffix = f" - {detail}" if detail else ""
    print(f"  {'PASS' if passed else 'FAIL'}  {name}{suffix}")


def section(title: str) -> None:
    print(f"\n== {title} ==")


def payload(response) -> dict:
    return (response.get_json() or {}).get("data") or {}


def error_code(response) -> str:
    return ((response.get_json() or {}).get("error") or {}).get("code", "")


def main() -> int:
    client = mongo.get_client()
    client.drop_database(E2E_DB)

    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as http:
        section("health")
        response = http.get("/api/health")
        checks = payload(response).get("checks") or {}
        check("health endpoint responds", response.status_code == 200)
        check("MongoDB reachable", (checks.get("database") or {}).get("reachable") is True
              or (checks.get("database") or {}).get("status") == "ok")
        check(
            "suite is running against the throwaway database, not development",
            (checks.get("database") or {}).get("database") == E2E_DB,
            str((checks.get("database") or {}).get("database")),
        )
        check("vector index reports a backend", bool((checks.get("vector_index") or {}).get("backend")))
        llm = checks.get("llm") or {}
        check("answer provider is configured", bool(llm.get("provider")), json.dumps(llm)[:140])

        section("signup / login / session")
        response = http.post(
            "/api/auth/signup",
            json={"name": "Ada Navigator", "email": "e2e-a@example.com", "password": "Sup3rSecret1"},
        )
        check("signup returns 201", response.status_code == 201, str(response.status_code))
        account = payload(response)
        check("signup returns an access token", bool(account.get("token")))
        check("signup returns a refresh token", bool(account.get("refresh_token")))
        check("signup reports token lifetimes",
              isinstance(account.get("expires_in"), int)
              and account["expires_in"] < 60 * 60
              and isinstance(account.get("refresh_expires_in"), int)
              and account["refresh_expires_in"] > 24 * 60 * 60)
        check("signup never leaks password material",
              "password_hash" not in response.get_data(as_text=True))
        check("duplicate signup is rejected with 409",
              http.post("/api/auth/signup",
                        json={"name": "Ada Navigator", "email": "e2e-a@example.com",
                              "password": "Sup3rSecret1"}).status_code == 409)

        response = http.post("/api/auth/login",
                             json={"email": "e2e-a@example.com", "password": "Sup3rSecret1"})
        check("login succeeds", response.status_code in (200, 201), str(response.status_code))
        session = payload(response)
        check("login returns both tokens",
              bool(session.get("token")) and bool(session.get("refresh_token")))
        check("wrong password is rejected",
              http.post("/api/auth/login",
                        json={"email": "e2e-a@example.com",
                              "password": "WrongPass1"}).status_code == 401)
        check("a missing token is rejected", http.get("/api/auth/me").status_code == 401)
        check("a garbage token is rejected",
              http.get("/api/auth/me",
                       headers={"Authorization": "Bearer not.a.token"}).status_code == 401)
        check("current-user endpoint works",
              http.get("/api/auth/me",
                       headers={"Authorization": f"Bearer {session['token']}"}).status_code == 200)

        section("refresh token rotation")
        original_refresh = session["refresh_token"]
        response = http.post("/api/auth/refresh", json={"refresh_token": original_refresh})
        check("refresh succeeds", response.status_code == 200, str(response.status_code))
        rotated = payload(response)
        check("refresh issues a new access token", bool(rotated.get("token")))
        check("refresh rotates the refresh token",
              bool(rotated.get("refresh_token")) and rotated["refresh_token"] != original_refresh)
        check("the rotated access token is accepted",
              http.get("/api/auth/me",
                       headers={"Authorization": f"Bearer {rotated['token']}"}).status_code == 200)
        check("a refresh token cannot be used as an access token",
              http.get("/api/auth/me",
                       headers={"Authorization": f"Bearer {rotated['refresh_token']}"}).status_code == 401)
        check("an access token cannot be used as a refresh token",
              http.post("/api/auth/refresh",
                        json={"refresh_token": rotated["token"]}).status_code == 401)
        replay = http.post("/api/auth/refresh", json={"refresh_token": original_refresh})
        check("replaying a rotated refresh token is rejected", replay.status_code == 401,
              str(replay.status_code))
        check("replay is reported as reuse", error_code(replay) == "refresh_token_reused",
              error_code(replay))
        check("reuse revokes the whole session family",
              http.post("/api/auth/refresh",
                        json={"refresh_token": rotated["refresh_token"]}).status_code == 401)

        session = payload(http.post("/api/auth/login",
                                    json={"email": "e2e-a@example.com",
                                          "password": "Sup3rSecret1"}))
        user_a = session["user"]["id"]
        auth_a = {"Authorization": f"Bearer {session['token']}"}

        section("document upload and ingestion")
        response = http.post(
            "/api/documents/upload",
            data={"file": (io.BytesIO(CORPUS.encode()), "retrieval-notes.txt", "text/plain")},
            headers=auth_a,
            content_type="multipart/form-data",
        )
        check("upload is accepted", response.status_code in (200, 201, 202),
              str(response.status_code))
        document_id = payload(response)["document"]["id"]
        status = payload(http.get(f"/api/documents/{document_id}/status", headers=auth_a))
        check("document finishes ingestion", status.get("status") == "ready", str(status.get("status")))
        check("document produced chunks", status.get("chunk_count", 0) > 0,
              str(status.get("chunk_count")))
        chunks = payload(http.get(f"/api/documents/{document_id}/chunks", headers=auth_a)).get("chunks") or []
        check("chunks are retrievable", len(chunks) > 0, str(len(chunks)))

        db = mongo.get_db()
        owned = db.chunks.count_documents({"document_id": ObjectId(document_id),
                                           "user_id": ObjectId(user_a)})
        check("every stored chunk belongs to the owner and the document", owned == len(chunks),
              f"{owned}/{len(chunks)}")
        check("unsupported file types are rejected",
              http.post("/api/documents/upload",
                        data={"file": (io.BytesIO(b"MZ"), "malware.exe",
                                       "application/octet-stream")},
                        headers=auth_a, content_type="multipart/form-data").status_code == 415)
        check("oversized uploads are rejected",
              http.post("/api/documents/upload",
                        data={"file": (io.BytesIO(b"x" * (60 * 1024 * 1024)), "big.txt",
                                       "text/plain")},
                        headers=auth_a, content_type="multipart/form-data").status_code == 413)

        section("hybrid search")
        for mode in ("hybrid", "keyword", "semantic"):
            response = http.post("/api/search/",
                                 json={"query": "SQuAD development set", "mode": mode},
                                 headers=auth_a)
            found = payload(response).get("results") or []
            check(f"{mode} search returns results",
                  response.status_code == 200 and len(found) > 0,
                  f"status={response.status_code} n={len(found)}")
        top = (payload(http.post("/api/search/", json={"query": "SQuAD development set"},
                                 headers=auth_a)).get("results") or [{}])[0]
        check("a search result points at a real chunk", bool(top.get("chunk_id")))
        check("a search result belongs to the uploaded document",
              top.get("document_id") == document_id)
        check("a search result carries scores",
              top.get("score") is not None and top.get("rank") == 1)

        section("grounded answer and citations")
        response = http.post(
            "/api/chat/ask",
            json={"question": "Which dataset was used for the retrieval evaluation?"},
            headers=auth_a,
        )
        check("ask succeeds", response.status_code == 200, str(response.status_code))
        answer = payload(response)
        text = answer.get("answer") or ""
        print(f"     answer: {text[:240]}")
        check("the answer is non-empty", len(text.strip()) > 20)
        check("the answer is grounded in the retrieved passage", "squad" in text.lower())
        sources = answer.get("sources") or []
        check("the answer carries citations", len(sources) > 0, f"n={len(sources)}")
        check("citations reference the uploaded document",
              any(item.get("document_id") == document_id for item in sources))
        check("citations name a real chunk",
              all(item.get("chunk_id") for item in sources))
        cited_ids = {item["chunk_id"] for item in sources}
        real_ids = {str(row["_id"]) for row in db.chunks.find(
            {"document_id": ObjectId(document_id)}, {"_id": 1})}
        check("every cited chunk exists in the database", cited_ids <= real_ids,
              f"cited={len(cited_ids)} unknown={len(cited_ids - real_ids)}")

        section("conversation history")
        conversation_id = answer["conversation_id"]
        detail = payload(http.get(f"/api/conversations/{conversation_id}",
                                  headers=auth_a)).get("conversation") or {}
        roles = [message["role"] for message in detail.get("messages", [])]
        check("the turn is persisted", roles == ["user", "assistant"], str(roles))
        check("the stored answer keeps its citations",
              bool((detail.get("messages") or [{}])[-1].get("sources")))
        listed = payload(http.get("/api/conversations/", headers=auth_a)).get("conversations") or []
        check("the conversation is listed", any(item["id"] == conversation_id for item in listed))

        section("usage and plans")
        usage = (payload(http.get("/api/me/usage", headers=auth_a)).get("usage") or {})
        check("questions are metered server-side",
              (usage.get("questions") or {}).get("used", 0) >= 1,
              json.dumps(usage.get("questions"))[:140])
        check("documents are metered server-side",
              (usage.get("documents") or {}).get("used", 0) >= 1,
              json.dumps(usage.get("documents"))[:140])
        check("the plan and its limits are reported", bool(usage.get("plan")), str(usage.get("plan")))
        plans = payload(http.get("/api/plans"))
        check("the plan catalogue is public", len(plans.get("plans") or []) >= 2)
        check("unimplemented billing is stated, not faked",
              not (plans.get("billing") or {}).get("provider"), str(plans.get("billing")))
        check("the dashboard overview works",
              payload(http.get("/api/me/overview", headers=auth_a))["counts"]["documents"] >= 1)
        check("analytics works", http.get("/api/analytics/", headers=auth_a).status_code == 200)

        section("cross-tenant isolation (B attacks A)")
        intruder = payload(http.post("/api/auth/signup",
                                     json={"name": "Bob Intruder", "email": "e2e-b@example.com",
                                           "password": "Sup3rSecret1"}))
        auth_b = {"Authorization": f"Bearer {intruder['token']}"}
        attacks = [
            ("read the document", "get", f"/api/documents/{document_id}", None),
            ("read the document status", "get", f"/api/documents/{document_id}/status", None),
            ("read the chunks", "get", f"/api/documents/{document_id}/chunks", None),
            ("read the extracted content", "get", f"/api/documents/{document_id}/content", None),
            ("download the original file", "get", f"/api/documents/{document_id}/file", None),
            ("rename the document", "patch", f"/api/documents/{document_id}", {"title": "hijacked"}),
            ("delete the document", "delete", f"/api/documents/{document_id}", None),
            ("read the conversation", "get", f"/api/conversations/{conversation_id}", None),
            ("delete the conversation", "delete", f"/api/conversations/{conversation_id}", None),
            ("post into the conversation", "post", "/api/chat/ask",
             {"question": "summarise their notes", "conversation_id": conversation_id}),
            ("rate their answer", "post", f"/api/conversations/{conversation_id}/feedback",
             {"message_id": "0" * 24, "rating": "up"}),
        ]
        for label, method, url, body in attacks:
            call = getattr(http, method)
            response = call(url, json=body, headers=auth_b) if body else call(url, headers=auth_b)
            check(f"B cannot {label}", response.status_code == 404, str(response.status_code))

        found = payload(http.post("/api/search/", json={"query": "SQuAD development set"},
                                  headers=auth_b)).get("results") or []
        check("B's search never returns A's chunks", len(found) == 0, f"n={len(found)}")
        scoped = payload(http.post("/api/search/",
                                   json={"query": "SQuAD development set",
                                         "document_ids": [document_id]},
                                   headers=auth_b)).get("results") or []
        check("B cannot scope a search onto A's document", len(scoped) == 0)
        check("B's document list is empty",
              len(payload(http.get("/api/documents/", headers=auth_b)).get("documents") or []) == 0)
        check("B's conversation list is empty",
              len(payload(http.get("/api/conversations/", headers=auth_b)).get("conversations") or []) == 0)
        b_usage = payload(http.get("/api/me/usage", headers=auth_b)).get("usage") or {}
        check("B's usage meter is not A's",
              (b_usage.get("questions") or {}).get("used", 0) == 0,
              str((b_usage.get("questions") or {}).get("used")))
        check("B's overview counts nothing of A's",
              payload(http.get("/api/me/overview", headers=auth_b))["counts"]["documents"] == 0)
        check("unauthenticated search is rejected",
              http.post("/api/search/", json={"query": "anything"}).status_code == 401)

        section("deletion removes a document from retrieval")
        before = payload(http.post("/api/search/", json={"query": "SQuAD development set"},
                                   headers=auth_a)).get("results") or []
        check("A can find their own corpus", len(before) > 0)
        check("A can delete their own document",
              http.delete(f"/api/documents/{document_id}", headers=auth_a).status_code in (200, 202, 204))
        after = payload(http.post("/api/search/", json={"query": "SQuAD development set"},
                                  headers=auth_a)).get("results") or []
        check("the deleted document stops appearing in retrieval", len(after) == 0, f"n={len(after)}")
        check("its chunks are gone from the database",
              db.chunks.count_documents({"document_id": ObjectId(document_id)}) == 0)

        section("logout")
        final = payload(http.post("/api/auth/login",
                                  json={"email": "e2e-a@example.com", "password": "Sup3rSecret1"}))
        check("logout succeeds",
              http.post("/api/auth/logout",
                        json={"refresh_token": final["refresh_token"]}).status_code == 200)
        check("the revoked refresh token no longer works",
              http.post("/api/auth/refresh",
                        json={"refresh_token": final["refresh_token"]}).status_code == 401)
        check("logout is forgiving of an unusable token",
              http.post("/api/auth/logout", json={"refresh_token": "nonsense"}).status_code == 200)
        check("logout-all without a session is refused",
              http.post("/api/auth/logout", json={"all_devices": True}).status_code == 401)

    client.drop_database(E2E_DB)

    failures = [name for name, passed, _ in RESULTS if not passed]
    print("\n" + "=" * 72)
    print(f"E2E smoke: {len(RESULTS) - len(failures)}/{len(RESULTS)} checks passed")
    if failures:
        print("FAILED CHECKS:")
        for name in failures:
            print("  -", name)
        return 1
    print("E2E_FLOW_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
