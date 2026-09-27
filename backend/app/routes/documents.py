"""Document management API."""
from __future__ import annotations

import logging

from flask import Blueprint, request, send_file
from werkzeug.utils import secure_filename

from ..config import settings
from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import chunks as chunks_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import corpus as corpus_repo
from ..db.repositories import documents as documents_repo
from ..deps import current_user
from ..security import require_auth
from ..errors import ConflictError, NotFoundError, PayloadTooLargeError, ValidationError, ok
from ..rag import index_store, ingest
from ..ratelimit import limit
from ..services import usage_service
from ..services.storage import delete_stored_file, save_upload
from ..validators import clamp_int, json_body, optional_string, parse_object_id

logger = logging.getLogger(__name__)

documents_bp = Blueprint("documents", __name__)

MULTIPART_OVERHEAD_BYTES = 512 * 1024


def _document_payload(document: dict) -> dict:
    return {
        "id": str(document["_id"]),
        "name": document.get("original_name") or "Document",
        "file_size": document.get("file_size"),
        "mime_type": document.get("mime_type"),
        "extension": document.get("extension"),
        "page_count": document.get("page_count"),
        "location_unit": document.get("location_unit") or "page",
        "chunk_count": document.get("chunk_count", 0),
        "char_count": document.get("char_count"),
        "collection_id": str(document["collection_id"]) if document.get("collection_id") else None,
        "status": document.get("status", "processing"),
        "stage": document.get("stage"),
        "extraction_status": document.get("extraction_status"),
        "indexing_status": document.get("indexing_status"),
        "processing_time_ms": document.get("processing_time_ms"),
        "error_message": document.get("error_message"),
        "sha256": document.get("sha256"),
        "created_at": document.get("created_at"),
        "updated_at": document.get("updated_at"),
    }


@documents_bp.route("/upload", methods=["POST"])
@limit("upload", settings.rate_limit_upload)
@require_auth
def upload_document():
    """Store a file, create its record, and queue background processing."""
    if "file" not in request.files:
        raise ValidationError("No file was included in the request.")

    file_storage = request.files["file"]
    if not file_storage or not file_storage.filename:
        raise ValidationError("No file was selected.")

    declared_length = request.content_length or 0
    if declared_length and declared_length > settings.max_file_size_bytes + MULTIPART_OVERHEAD_BYTES:
        raise PayloadTooLargeError(
            f"Files must be smaller than {settings.max_file_size_mb} MB."
        )

    db = get_db()
    user = current_user(db)

    collection_id = request.form.get("collection_id") or None
    if collection_id:
        collection = collections_repo.get_collection(db, user["_id"], collection_id)
        if not collection:
            raise NotFoundError("That collection does not exist.")
        collection_id = collection["_id"]

    upload = save_upload(file_storage, user["_id"], declared_length=declared_length)

    try:
        usage_service.assert_can_upload(db, user, size_bytes=upload.size_bytes)

        duplicate = documents_repo.find_by_checksum(db, user["_id"], upload.sha256)
        if duplicate and duplicate.get("status") == "failed":
            # The previous attempt failed, so this is a retry of the same file. Drop
            # the failed record (and its partial chunks) to make room for the new one.
            documents_repo.delete_document(db, user["_id"], duplicate["_id"])
            chunks_repo.delete_for_document(db, user["_id"], duplicate["_id"])
            delete_stored_file(duplicate.get("stored_name") or "")
            corpus_repo.bump_revision(db, user["_id"])
            index_store.invalidate(user["_id"])
        elif duplicate:
            raise ConflictError(
                "Document already exists.",
                code="duplicate_document",
            )

        document = documents_repo.create_document(
            db,
            {
                "user_id": user["_id"],
                "original_name": upload.original_name,
                "stored_name": upload.stored_name,
                "file_size": upload.size_bytes,
                "mime_type": upload.mime_type,
                "extension": upload.extension,
                "sha256": upload.sha256,
                "collection_id": collection_id,
                "status": "processing",
                "stage": "queued",
                "page_count": None,
                "location_unit": "page",
                "chunk_count": 0,
                "char_count": 0,
                "extraction_status": "pending",
                "indexing_status": "pending",
                "processing_time_ms": None,
                "error_message": None,
            },
        )
    except Exception:
        delete_stored_file(upload.stored_name)
        raise

    usage_service.record_upload(db, user["_id"], size_bytes=upload.size_bytes)
    activity_repo.record(
        db,
        user["_id"],
        "document.uploaded",
        metadata={"document_id": str(document["_id"]), "name": upload.original_name},
    )
    logger.info(
        "Document uploaded",
        extra={
            "event": "document_uploaded",
            "user_id": str(user["_id"]),
            "document_id": str(document["_id"]),
        },
    )

    ingest.enqueue(db, document["_id"])
    refreshed = documents_repo.get_document(db, user["_id"], document["_id"]) or document
    return ok({"document": _document_payload(refreshed)}, status=202)


