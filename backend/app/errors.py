"""Consistent API response envelopes and error handling."""
from __future__ import annotations

import logging

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException

from .logging_config import log_event, request_id_var

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Base class for errors that map onto an HTTP response."""

    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, status_code: int | None = None, code: str | None = None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        if code is not None:
            self.code = code


class ValidationError(ApiError):
    status_code = 422
    code = "validation_error"


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"


class ConflictError(ApiError):
    status_code = 409
    code = "conflict"


class AuthError(ApiError):
    status_code = 401
    code = "unauthenticated"


class ForbiddenError(ApiError):
    status_code = 403
    code = "forbidden"


class PayloadTooLargeError(ApiError):
    status_code = 413
    code = "payload_too_large"


class UnsupportedMediaTypeError(ApiError):
    """The upload's type or contents are not something we can process."""

    status_code = 415
    code = "unsupported_media_type"


class RateLimitError(ApiError):
    status_code = 429
    code = "rate_limited"


class UpstreamError(ApiError):
    status_code = 502
    code = "upstream_error"


class UsageLimitError(ApiError):
    status_code = 402
    code = "usage_limit_reached"


def ok(data=None, *, status: int = 200, **meta):
    """Success envelope: {"success": true, "data": ..., "error": null}."""
    body: dict[str, object] = {
        "success": True,
        "data": {} if data is None else data,
        "error": None,
    }
    if meta:
        body["meta"] = meta
    return jsonify(body), status


def fail(message: str, *, status: int = 400, code: str = "error"):
    """Failure envelope. ``message`` must already be safe for end users."""
    return (
        jsonify(
            {
                "success": False,
                "data": None,
                "error": {"code": code, "message": message},
            }
        ),
        status,
    )


_HTTP_MESSAGES = {
    400: "The request could not be understood.",
    404: "The requested resource was not found.",
    405: "That method is not allowed for this endpoint.",
    413: "The uploaded file is larger than the allowed limit.",
    415: "That file type is not supported.",
    429: "Too many requests. Please slow down and try again shortly.",
}


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def _handle_api_error(exc: ApiError):
        log_event(
            logger,
            logging.WARNING,
            exc.message,
            event="api_error",
            path=request.path,
            status=exc.status_code,
            error_code=exc.code,
        )
        return fail(exc.message, status=exc.status_code, code=exc.code)

    @app.errorhandler(HTTPException)
    def _handle_http_error(exc: HTTPException):
        status = exc.code or 500
        message = _HTTP_MESSAGES.get(status, exc.description or "Request failed.")
        return fail(message, status=status, code=exc.name.lower().replace(" ", "_"))

    @app.errorhandler(Exception)
    def _handle_unexpected(exc: Exception):
        # Technical detail goes to the logs; the client gets a safe message.
        logger.exception(
            "Unhandled exception",
            extra={"event": "unhandled_exception", "path": request.path},
        )
        return fail(
            "Something went wrong on our side. Please try again.",
            status=500,
            code="internal_error",
        )
