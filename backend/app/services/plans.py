"""
Subscription plan catalogue.

This module is the single source of truth for what each plan allows. Routes, the
usage meter and the landing page pricing table all read from here, so a limit is
never hardcoded in more than one place.

No payment provider is wired up. ``billing_ready`` records that the fields a
provider such as Stripe needs (plan key, subscription status, billing customer id
on the user document) already exist, so integration is additive rather than a
rewrite.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

GB = 1024 * 1024 * 1024
MB = 1024 * 1024


@dataclass(frozen=True)
class Plan:
    key: str
    name: str
    tagline: str
    price_monthly: int | None
    document_limit: int
    storage_limit_bytes: int
    monthly_questions: int
    max_file_size_mb: int
    retrieval_top_k: int
    history_turns: int
    highlights: tuple[str, ...]
    cta: str
    highlighted: bool = False

    def to_public(self) -> dict:
        payload = asdict(self)
        payload["storage_limit_gb"] = round(self.storage_limit_bytes / GB, 2)
        payload["price_label"] = (
            "Custom" if self.price_monthly is None else f"${self.price_monthly}"
        )
        payload["document_limit_label"] = (
            "Unlimited" if self.document_limit >= 1_000_000 else f"{self.document_limit:,}"
        )
        payload["question_limit_label"] = (
            "Unlimited"
            if self.monthly_questions >= 1_000_000
            else f"{self.monthly_questions:,} / month"
        )
        return payload


PLANS: dict[str, Plan] = {
    "free": Plan(
        key="free",
        name="Free",
        tagline="For trying ALBATROSS on a personal document set.",
        price_monthly=0,
        document_limit=25,
        storage_limit_bytes=100 * MB,
        monthly_questions=200,
        max_file_size_mb=25,
        retrieval_top_k=4,
        history_turns=3,
        highlights=(
            "Up to 25 documents",
            "100 MB of storage",
            "200 questions per month",
            "Hybrid retrieval",
            "Grounded answers with citations",
            "Basic chat history",
        ),
        cta="Get started free",
    ),
    "pro": Plan(
        key="pro",
        name="Pro",
        tagline="For working out of a large personal knowledge base.",
        price_monthly=19,
        document_limit=1000,
        storage_limit_bytes=10 * GB,
        monthly_questions=10000,
        max_file_size_mb=50,
        retrieval_top_k=8,
        history_turns=6,
        highlights=(
            "Up to 1,000 documents",
            "10 GB of storage",
            "10,000 questions per month",
            "Advanced hybrid search with filters",
            "Full analytics and usage reporting",
            "Priority processing queue",
            "Extended conversation history",
        ),
        cta="Choose Pro",
        highlighted=True,
    ),
    "team": Plan(
        key="team",
        name="Team",
        tagline="For groups building a shared knowledge space.",
        price_monthly=79,
        document_limit=10000,
        storage_limit_bytes=100 * GB,
        monthly_questions=100000,
        max_file_size_mb=100,
        retrieval_top_k=10,
        history_turns=8,
        highlights=(
            "Up to 10,000 documents",
            "100 GB of storage",
            "100,000 questions per month",
            "Shared knowledge spaces",
            "Team members and collaborative documents",
            "Shared conversations",
            "Workspace analytics",
        ),
        cta="Talk to us",
    ),
}

DEFAULT_PLAN_KEY = "free"
PLAN_ORDER = ("free", "pro", "team")


def get_plan(key: str | None) -> Plan:
    if not key:
        return PLANS[DEFAULT_PLAN_KEY]
    return PLANS.get(str(key).lower(), PLANS[DEFAULT_PLAN_KEY])


def plan_catalogue() -> list[dict]:
    return [PLANS[key].to_public() for key in PLAN_ORDER]