@documents_bp.route("/", methods=["GET"])
@require_auth
def list_documents():
    db = get_db()
    user = current_user(db)

    collection_id = request.args.get("collection_id") or None
    if collection_id:
        collection_id = parse_object_id(collection_id, field="collection_id")

    documents = documents_repo.list_documents(
        db,
        user["_id"],
        collection_id=collection_id,
        status=request.args.get("status") or None,
        search=(request.args.get("search") or "").strip() or None,
        limit=clamp_int(request.args.get("limit"), default=100, minimum=1, maximum=200),
        skip=clamp_int(request.args.get("offset"), default=0, minimum=0, maximum=100000),
    )
    total = documents_repo.count_documents(db, user["_id"], collection_id=collection_id)
    return ok({"documents": [_document_payload(item) for item in documents], "total": total})


@documents_bp.route("/<document_id>", methods=["GET"])
@require_auth
def get_document(document_id: str):
    db = get_db()
    user = current_user(db)
    document = documents_repo.get_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")
    return ok({"document": _document_payload(document)})


@documents_bp.route("/<document_id>/status", methods=["GET"])
@require_auth
def document_status(document_id: str):
    db = get_db()
    user = current_user(db)
    document = documents_repo.get_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")
    return ok(
        {
            "id": str(document["_id"]),
            "status": document.get("status"),
            "stage": document.get("stage"),
            "chunk_count": document.get("chunk_count", 0),
            "page_count": document.get("page_count"),
            "processing_time_ms": document.get("processing_time_ms"),
            "error_message": document.get("error_message"),
        }
    )


@documents_bp.route("/<document_id>/content", methods=["GET"])
@require_auth
def document_content(document_id: str):
    """Reconstructed extracted text, grouped by page or section, for the viewer."""
    db = get_db()
    user = current_user(db)
    document = documents_repo.get_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")

    chunks = sorted(
        chunks_repo.list_for_document(db, user["_id"], document_id, limit=1000),
        key=lambda item: item.get("chunk_index", 0),
    )
    pages: list[dict] = []
    buffer: list[str] = []
    current_page = None
    started = False
    total = 0

    def flush(page_value) -> None:
        if buffer:
            pages.append(
                {
                    "page": page_value,
                    "text": "\n\n".join(buffer)[: settings.max_preview_chars],
                }
            )

    for chunk in chunks:
        page = chunk.get("page_number")
        if started and page != current_page:
            flush(current_page)
            buffer = []
        current_page = page
        started = True
        content = chunk.get("content") or ""
        buffer.append(content)
        total += len(content)
    flush(current_page)

    return ok(
        {
            "document": _document_payload(document),
            "location_unit": document.get("location_unit") or "page",
            "pages": pages,
            "chunk_count": len(chunks),
            "char_count": total,
        }
    )


