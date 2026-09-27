"""
Background job execution for document processing.

Uploads return as soon as the file is safely stored and a document record exists;
extraction, chunking and embedding then run on a small in-process thread pool. The
pipeline is a single function (``ingest.process_document``), so replacing this
runner with a real queue (RQ, Celery, Cloud Tasks) later only means changing
``submit``.

Trade-off, stated plainly: in-process work is lost if the process restarts mid-job.
``reconcile_stuck_documents`` runs at boot and fails any document left in a
non-terminal state so the UI never shows a permanently "processing" row.
"""
from __future__ import annotations

import datetime as dt
import logging
import threading
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_executor: ThreadPoolExecutor | None = None
_lock = threading.Lock()
_MAX_WORKERS = 2


def _get_executor() -> ThreadPoolExecutor:
    global _executor
    if _executor is None:
        with _lock:
            if _executor is None:
                _executor = ThreadPoolExecutor(
                    max_workers=_MAX_WORKERS, thread_name_prefix="albatross-ingest"
                )
    return _executor


def submit(function, *args, **kwargs) -> None:
    """Queue ``function`` for background execution."""
    _get_executor().submit(_run, function, args, kwargs)


def _run(function, args, kwargs) -> None:
    from ..db.mongo import get_db

    try:
        function(get_db(), *args, **kwargs)
    except Exception:
        logger.exception("Background job failed", extra={"event": "job_failed"})


def shutdown(wait: bool = False) -> None:
    global _executor
    if _executor is not None:
        _executor.shutdown(wait=wait)
        _executor = None


def reconcile_stuck_documents(db) -> int:
    """Fail documents left mid-pipeline by a crash or restart."""
    result = db.documents.update_many(
        {"status": {"$in": ["uploading", "processing", "indexing"]}},
        {
            "$set": {
                "status": "failed",
                "error_message": "Processing was interrupted. Please upload the file again.",
                "updated_at": dt.datetime.now(dt.timezone.utc),
            }
        },
    )
    if result.modified_count:
        logger.warning(
            "Reconciled interrupted documents",
            extra={"event": "documents_reconciled", "result_count": result.modified_count},
        )
    return result.modified_count
