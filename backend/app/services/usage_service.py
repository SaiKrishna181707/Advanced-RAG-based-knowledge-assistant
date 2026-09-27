"""
Subscription-plan enforcement and usage metering.

Limits are read from app.services.plans and never hardcoded at the call site.
Totals are derived from authoritative collections (documents); the usage
collection holds per-month counters.
"""
from __future__ import annotations

from ..db.repositories import documents as documents_repo
from ..db.repositories import usage as usage_repo
from ..errors import UsageLimitError
from .plans import Plan, get_plan


def plan_for(user: dict) -> Plan:
    return get_plan((user or {}).get("subscription_plan"))


def usage_summary(db, user: dict) -> dict:
    plan = plan_for(user)
    totals = documents_repo.aggregate_totals(db, user["_id"])
    period_usage = usage_repo.get_usage(db, user["_id"])

    documents_used = int(totals.get("documents", 0))
    storage_used = int(totals.get("storage_bytes", 0))
    questions_used = int(period_usage.get("questions_asked", 0))

    return {
        "plan": plan.key,
        "plan_name": plan.name,
        "subscription_status": user.get("subscription_status", "active"),
        "period": period_usage.get("period"),
        "documents": {
            "used": documents_used,
            "limit": plan.document_limit,
            "label": f"{documents_used} / {plan.document_limit:,}",
            "percent": _percent(documents_used, plan.document_limit),
        },
        "storage": {
            "used_bytes": storage_used,
            "limit_bytes": plan.storage_limit_bytes,
            "used_label": format_bytes(storage_used),
            "limit_label": format_bytes(plan.storage_limit_bytes),
            "label": f"{format_bytes(storage_used)} / {format_bytes(plan.storage_limit_bytes)}",
            "percent": _percent(storage_used, plan.storage_limit_bytes),
        },
        "questions": {
            "used": questions_used,
            "limit": plan.monthly_questions,
            "label": f"{questions_used} / {plan.monthly_questions:,}",
            "percent": _percent(questions_used, plan.monthly_questions),
        },
        "this_month": {
            "documents_uploaded": int(period_usage.get("documents_uploaded", 0)),
            "storage_bytes": int(period_usage.get("storage_bytes", 0)),
            "processing_operations": int(period_usage.get("processing_operations", 0)),
        },
        "limits": {
            "max_file_size_mb": plan.max_file_size_mb,
            "retrieval_top_k": plan.retrieval_top_k,
            "history_turns": plan.history_turns,
        },
    }


def assert_can_upload(db, user: dict, *, size_bytes: int) -> Plan:
    plan = plan_for(user)
    totals = documents_repo.aggregate_totals(db, user["_id"])

    documents_used = int(totals.get("documents", 0))
    if documents_used >= plan.document_limit:
        raise UsageLimitError(
            f"Your {plan.name} plan allows {plan.document_limit:,} documents. "
            "Delete a document or upgrade to add more."
        )

    storage_used = int(totals.get("storage_bytes", 0))
    if storage_used + size_bytes > plan.storage_limit_bytes:
        raise UsageLimitError(
            f"Your {plan.name} plan includes {format_bytes(plan.storage_limit_bytes)} "
            "of storage. Delete a document or upgrade to upload more."
        )

    if size_bytes > plan.max_file_size_mb * 1024 * 1024:
        raise UsageLimitError(
            f"Your {plan.name} plan allows files up to {plan.max_file_size_mb} MB."
        )
    return plan


def assert_can_ask(db, user: dict) -> Plan:
    plan = plan_for(user)
    used = int(usage_repo.get_usage(db, user["_id"]).get("questions_asked", 0))
    if used >= plan.monthly_questions:
        raise UsageLimitError(
            f"You have used all {plan.monthly_questions:,} questions included in your "
            f"{plan.name} plan this month. Upgrade for a higher limit."
        )
    return plan


def record_upload(db, user_id, *, size_bytes: int) -> None:
    usage_repo.increment(db, user_id, field="documents_uploaded", amount=1)
    usage_repo.increment(db, user_id, field="storage_bytes", amount=int(size_bytes))
    usage_repo.increment(db, user_id, field="processing_operations", amount=1)


def record_question(db, user_id) -> None:
    usage_repo.increment(db, user_id, field="questions_asked", amount=1)


def format_bytes(value: int) -> str:
    size = float(max(0, value))
    for unit in ("B", "KB", "MB"):
        if size < 1024:
            return f"{int(size)} B" if unit == "B" else f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} GB"


def _percent(used: int, limit: int) -> int:
    if limit <= 0:
        return 0
    return min(100, int(round(used / limit * 100)))


def record_document_removed(db, user_id, *, size_bytes: int = 0) -> None:
    """Release the document and storage a deleted file was holding this period.

    Decrements only an existing period record, so deleting a document uploaded in
    an earlier month cannot push the current month's counters below zero.
    """
    usage_repo.decrement(db, user_id, field="documents_uploaded", amount=1)
    if size_bytes:
        usage_repo.decrement(db, user_id, field="storage_bytes", amount=int(size_bytes))
