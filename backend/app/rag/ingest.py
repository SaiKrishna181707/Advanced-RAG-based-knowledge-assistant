"""
Document ingestion pipeline.

    upload -> validation -> file storage -> text extraction -> metadata extraction
           -> chunking -> embedding/indexing -> MongoDB metadata -> ready

Visible states written to the document record: ``processing`` -> ``indexing`` ->
``ready`` (or ``failed``). The HTTP request returns as soon as the file is stored
and the record exists; the remaining stages run through ``services.job_runner``.
"""
from __future__ import annotations

import logging
import time

from ..config import settings
from ..db.repositories import activity as activity_repo
from ..db.repositories import chunks as chunks_repo
from ..db.repositories import corpus as corpus_repo
from ..db.repositories import documents as documents_repo
from ..services import job_runner, storage
from . import index_store
from .chunker import chunk_pages
from .extractor import DocumentExtractionError, extract_document

logger = logging.getLogger(__name__)

# Above this corpus size the index is built lazily on first search instead of
# eagerly during upload, so uploads stay responsive as a knowledge base grows.
MAX_EAGER_INDEX_CHUNKS = 5000


class IngestionError(Exception):
    """Raised when a document cannot be processed. Message is safe for end users."""


def enqueue(db, document_id) -> None:
    """Hand the document to the background runner (or process it inline)."""
    mode = settings.processing_mode
    if mode == "sync":
        process_document(db, document_id)
    else:
        job_runner.submit(process_document, document_id)


def process_document(db, document_id) -> None:
    """Run the extraction/chunking/indexing pipeline for one document."""
    document = documents_repo.get_by_id(db, document_id)
    if not document:
        logger.warning("Ingest skipped, document missing", extra={"event": "ingest_missing"})
        return

    user_id = document["user_id"]
    started = time.perf_counter()
    _set_stage(db, document_id, status="processing", stage="extracting")

    try:
        path = storage.resolve_stored_path(document.get("stored_name") or "")
        if path is None or not path.exists():
            raise IngestionError("The stored file could not be found. Please upload it again.")

        extracted = extract_document(path, document.get("extension") or "")
        chunks = chunk_pages(extracted["pages"])
        if not chunks:
            raise IngestionError(
                "We could not find readable text in this document. "
                "If it is a scanned PDF, try a text-based version."
            )

        _set_stage(
            db,
            document_id,
            status="indexing",
            stage="indexing",
            page_count=extracted["page_count"],
            location_unit=extracted.get("location_unit", "page"),
            extraction_status="ok",
            char_count=extracted.get("total_chars", 0),
        )

        stored_chunks = _store_chunks(db, document, chunks)
        corpus_repo.bump_revision(db, user_id)
        index_store.invalidate(user_id)
        warmed = _warm_index(db, user_id)

        elapsed_ms = round((time.perf_counter() - started) * 1000)
        documents_repo.update_document(
            db,
            user_id,
            document_id,
            fields={
                "status": "ready",
                "stage": "ready",
                "chunk_count": stored_chunks,
                "indexing_status": "ok",
                "processing_time_ms": elapsed_ms,
                "error_message": None,
            },
        )
        activity_repo.record(
            db,
            user_id,
            "document.processed",
            metadata={
                "document_id": str(document_id),
                "name": document.get("original_name"),
                "chunk_count": stored_chunks,
                "processing_time_ms": elapsed_ms,
            },
        )
        logger.info(
            "Document processed",
            extra={
                "event": "document_processed",
                "user_id": str(user_id),
                "document_id": str(document_id),
                "chunk_count": stored_chunks,
                "duration_ms": elapsed_ms,
            },
        )
        if not warmed:
            logger.info(
                "Index deferred until first search",
                extra={"event": "index_deferred", "chunk_count": stored_chunks},
            )
    except (IngestionError, DocumentExtractionError) as exc:
        _fail(db, document, document_id, str(exc), user_id)
    except Exception:
        logger.exception(
            "Document processing failed",
            extra={"event": "document_processing_failed", "document_id": str(document_id)},
        )
        _fail(
            db,
            document,
            document_id,
            "We could not process this document. Please try uploading it again.",
            user_id,
        )


def _store_chunks(db, document, chunks: list[dict]) -> int:
    user_id = document["user_id"]
    collection_id = document.get("collection_id")
    document_name = document.get("original_name") or "Document"
    location_unit = document.get("location_unit") or "page"

    payloads = [
        {
            "user_id": user_id,
            "document_id": document["_id"],
            "collection_id": collection_id,
            "document_name": document_name,
            "content": chunk["content"],
            "page_number": chunk.get("page_number"),
            "location_unit": location_unit,
            "chunk_index": chunk.get("chunk_index", position),
            "char_count": chunk.get("char_count", len(chunk["content"])),
        }
        for position, chunk in enumerate(chunks)
    ]
    return chunks_repo.insert_chunks(db, payloads)


def _warm_index(db, user_id) -> bool:
    """Pre-build the search index while the corpus is still small."""
    try:
        total = chunks_repo.count_for_user(db, user_id)
        if total > MAX_EAGER_INDEX_CHUNKS:
            return False
        index_store.get_index(db, user_id)
        return True
    except Exception:
        logger.warning("Index warm-up skipped", extra={"event": "index_warm_skipped"})
        return False


def _set_stage(db, document_id, *, status: str, stage: str, **fields) -> None:
    document = documents_repo.get_by_id(db, document_id)
    if not document:
        return
    payload = {"status": status, "stage": stage}
    payload.update(fields)
    documents_repo.update_document(db, document["user_id"], document_id, fields=payload)


def _fail(db, document, document_id, message: str, user_id) -> None:
    documents_repo.update_document(
        db,
        user_id,
        document_id,
        fields={"status": "failed", "stage": "failed", "error_message": message},
    )
    activity_repo.record(
        db,
        user_id,
        "document.failed",
        metadata={"document_id": str(document_id), "name": document.get("original_name")},
    )
