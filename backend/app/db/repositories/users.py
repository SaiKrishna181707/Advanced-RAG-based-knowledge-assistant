"""User persistence and lookup."""
from __future__ import annotations

import datetime as dt

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from ...errors import ConflictError
from ..serialize import doc_out

PUBLIC_USER_FIELDS = ("name", "email", "avatar_color", "created_at", "last_login")

# Avatars and collections default to the brand accent so a new account never
# starts out with an off-brand colour in the UI.
DEFAULT_AVATAR_COLOR = "#0d7d70"


def create_user(
    db,
    *,
    name: str,
    email: str,
    password_hash: str,
    subscription_plan: str = "free",
    subscription_status: str = "active",
    avatar_color: str | None = None,
) -> dict:
    now = dt.datetime.now(dt.timezone.utc)
    document = {
        "_id": ObjectId(),
        "name": name,
        "email": email.lower().strip(),
        "password_hash": password_hash,
        "avatar_color": avatar_color or DEFAULT_AVATAR_COLOR,
        "subscription_plan": subscription_plan,
        "subscription_status": subscription_status,
        "billing_customer_id": None,
        "preferences": {
            "theme": "system",
            "response_style": "concise",
            "retrieval_count": 5,
            "default_collection_id": None,
            "default_scope": "all",
        },
        "created_at": now,
        "updated_at": now,
        "last_login": None,
    }
    try:
        db.users.insert_one(document)
    except DuplicateKeyError as exc:
        raise ConflictError(
            "An account with that email address already exists.",
            code="email_taken",
        ) from exc
    return document


def find_by_email(db, email: str) -> dict | None:
    return db.users.find_one({"email": (email or "").lower().strip()})


def find_by_id(db, user_id) -> dict | None:
    try:
        return db.users.find_one({"_id": ObjectId(str(user_id))})
    except Exception:
        return None


def record_login(db, user_id) -> None:
    now = dt.datetime.now(dt.timezone.utc)
    db.users.update_one(
        {"_id": ObjectId(str(user_id))},
        {"$set": {"last_login": now, "updated_at": now}},
    )


def update_profile(db, user_id, *, fields: dict) -> dict | None:
    allowed = {"name", "avatar_color"}
    update = {key: value for key, value in fields.items() if key in allowed and value is not None}
    if not update:
        return find_by_id(db, user_id)
    update["updated_at"] = dt.datetime.now(dt.timezone.utc)
    return db.users.find_one_and_update(
        {"_id": ObjectId(str(user_id))},
        {"$set": update},
        return_document=True,
    )


def update_preferences(db, user_id, *, preferences: dict) -> dict | None:
    allowed = {"theme", "response_style", "retrieval_count", "default_collection_id", "default_scope"}
    update = {key: value for key, value in preferences.items() if key in allowed}
    if not update:
        return find_by_id(db, user_id)
    payload = {f"preferences.{key}": value for key, value in update.items()}
    payload["updated_at"] = dt.datetime.now(dt.timezone.utc)
    return db.users.find_one_and_update(
        {"_id": ObjectId(str(user_id))},
        {"$set": payload},
        return_document=True,
    )


def update_password(db, user_id, *, password_hash: str) -> None:
    db.users.update_one(
        {"_id": ObjectId(str(user_id))},
        {"$set": {"password_hash": password_hash, "updated_at": dt.datetime.now(dt.timezone.utc)}},
    )


def update_subscription(db, user_id, *, plan: str, status: str) -> dict | None:
    return db.users.find_one_and_update(
        {"_id": ObjectId(str(user_id))},
        {
            "$set": {
                "subscription_plan": plan,
                "subscription_status": status,
                "updated_at": dt.datetime.now(dt.timezone.utc),
            }
        },
        return_document=True,
    )


def delete_user(db, user_id) -> bool:
    try:
        oid = ObjectId(str(user_id))
    except Exception:
        return False
    for collection in (
        "documents",
        "chunks",
        "collections",
        "conversations",
        "messages",
        "activity",
        "feedback",
        "usage",
        "refresh_tokens",
    ):
        db[collection].delete_many({"user_id": oid})
    return db.users.delete_one({"_id": oid}).deleted_count == 1


def public_user(user: dict | None) -> dict | None:
    """Strip credentials and internal fields from a user document."""
    if not user:
        return None
    payload = doc_out(user) or {}
    payload.pop("password_hash", None)
    payload.pop("billing_customer_id", None)
    return payload
