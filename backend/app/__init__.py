"""
app/__init__.py  -  ALBATROSS Flask application factory.

What this file does:
  - builds the Flask app and resolves configuration from app.config
  - configures structured logging and per-request ids
  - registers CORS with an explicit origin allow-list (never "*" in production)
  - registers every API blueprint through app.routes.register_blueprints
  - installs the consistent {"success", "data", "error"} error handlers
  - ensures MongoDB indexes exist and re-queues documents stuck mid-processing
  - adds baseline security headers

Why a factory?  Tests build throwaway apps with different environment variables
without touching module-level global state.
"""
from __future__ import annotations

import logging
import time

from flask import Flask, g, jsonify, request
from flask_cors import CORS

from .config import settings
from .db import get_db, mongo
from .errors import register_error_handlers
from .logging_config import configure_logging, new_request_id, request_id_var
from .routes import register_blueprints
from .services import job_runner

logger = logging.getLogger(__name__)


def create_app() -> Flask:
    configure_logging(settings.log_level)

    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.secret_key or "albatross-dev-secret"
    app.config["MAX_CONTENT_LENGTH"] = settings.max_file_size_mb * 1024 * 1024
    app.config["JSON_SORT_KEYS"] = False

    _configure_cors(app)
    register_error_handlers(app)
    register_blueprints(app)
    _register_request_logging(app)
    _register_security_headers(app)

    with app.app_context():
        _prepare_database()

    _warn_about_configuration()
    _register_root(app)
    return app


def _configure_cors(app: Flask) -> None:
    origins = list(settings.cors_origins)
    if settings.is_production:
        origins = [origin for origin in origins if origin != "*"]
    if not settings.is_production and "*" not in origins:
        origins.append("*")

    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        expose_headers=["X-Request-Id"],
        max_age=600,
    )


def _register_request_logging(app: Flask) -> None:
    @app.before_request
    def _start_timer():
        g.request_started = time.perf_counter()
        g.request_id = request.headers.get("X-Request-Id") or new_request_id()
        request_id_var.set(g.request_id)

    @app.after_request
    def _log_request(response):
        started = getattr(g, "request_started", None)
        duration_ms = round((time.perf_counter() - started) * 1000, 1) if started else None
        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers["X-Request-Id"] = request_id

        # Health probes and CORS preflights are noise; log everything else.
        if request.path != "/api/health" and request.method != "OPTIONS":
            logger.info(
                "%s %s -> %s",
                request.method,
                request.path,
                response.status_code,
                extra={
                    "event": "request",
                    "method": request.method,
                    "path": request.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
        request_id_var.set(None)
        return response


def _register_security_headers(app: Flask) -> None:
    @app.after_request
    def _headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


def _prepare_database() -> None:
    """Create indexes and recover work interrupted by a restart.

    A cold or unreachable database must not stop the process from booting: the
    health endpoint reports the degraded state instead.
    """
    try:
        mongo.ensure_indexes()
    except Exception:
        logger.exception(
            "Could not ensure MongoDB indexes at startup",
            extra={"event": "index_setup_failed"},
        )
        return

    try:
        recovered = job_runner.reconcile_stuck_documents(get_db())
        if recovered:
            logger.warning(
                "Re-queued %s document(s) interrupted mid-processing",
                recovered,
                extra={"event": "documents_requeued", "count": recovered},
            )
    except Exception:
        logger.exception(
            "Could not reconcile in-flight documents", extra={"event": "reconcile_failed"}
        )


def _warn_about_configuration() -> None:
    fatal = settings.production_config_errors()
    if fatal:
        # Refuse to serve rather than run a production deployment against a
        # loopback database or without usable secrets.
        for problem in fatal:
            logger.critical(problem, extra={"event": "configuration_error"})
        raise RuntimeError(
            "ALBATROSS cannot start with this production configuration: "
            + " ".join(fatal)
        )

    for problem in settings.startup_problems():
        logger.warning(problem, extra={"event": "configuration_warning"})


def _register_root(app: Flask) -> None:
    @app.route("/")
    def root():
        """Friendly root response so the deployed API is not a bare 404."""
        return jsonify(
            {
                "service": "albatross-api",
                "tagline": "Navigate your knowledge.",
                "docs": "/api/health",
            }
        )
