"""Account, preferences, usage and dashboard API (``/api/me``)."""
from __future__ import annotations

import datetime as dt
import logging

from flask import Blueprint, request

from ..config import settings
from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import conversations as conversations_repo
from ..db.repositories import documents as documents_repo
from ..db.repositories import users as users_repo
from ..db.serialize import docs_out
from ..deps import current_user
from ..errors import NotFoundError, ValidationError, ok
from ..security import require_auth
from ..serializers import conversation_payload
from ..services import llm_service, usage_service
from ..services.plans import PLAN_ORDER, get_plan
from ..validators import clamp_int, json_body, optional_string

logger = logging.getLogger(__name__)

account_bp = Blueprint("account", __name__)

RESPONSE_STYLES = tuple(llm_service.STYLE_INSTRUCTIONS.keys())
THEMES = ("light", "dark", "system")
EDITABLE_PREFERENCE_KEYS = (
    "response_style",
    "theme",
    "default_collection_id",
    "default_scope",
    "retrieval_count",
)

# How many days of question history the dashboard trend covers.
DASHBOARD_TREND_DAYS = 14


def _preferences(user: dict) -> dict:
    stored = user.get("preferences") or {}
    plan = usage_service.plan_for(user)
    return {
        "response_style": stored.get("response_style") or "concise",
        "theme": stored.get("theme") or "system",
        "default_collection_id": str(stored["default_collection_id"])
        if stored.get("default_collection_id")
        else None,
        "default_scope": stored.get("default_scope") or "all",
        "retrieval_count": int(stored.get("retrieval_count") or plan.retrieval_top_k),
    }


@account_bp.route("/overview", methods=["GET"])
@require_auth
def overview():
    """Personal dashboard payload: counts, recents, usage and quick actions."""
    db = get_db()
    user = current_user(db)
    user_id = user["_id"]

    totals = documents_repo.aggregate_totals(db, user_id)
    recent_documents = documents_repo.list_documents(db, user_id, limit=5)
    recent_conversations = conversations_repo.list_conversations(db, user_id, limit=5)

    return ok(
        {
            "user": users_repo.public_user(user),
            "counts": {
                "documents": int(totals.get("documents", 0)),
                "questions": db.messages.count_documents({"user_id": user_id, "role": "user"}),
                "collections": len(collections_repo.list_collections(db, user_id)),
                "conversations": conversations_repo.count_conversations(db, user_id),
            },
            # Real per-day counts so the dashboard can show a trend line instead
            # of a static number. Days with no questions are filled in client-side.
            "questions_by_day": conversations_repo.aggregate_messages_by_day(
                db, user_id, days=DASHBOARD_TREND_DAYS
            ),
            "usage": usage_service.usage_summary(db, user),
            "recent_documents": [
                {
                    "id": str(item["_id"]),
                    "name": item.get("original_name"),
                    "status": item.get("status"),
                    "page_count": item.get("page_count"),
                    "chunk_count": item.get("chunk_count", 0),
                    "collection_id": str(item["collection_id"]) if item.get("collection_id") else None,
                    "created_at": item.get("created_at"),
                }
                for item in recent_documents
            ],
            "recent_conversations": [conversation_payload(item) for item in recent_conversations],
            "activity": docs_out(activity_repo.list_recent(db, user_id, limit=8)),
        }
    )


@account_bp.route("/usage", methods=["GET"])
@require_auth
def usage():
    db = get_db()
    user = current_user(db)
    return ok({"usage": usage_service.usage_summary(db, user)})


@account_bp.route("/activity", methods=["GET"])
@require_auth
def activity():
    db = get_db()
    user = current_user(db)
    limit = clamp_int(request.args.get("limit"), default=30, minimum=1, maximum=100)
    return ok(
        {
            "activity": docs_out(activity_repo.list_recent(db, user["_id"], limit=limit)),
            "counts": activity_repo.count_by_event(db, user["_id"]),
        }
    )


@account_bp.route("/preferences", methods=["GET"])
@require_auth
def get_preferences():
    db = get_db()
    user = current_user(db)
    return ok({"preferences": _preferences(user), "options": _preference_options(db, user)})


