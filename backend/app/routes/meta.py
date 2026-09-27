"""Public endpoints: health, plan catalogue."""
from __future__ import annotations

from flask import Blueprint

from ..config import settings
from ..db import mongo
from ..errors import ok
from ..rag import index_store
from ..services import llm_service
from ..services.plans import plan_catalogue

meta_bp = Blueprint("meta", __name__)


@meta_bp.route("/health", methods=["GET"])
def health():
    """Service status for humans, uptime checks and Render's health probe."""
    database = mongo.health()
    payload = {
        "status": "ok" if database["reachable"] else "degraded",
        "service": "albatross-api",
        "environment": settings.env,
        "checks": {
            "api": {"status": "ok"},
            "database": {
                "status": "ok" if database["reachable"] else "error",
                "engine": "mongodb",
                "database": database["database"],
                "configured": database["configured"],
                "error": database["error"],
            },
            "vector_index": _vector_status(),
            "llm": llm_service.health(),
        },
    }
    return ok(payload, status=200 if database["reachable"] else 503)


@meta_bp.route("/plans", methods=["GET"])
def plans():
    """Plan catalogue. Public so the landing page renders from one source of truth."""
    return ok(
        {
            "plans": plan_catalogue(),
            "billing": {
                "provider": None,
                "mode": "manual",
                "note": (
                    "Plans are product-level entitlements. No payment provider is "
                    "connected yet, so changing plan does not bill you."
                ),
            },
        }
    )


def _vector_status() -> dict:
    try:
        provider = index_store.get_provider()
        return {
            "status": "ok",
            "provider": provider.name,
            "model": provider.model or "default",
            "dimension": provider.dimension,
            "backend": index_store.backend_name(),
            "cached_indexes": index_store.cached_index_count(),
        }
    except Exception as exc:
        return {"status": "error", "error": type(exc).__name__}