@documents_bp.route("/<document_id>/chunks", methods=["GET"])
@require_auth
def document_chunks(document_id: str):
    db = get_db()
    user = current_user(db)
    document = documents_repo.get_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")

    chunks = chunks_repo.list_for_document(db, user["_id"], document_id, limit=500)
    return ok(
        {
            "location_unit": document.get("location_unit") or "page",
            "chunks": [
                {
                    "id": str(chunk["_id"]),
                    "chunk_index": chunk.get("chunk_index"),
                    "page_number": chunk.get("page_number"),
                    "char_count": chunk.get("char_count"),
                    "content": chunk.get("content"),
                }
                for chunk in chunks
            ],
        }
    )


@documents_bp.route("/<document_id>/file", methods=["GET"])
@require_auth
def document_file(document_id: str):
    """Stream the stored original, with ownership enforced and sniffing disabled."""
    from ..services.storage import resolve_stored_path

    db = get_db()
    user = current_user(db)
    document = documents_repo.get_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")

    path = resolve_stored_path(document.get("stored_name") or "")
    if path is None or not path.exists():
        raise NotFoundError("The stored file is no longer available.")

    extension = (document.get("extension") or "").lower()
    inline = extension == "pdf"
    content_type = {
        "pdf": "application/pdf",
        "txt": "text/plain; charset=utf-8",
        "md": "text/plain; charset=utf-8",
        "csv": "text/plain; charset=utf-8",
    }.get(extension, "application/octet-stream")

    response = send_file(
        path,
        mimetype=content_type,
        as_attachment=not inline,
        download_name=secure_filename(document.get("original_name") or "document"),
        conditional=True,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "default-src 'none'; object-src 'none'"
    return response


@documents_bp.route("/<document_id>", methods=["PATCH"])
@require_auth
def update_document(document_id: str):
    db = get_db()
    user = current_user(db)
    document = documents_repo.get_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")

    data = json_body()
    fields: dict = {}

    name = optional_string(data, "name", max_length=200)
    if name is not None:
        fields["original_name"] = name

    if "collection_id" in data:
        raw_collection = data.get("collection_id")
        if raw_collection in (None, ""):
            fields["collection_id"] = None
        else:
            collection = collections_repo.get_collection(db, user["_id"], raw_collection)
            if not collection:
                raise NotFoundError("That collection does not exist.")
            fields["collection_id"] = collection["_id"]

    if not fields:
        raise ValidationError("Nothing to update.")

    updated = documents_repo.update_document(db, user["_id"], document_id, fields=fields)
    _sync_chunk_metadata(db, user["_id"], document_id, updated)
    corpus_repo.bump_revision(db, user["_id"])
    index_store.invalidate(user["_id"])

    return ok({"document": _document_payload(updated)})


@documents_bp.route("/<document_id>", methods=["DELETE"])
@require_auth
def delete_document(document_id: str):
    db = get_db()
    user = current_user(db)
    document = documents_repo.delete_document(db, user["_id"], document_id)
    if not document:
        raise NotFoundError("That document was not found.")

    chunks_repo.delete_for_document(db, user["_id"], document_id)
    delete_stored_file(document.get("stored_name") or "")
    corpus_repo.bump_revision(db, user["_id"])
    index_store.invalidate(user["_id"])
    usage_service.record_document_removed(db, user["_id"], size_bytes=document.get("file_size") or 0)

    activity_repo.record(
        db,
        user["_id"],
        "document.deleted",
        metadata={"document_id": str(document["_id"]), "name": document.get("original_name")},
    )
    return ok({"message": f"'{document.get('original_name')}' has been deleted."})


def _sync_chunk_metadata(db, user_id, document_id, document: dict) -> None:
    """Keep denormalised citation fields on chunks aligned with the document."""
    from bson import ObjectId

    db.chunks.update_many(
        {"user_id": ObjectId(str(user_id)), "document_id": ObjectId(str(document_id))},
        {
            "$set": {
                "document_name": document.get("original_name") or "Document",
                "collection_id": document.get("collection_id"),
                "location_unit": document.get("location_unit") or "page",
            }
        },
    )
