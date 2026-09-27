"""
Structured JSON logging.

Every log line is a single JSON object carrying the request id, so Render's log
viewer can be searched by request. Secrets and document contents are never passed
to the logger by callers in this codebase.
"""
from __future__ import annotations

import json
import logging
import re
import sys
import time
import uuid
from contextvars import ContextVar

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

_EXTRA_FIELDS = (
    "event",
    "method",
    "path",
    "status",
    "duration_ms",
    "user_id",
    "document_id",
    "collection_id",
    "conversation_id",
    "retrieval_ms",
    "llm_ms",
    "chunk_count",
    "result_count",
    "error_code",
    "client_ip",
)

_SECRET_PATTERN = re.compile(
    r"(?i)(api[_-]?key|authorization|password|secret|token)\s*[:=]\s*\S+"
)


def scrub(text: str) -> str:
    """Best-effort removal of credential-shaped values from a log message."""
    return _SECRET_PATTERN.sub(r"\1=<redacted>", text)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "message": scrub(record.getMessage()),
            "request_id": request_id_var.get(),
        }
        for field in _EXTRA_FIELDS:
            value = getattr(record, field, None)
            if value is not None:
                payload[field] = scrub(value) if isinstance(value, str) else value
        if record.exc_info:
            payload["exception"] = scrub(self.formatException(record.exc_info))
        return json.dumps(payload, default=str)


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    for handler in list(root.handlers):
        root.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Werkzeug's dev server logger duplicates our access log lines.
    logging.getLogger("werkzeug").setLevel(logging.WARNING)


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


def log_event(logger: logging.Logger, level: int, message: str, **fields) -> None:
    """Emit a structured log line with arbitrary extra fields."""
    logger.log(level, message, extra=fields)
