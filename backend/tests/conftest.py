"""
Pytest fixtures for the ALBATROSS backend.

The suite runs against a real MongoDB instance (the indexes, aggregations and
ownership filters are the parts most worth testing, and mocking them would test
nothing). Point MONGODB_URI at a throwaway server; the database name is forced to
``albatross_test`` and dropped when the session ends.

Set these before importing the app, because app.config resolves the environment
once at import time.
"""
from __future__ import annotations

import io
import os
import time
import uuid

os.environ["MONGODB_URI"] = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
os.environ["MONGODB_DATABASE"] = "albatross_test"
os.environ["PROCESSING_MODE"] = "sync"
os.environ["EMBEDDING_PROVIDER"] = "hashing"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["APP_ENV"] = "testing"
os.environ["LOG_LEVEL"] = "WARNING"
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("FLASK_SECRET_KEY", "test-secret-key-for-pytest-only-and-long-enough")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret-for-pytest-only-and-long-enough")

import pytest  # noqa: E402

from app import create_app  # noqa: E402
from app.db import mongo  # noqa: E402

PDF_TEXT = "Albatross retrieval evaluation notes."


def _make_pdf(text: str = PDF_TEXT) -> bytes:
    """Build a minimal single-page PDF without adding a PDF-writing dependency."""
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
    ]
    stream = ("BT /F1 12 Tf 20 120 Td (" + text + ") Tj ET").encode("latin-1")
    objects.append(
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"
    )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for index, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(str(index).encode() + b" 0 obj\n" + body + b"\nendobj\n")
    xref_position = out.tell()
    out.write(b"xref\n0 " + str(len(objects) + 1).encode() + b"\n")
    out.write(b"0000000000 65535 f \n")
    for offset in offsets:
        out.write(("%010d 00000 n \n" % offset).encode())
    out.write(
        b"trailer\n<< /Size " + str(len(objects) + 1).encode() + b" /Root 1 0 R >>\n"
        b"startxref\n" + str(xref_position).encode() + b"\n%%EOF\n"
    )
    return out.getvalue()


@pytest.fixture(scope="session")
def mongo_available() -> bool:
    reachable, _error = mongo.ping()
    if not reachable:
        pytest.skip("MongoDB is not reachable - start it or set MONGODB_URI", allow_module_level=True)
    return True


@pytest.fixture(scope="session")
def app(mongo_available):
    application = create_app()
    application.config["TESTING"] = True
    yield application
    client = mongo.get_client()
    client.drop_database(os.environ["MONGODB_DATABASE"])
    client.close()


@pytest.fixture()
def client(app):
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture()
def db(app):
    yield mongo.get_db()


@pytest.fixture()
def make_user(client):
    """Create a user and return (headers, user_payload, credentials)."""
    created: list[str] = []

    def _make(password: str = "Sup3r-Secret-Pass", name: str = "Test Navigator"):
        email = f"user-{uuid.uuid4().hex[:12]}@example.com"
        response = client.post(
            "/api/auth/signup",
            json={"name": name, "email": email, "password": password},
        )
        assert response.status_code == 201, response.get_json()
        body = response.get_json()["data"]
        created.append(body["token"])
        return (
            {"Authorization": f"Bearer {body['token']}"},
            body["user"],
            {"email": email, "password": password},
        )

    yield _make


@pytest.fixture()
def upload_document(client, make_user):
    """Upload a file through the real API and return the document payload."""

    def _upload(headers, *, filename="notes.txt", data=b"", content_type=None, **fields):
        payload = {
            "file": (io.BytesIO(data), filename, content_type or "application/octet-stream")
        }
        payload.update({key: str(value) for key, value in fields.items() if value is not None})
        response = client.post(
            "/api/documents/upload",
            data=payload,
            headers=headers,
            content_type="multipart/form-data",
        )
        return response

    return _upload


@pytest.fixture()
def wait_for_ready(client):
    def _wait(headers, document_id, timeout=15.0):
        deadline = time.time() + timeout
        last = None
        while time.time() < deadline:
            response = client.get(f"/api/documents/{document_id}/status", headers=headers)
            assert response.status_code == 200, response.get_json()
            last = response.get_json()["data"]
            if last["status"] in ("ready", "failed"):
                return last
            time.sleep(0.1)
        raise AssertionError(f"document never finished processing: {last}")

    return _wait