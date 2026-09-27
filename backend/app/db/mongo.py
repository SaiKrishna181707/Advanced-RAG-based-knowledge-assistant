"""
MongoDB connection management.

The application is multi-tenant: every repository call is scoped by ``user_id``.
MongoDB is the source of truth for all application data. The FAISS index is a
derived structure that can be rebuilt from the ``chunks`` collection at any time.
"""
from __future__ import annotations

import logging
import threading

from pymongo import ASCENDING, DESCENDING, TEXT, MongoClient
from pymongo.errors import (
    ConfigurationError,
    OperationFailure,
    PyMongoError,
    ServerSelectionTimeoutError,
)

from ..config import settings

logger = logging.getLogger(__name__)

_client: MongoClient | None = None
_client_lock = threading.Lock()
_last_error: str | None = None


def get_client() -> MongoClient:
    """Return a lazily created, process-wide MongoClient."""
    global _client, _last_error
    if _client is not None:
        return _client
    with _client_lock:
        if _client is not None:
            return _client
        if not settings.mongodb_uri:
            _last_error = "MONGODB_URI is not configured."
            raise ConfigurationError(_last_error)
        _client = MongoClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=settings.mongodb_timeout_ms,
            connectTimeoutMS=settings.mongodb_timeout_ms,
            appname="albatross-backend",
            tz_aware=True,
        )
        _last_error = None
        return _client


def get_db():
    return get_client()[settings.mongodb_database]


def ping() -> tuple[bool, str | None]:
    """Return ``(reachable, error_message)`` without raising."""
    global _last_error
    try:
        get_client().admin.command("ping")
        _last_error = None
        return True, None
    except (ConfigurationError, ServerSelectionTimeoutError, PyMongoError) as exc:
        _last_error = type(exc).__name__
        logger.warning("MongoDB ping failed", extra={"event": "mongo_ping_failed"})
        return False, _last_error
    except Exception as exc:  # pragma: no cover - defensive
        _last_error = type(exc).__name__
        logger.warning("MongoDB ping failed unexpectedly", extra={"event": "mongo_ping_failed"})
        return False, _last_error


def health() -> dict:
    reachable, error = ping()
    return {
        "configured": bool(settings.mongodb_uri),
        "database": settings.mongodb_database,
        "reachable": reachable,
        "error": error,
    }


def ensure_indexes() -> None:
    """
    Create the indexes the application relies on.

    Idempotent: safe to call on every boot. Failures are logged rather than raised
    so the API can still start (and report the problem through /api/health).
    """
    try:
        db = get_db()
    except Exception:
        logger.warning("Skipping index creation", extra={"event": "indexes_skipped"})
        return

    specs: list[tuple[str, list, dict]] = [
        ("users", [("email", ASCENDING)], {"unique": True, "name": "email_unique"}),
        ("users", [("subscription_plan", ASCENDING)], {"name": "plan"}),

        ("documents", [("user_id", ASCENDING), ("created_at", DESCENDING)], {"name": "user_recent"}),
        ("documents", [("user_id", ASCENDING), ("collection_id", ASCENDING)], {"name": "user_collection"}),
        # Partial: only documents that actually carry a checksum are deduplicated.
        # Without the filter, two documents with no checksum collide on null.
        (
            "documents",
            [("user_id", ASCENDING), ("sha256", ASCENDING)],
            {
                "unique": True,
                "name": "user_checksum_unique",
                "partialFilterExpression": {"sha256": {"$type": "string"}},
            },
        ),
        ("documents", [("user_id", ASCENDING), ("status", ASCENDING)], {"name": "user_status"}),

        ("chunks", [("user_id", ASCENDING), ("document_id", ASCENDING)], {"name": "user_document"}),
        ("chunks", [("user_id", ASCENDING), ("collection_id", ASCENDING)], {"name": "user_collection"}),
        ("chunks", [("document_id", ASCENDING), ("chunk_index", ASCENDING)], {"name": "document_order"}),

        ("collections", [("user_id", ASCENDING), ("name", ASCENDING)], {"unique": True, "name": "user_name_unique"}),
        ("collections", [("user_id", ASCENDING), ("created_at", DESCENDING)], {"name": "user_recent"}),

        ("conversations", [("user_id", ASCENDING), ("updated_at", DESCENDING)], {"name": "user_recent"}),

        ("messages", [("conversation_id", ASCENDING), ("created_at", ASCENDING)], {"name": "conversation_order"}),
        ("messages", [("user_id", ASCENDING), ("created_at", DESCENDING)], {"name": "user_recent"}),

        ("activity", [("user_id", ASCENDING), ("created_at", DESCENDING)], {"name": "user_recent"}),
        ("activity", [("user_id", ASCENDING), ("event", ASCENDING)], {"name": "user_event"}),

        ("feedback", [("user_id", ASCENDING), ("created_at", DESCENDING)], {"name": "user_recent"}),
        ("feedback", [("message_id", ASCENDING)], {"unique": True, "name": "message_unique"}),

        ("usage", [("user_id", ASCENDING), ("period", ASCENDING)], {"unique": True, "name": "user_period_unique"}),

        ("corpus_state", [("user_id", ASCENDING)], {"unique": True, "name": "user_unique"}),
    ]

    created = 0
    for collection, keys, options in specs:
        try:
            db[collection].create_index(keys, **options)
            created += 1
        except OperationFailure as exc:
            # An index with this name already exists but with different options
            # (a schema change between deployments). Recreate it so the running
            # database matches the code instead of silently keeping the old shape.
            # 85 = IndexOptionsConflict, 86 = IndexKeySpecsConflict: the name
            # exists but the definition differs from the one in this file.
            if exc.code in (85, 86) and options.get("name"):
                try:
                    db[collection].drop_index(options["name"])
                    db[collection].create_index(keys, **options)
                    created += 1
                    logger.info(
                        "Rebuilt index with new options",
                        extra={"event": "index_rebuilt", "index": options["name"]},
                    )
                    continue
                except PyMongoError as retry_exc:
                    exc = retry_exc
            logger.warning(
                "Index creation failed",
                extra={"event": "index_failed", "error_code": type(exc).__name__},
            )
        except PyMongoError as exc:
            logger.warning(
                "Index creation failed",
                extra={"event": "index_failed", "error_code": type(exc).__name__},
            )
    logger.info("MongoDB indexes ensured", extra={"event": "indexes_ensured", "result_count": created})
