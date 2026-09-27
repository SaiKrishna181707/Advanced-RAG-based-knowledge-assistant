"""Shared request dependencies."""
from __future__ import annotations

from flask import g

from .db.repositories import users as users_repo
from .errors import AuthError


def current_user(db) -> dict:
    """Load the authenticated user document, or fail with 401."""
    user_id = getattr(g, "user_id", None)
    if not user_id:
        raise AuthError("Authentication required.", status_code=401)
    user = users_repo.find_by_id(db, user_id)
    if not user:
        raise AuthError(
            "Your account could not be found. Please sign in again.",
            status_code=401,
            code="user_not_found",
        )
    if user.get("subscription_status") == "suspended":
        raise AuthError(
            "This account is suspended. Please contact support.",
            status_code=403,
            code="account_suspended",
        )
    return user