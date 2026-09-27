"""Document upload, validation, processing states and lifecycle."""
from __future__ import annotations

import io

from tests.conftest import _make_pdf


def _upload(client, headers, *, filename, data, content_type=None, **fields):
    payload = {"file": (io.BytesIO(data), filename, content_type or "application/octet-stream")}
    payload.update({key: str(value) for key, value in fields.items() if value is not None})
    return client.post(
        "/api/documents/upload", data=payload, headers=headers, content_type="multipart/form-data"
    )


def test_txt_upload_reaches_ready_with_chunks(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    text = (
        "Albatross retrieval methodology. " * 40
    )
    response = _upload(client, headers, filename="methodology.txt", data=text.encode())
    assert response.status_code == 202
    document = response.get_json()["data"]["document"]
    assert document["status"] in ("processing", "indexing", "ready")
    assert document["sha256"], "a checksum must be recorded for duplicate detection"
    assert document["file_size"] == len(text.encode())
    assert document["extension"] == "txt"
    assert document["location_unit"] == "part"

    final = wait_for_ready(headers, document["id"])
    assert final["status"] == "ready", final
    assert final["chunk_count"] > 0
    assert final["processing_time_ms"] is not None


def test_pdf_upload_records_page_count_and_page_numbers(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    response = _upload(
        client, headers, filename="paper.pdf", data=_make_pdf("Retrieval evaluation on page one."),
        content_type="application/pdf",
    )
    assert response.status_code == 202
    document_id = response.get_json()["data"]["document"]["id"]
    final = wait_for_ready(headers, document_id)
    assert final["status"] == "ready", final
    assert final["page_count"] == 1

    chunks = client.get(f"/api/documents/{document_id}/chunks", headers=headers).get_json()["data"]
    assert chunks["location_unit"] == "page"
    assert chunks["chunks"][0]["page_number"] == 1
    assert "Retrieval evaluation" in chunks["chunks"][0]["content"]


def test_markdown_and_csv_uploads_are_supported(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()

    markdown = _upload(
        client, headers, filename="notes.md",
        data=b"# Heading\n\nAlbatross markdown body with enough characters to chunk.",
    )
    assert markdown.status_code == 202
    assert wait_for_ready(headers, markdown.get_json()["data"]["document"]["id"])["status"] == "ready"

    csv_file = _upload(
        client, headers, filename="data.csv",
        data=b"name,value\nalbatross,1\nretrieval,2\nknowledge,3\n",
        content_type="text/csv",
    )
    assert csv_file.status_code == 202
    assert wait_for_ready(headers, csv_file.get_json()["data"]["document"]["id"])["status"] == "ready"


def test_unsupported_extension_is_rejected(client, make_user):
    headers, _user, _credentials = make_user()
    response = _upload(client, headers, filename="malware.exe", data=b"MZ\x90\x00binary")
    # 415 Unsupported Media Type: the request is well-formed, the file type is not.
    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_media_type"
    assert "supported" in response.get_json()["error"]["message"].lower()


def test_renamed_executable_disguised_as_pdf_is_rejected(client, make_user):
    headers, _user, _credentials = make_user()
    response = _upload(
        client, headers, filename="invoice.pdf", data=b"MZ\x90\x00this is not a pdf at all"
    )
    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_media_type"
    assert "does not look like" in response.get_json()["error"]["message"]


def test_oversized_upload_is_rejected(client, make_user, app):
    headers, _user, _credentials = make_user()
    original = app.config["MAX_CONTENT_LENGTH"]
    app.config["MAX_CONTENT_LENGTH"] = 2048
    try:
        response = _upload(client, headers, filename="big.txt", data=b"a" * 20000)
        assert response.status_code == 413
    finally:
        app.config["MAX_CONTENT_LENGTH"] = original


def test_duplicate_upload_is_detected_by_checksum(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    body = b"Identical content used twice for duplicate detection."

    first = _upload(client, headers, filename="original.txt", data=body)
    assert first.status_code == 202
    wait_for_ready(headers, first.get_json()["data"]["document"]["id"])

    again = _upload(client, headers, filename="copy.txt", data=body)
    assert again.status_code == 409
    assert again.get_json()["error"]["message"] == "Document already exists."

    # A different user uploading the same bytes is not a duplicate.
    other_headers, _other_user, _other_credentials = make_user()
    allowed = _upload(client, other_headers, filename="original.txt", data=body)
    assert allowed.status_code == 202


def test_failed_upload_can_be_retried_with_the_same_bytes(client, make_user, db):
    """A failed document must not permanently block re-uploading the same file."""
    headers, user, _credentials = make_user()
    body = b"Content whose first attempt is forced to fail."

    first = _upload(client, headers, filename="retry.txt", data=body)
    document_id = first.get_json()["data"]["document"]["id"]
    from bson import ObjectId

    db.documents.update_one(
        {"_id": ObjectId(document_id)}, {"$set": {"status": "failed"}}
    )

    retry = _upload(client, headers, filename="retry.txt", data=body)
    assert retry.status_code == 202


def test_list_search_and_filters(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    first = _upload(client, headers, filename="alpha-report.txt", data=b"Alpha report body text.")
    wait_for_ready(headers, first.get_json()["data"]["document"]["id"])
    second = _upload(client, headers, filename="beta-notes.txt", data=b"Beta notes body text.")
    wait_for_ready(headers, second.get_json()["data"]["document"]["id"])

    listing = client.get("/api/documents/", headers=headers).get_json()["data"]
    assert listing["total"] == 2
    assert len(listing["documents"]) == 2

    filtered = client.get("/api/documents/?search=alpha", headers=headers).get_json()["data"]
    assert [item["name"] for item in filtered["documents"]] == ["alpha-report.txt"]

    ready_only = client.get("/api/documents/?status=ready", headers=headers).get_json()["data"]
    assert ready_only["total"] == 2

    limited = client.get("/api/documents/?limit=1", headers=headers).get_json()["data"]
    assert len(limited["documents"]) == 1 and limited["total"] == 2


def test_rename_and_move_between_collections(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    uploaded = _upload(client, headers, filename="movable.txt", data=b"Movable document body.")
    document_id = uploaded.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)

    collection = client.post(
        "/api/collections/", json={"name": "Filing Cabinet"}, headers=headers
    ).get_json()["data"]["collection"]

    renamed = client.patch(
        f"/api/documents/{document_id}",
        json={"name": "renamed.txt", "collection_id": collection["id"]},
        headers=headers,
    )
    assert renamed.status_code == 200
    updated = renamed.get_json()["data"]["document"]
    assert updated["name"] == "renamed.txt"
    assert updated["collection_id"] == collection["id"]

    chips = client.get(
        f"/api/documents/?collection_id={collection['id']}", headers=headers
    ).get_json()["data"]
    assert chips["total"] == 1

    unfiled = client.patch(
        f"/api/documents/{document_id}", json={"collection_id": None}, headers=headers
    )
    assert unfiled.status_code == 200
    assert unfiled.get_json()["data"]["document"]["collection_id"] is None


def test_delete_removes_document_chunks_and_file(client, make_user, db, wait_for_ready):
    headers, _user, _credentials = make_user()
    uploaded = _upload(
        client, headers, filename="temporary.txt",
        data=b"Temporary document body long enough to be chunked and indexed.",
    )
    document_id = uploaded.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)

    from bson import ObjectId

    assert db.chunks.count_documents({"document_id": ObjectId(document_id)}) > 0

    response = client.delete(f"/api/documents/{document_id}", headers=headers)
    assert response.status_code == 200
    assert client.get(f"/api/documents/{document_id}", headers=headers).status_code == 404
    assert db.chunks.count_documents({"document_id": ObjectId(document_id)}) == 0
    assert client.get(f"/api/documents/{document_id}/file", headers=headers).status_code == 404

    # Deleting again is a clean 404, not a crash.
    assert client.delete(f"/api/documents/{document_id}", headers=headers).status_code == 404


def test_document_content_viewer_groups_by_page(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    uploaded = _upload(
        client,
        headers,
        filename="viewer.pdf",
        data=_make_pdf("Viewer page content with enough text to survive chunking."),
        content_type="application/pdf",
    )
    document_id = uploaded.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, document_id)

    content = client.get(f"/api/documents/{document_id}/content", headers=headers).get_json()["data"]
    assert content["location_unit"] == "page"
    assert content["pages"][0]["page"] == 1
    assert "Viewer page content" in content["pages"][0]["text"]
    assert content["char_count"] > 0


def test_file_endpoint_streams_pdf_inline_and_forces_download_for_text(client, make_user, wait_for_ready):
    headers, _user, _credentials = make_user()
    pdf = _upload(
        client, headers, filename="inline.pdf", data=_make_pdf("Inline PDF."),
        content_type="application/pdf",
    )
    pdf_id = pdf.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, pdf_id)

    response = client.get(f"/api/documents/{pdf_id}/file", headers=headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert "attachment" not in response.headers.get("Content-Disposition", "")

    text = _upload(client, headers, filename="download.txt", data=b"Downloadable text body.")
    text_id = text.get_json()["data"]["document"]["id"]
    wait_for_ready(headers, text_id)
    download = client.get(f"/api/documents/{text_id}/file", headers=headers)
    assert "attachment" in download.headers.get("Content-Disposition", "")


def test_filename_is_sanitised_but_display_name_preserved(client, make_user, db, wait_for_ready):
    headers, _user, _credentials = make_user()
    response = _upload(
        client, headers, filename="../../etc/passwd notes.txt", data=b"Path traversal attempt body."
    )
    assert response.status_code == 202
    document = response.get_json()["data"]["document"]
    assert ".." not in document["name"]
    assert "/" not in document["name"]

    stored = db.documents.find_one({"original_name": document["name"]})
    assert stored is not None
    assert ".." not in stored["stored_name"]
    assert not stored["stored_name"].startswith("/")
    # The only separator allowed is the single per-user directory prefix.
    assert stored["stored_name"].count("/") == 1
    assert "\\" not in stored["stored_name"]
    # And the path must resolve back inside the uploads root.
    from app.services.storage import resolve_stored_path, uploads_root

    resolved = resolve_stored_path(stored["stored_name"])
    assert resolved is not None
    assert str(resolved).startswith(str(uploads_root().resolve()))