@account_bp.route("/preferences", methods=["PATCH"])
@require_auth
def update_preferences():
    """Update AI, appearance and knowledge defaults for the signed-in user."""
    data = json_body()
    db = get_db()
    user = current_user(db)
    plan = usage_service.plan_for(user)
    current = _preferences(user)
    changes: dict = {}

    if "response_style" in data:
        style = optional_string(data, "response_style", max_length=20)
        if style not in RESPONSE_STYLES:
            raise ValidationError(
                "Response style must be one of: " + ", ".join(RESPONSE_STYLES) + "."
            )
        changes["response_style"] = style

    if "theme" in data:
        theme = optional_string(data, "theme", max_length=10)
        if theme not in THEMES:
            raise ValidationError("Theme must be light, dark or system.")
        changes["theme"] = theme

    if "default_collection_id" in data:
        raw = data.get("default_collection_id")
        if raw in (None, "", "all"):
            changes["default_collection_id"] = None
        else:
            collection = collections_repo.get_collection(db, user["_id"], raw)
            if not collection:
                raise NotFoundError("That collection does not exist.")
            changes["default_collection_id"] = collection["_id"]

    if "default_scope" in data:
        scope = optional_string(data, "default_scope", max_length=20)
        if scope not in ("all", "collection", "documents"):
            raise ValidationError("Default scope must be all, collection or documents.")
        changes["default_scope"] = scope

    if "retrieval_count" in data:
        requested = clamp_int(
            data.get("retrieval_count"), default=plan.retrieval_top_k, minimum=1, maximum=settings.max_top_k
        )
        if requested > plan.retrieval_top_k:
            raise ValidationError(
                f"Your {plan.name} plan retrieves up to {plan.retrieval_top_k} passages per question."
            )
        changes["retrieval_count"] = requested

    if not changes:
        raise ValidationError("Provide at least one preference to update.")

    updated = users_repo.update_preferences(
        db, user["_id"], preferences={**current, **changes}
    )
    return ok({"preferences": _preferences(updated or user)})


@account_bp.route("/plan", methods=["POST"])
@require_auth
def change_plan():
    """
    Switch subscription plan.

    This is a product-level entitlement change only. No payment provider is
    connected, so nothing is charged and no invoice is created. When Stripe is
    added this endpoint becomes the post-checkout webhook target.
    """
    data = json_body()
    plan_key = optional_string(data, "plan", max_length=20)
    if plan_key not in PLAN_ORDER:
        raise ValidationError("Choose one of: " + ", ".join(PLAN_ORDER) + ".")

    db = get_db()
    user = current_user(db)
    plan = get_plan(plan_key)
    updated = users_repo.update_subscription(db, user["_id"], plan=plan.key, status="active")
    activity_repo.record(
        db, user["_id"], "subscription.changed", metadata={"plan": plan.key, "billed": False}
    )
    return ok(
        {
            "user": users_repo.public_user(updated),
            "usage": usage_service.usage_summary(db, updated),
            "billing": {
                "provider": None,
                "charged": False,
                "note": "No payment was taken. Billing integration is not enabled yet.",
            },
        }
    )


def _preference_options(db, user) -> dict:
    plan = usage_service.plan_for(user)
    return {
        "response_styles": [
            {"value": key, "label": key.replace("_", " ").title()}
            for key in RESPONSE_STYLES
        ],
        "themes": list(THEMES),
        "max_retrieval_count": min(plan.retrieval_top_k, settings.max_top_k),
        "model": {
            "provider": "groq",
            "name": settings.groq_model,
            "configured": llm_service.llm_configured(),
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
        },
        "embedding": _embedding_option(),
    }


def _embedding_option() -> dict:
    from ..rag import index_store

    try:
        provider = index_store.get_provider()
        return {
            "provider": provider.name,
            "model": provider.model or "default",
            "dimension": provider.dimension,
            "vector_backend": index_store.backend_name(),
        }
    except Exception:
        return {"provider": settings.embedding_provider, "model": None, "dimension": None}


@account_bp.route("/export", methods=["GET"])
@require_auth
def export_account():
    """A JSON export of the account's own data. Useful before deleting an account."""
    db = get_db()
    user = current_user(db)
    documents = documents_repo.list_documents(db, user["_id"], limit=200)
    conversations = conversations_repo.list_conversations(db, user["_id"], limit=200)
    return ok(
        {
            "exported_at": dt.datetime.now(dt.timezone.utc),
            "user": users_repo.public_user(user),
            "documents": [
                {
                    "id": str(item["_id"]),
                    "name": item.get("original_name"),
                    "status": item.get("status"),
                    "page_count": item.get("page_count"),
                    "chunk_count": item.get("chunk_count", 0),
                    "created_at": item.get("created_at"),
                }
                for item in documents
            ],
            "conversations": [conversation_payload(item) for item in conversations],
            "usage": usage_service.usage_summary(db, user),
        }
    )
