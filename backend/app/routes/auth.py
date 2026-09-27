"""Authentication: signup, signin, profile and account management."""
from __future__ import annotations

import logging
import re

from flask import Blueprint, g

from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import users as users_repo
from ..deps import current_user
from ..errors import AuthError, ValidationError, ok
from ..ratelimit import limit
from ..security import (
    create_access_token,
    current_user_id,
    hash_password,
    require_auth,
    verify_password,
)
from ..config import settings
from ..validators import json_body, optional_string, require_string

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__)

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128
COMMON_PASSWORDS = {"password", "password1", "12345678", "qwerty123", "letmein123", "iloveyou"}


def _validate_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_PATTERN.match(email) or len(email) > 254:
        raise ValidationError("Please enter a valid email address.")
    return email


def _validate_password(value: str, *, field: str = "password") -> str:
    if len(value) < PASSWORD_MIN_LENGTH:
        raise ValidationError(
            f"Your password must be at least {PASSWORD_MIN_LENGTH} characters long."
        )
    if len(value) > PASSWORD_MAX_LENGTH:
        raise ValidationError("That password is too long.")
    if value.lower() in COMMON_PASSWORDS:
        raise ValidationError("That password is too common. Please choose another.")
    if not any(character.isalpha() for character in value) or not any(
        character.isdigit() for character in value
    ):
        raise ValidationError("Your password must include at least one letter and one number.")
    return value


def _session_payload(user: dict) -> dict:
    token, expires_in = create_access_token(str(user["_id"]), email=user["email"])
    return {
        "token": token,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "user": users_repo.public_user(user),
    }


@auth_bp.route("/signup", methods=["POST"])
@limit("auth", settings.rate_limit_auth)
def signup():
    data = json_body()
    name = require_string(data, "name", min_length=2, max_length=80, label="name")
    email = _validate_email(require_string(data, "email", max_length=254, label="email"))
    password = _validate_password(require_string(data, "password", max_length=200, label="password"))

    db = get_db()
    user = users_repo.create_user(
        db, name=name, email=email, password_hash=hash_password(password)
    )
    collections_repo.ensure_default(db, user["_id"])
    activity_repo.record(db, user["_id"], "user.signed_up", metadata={"email": email})

    logger.info(
        "User signed up",
        extra={"event": "user_signup", "user_id": str(user["_id"])},
    )
    return ok(_session_payload(user), status=201)


@auth_bp.route("/login", methods=["POST"])
@limit("auth", settings.rate_limit_auth)
def login():
    data = json_body()
    email = require_string(data, "email", max_length=254, label="email").lower()
    password = require_string(data, "password", max_length=200, label="password")

    db = get_db()
    user = users_repo.find_by_email(db, email)
    if not user or not verify_password(password, user.get("password_hash", "")):
        raise AuthError("That email and password combination is not correct.", status_code=401)

    users_repo.record_login(db, user["_id"])
    user = users_repo.find_by_id(db, user["_id"])
    return ok(_session_payload(user))


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    db = get_db()
    user = current_user(db)
    return ok({"user": users_repo.public_user(user)})


@auth_bp.route("/profile", methods=["PATCH"])
@require_auth
def update_profile():
    data = json_body()
    db = get_db()
    user = current_user(db)

    fields = {}
    name = optional_string(data, "name", max_length=80)
    if name is not None:
        if len(name) < 2:
            raise ValidationError("Your name must be at least 2 characters long.")
        fields["name"] = name
    avatar_color = optional_string(data, "avatar_color", max_length=9)
    if avatar_color is not None:
        if not re.match(r"^#[0-9a-fA-F]{6}$", avatar_color):
            raise ValidationError("Avatar colour must be a hex value such as #7c5cff.")
        fields["avatar_color"] = avatar_color

    if not fields:
        raise ValidationError("Nothing to update.")

    updated = users_repo.update_profile(db, user["_id"], fields=fields)
    return ok({"user": users_repo.public_user(updated)})


@auth_bp.route("/password", methods=["POST"])
@require_auth
@limit("auth", settings.rate_limit_auth)
def change_password():
    data = json_body()
    current = require_string(data, "current_password", max_length=200, label="current password")
    new_password = _validate_password(
        require_string(data, "new_password", max_length=200, label="new password"),
        field="new_password",
    )

    db = get_db()
    user = current_user(db)
    if not verify_password(current, user.get("password_hash", "")):
        raise AuthError("Your current password is not correct.", status_code=401)

    users_repo.update_password(db, user["_id"], password_hash=hash_password(new_password))
    activity_repo.record(db, user["_id"], "user.password_changed")
    return ok({"message": "Your password has been updated."})


@auth_bp.route("/account", methods=["DELETE"])
@require_auth
def delete_account():
    data = json_body()
    password = require_string(data, "password", max_length=200, label="password")

    db = get_db()
    user = current_user(db)
    if not verify_password(password, user.get("password_hash", "")):
        raise AuthError("Your password is not correct.", status_code=401)

    from ..services import storage

    user_id = user["_id"]
    users_repo.delete_user(db, user_id)
    storage.delete_user_files(user_id)
    logger.info("Account deleted", extra={"event": "account_deleted", "user_id": str(user_id)})
    return ok({"message": "Your account and all of its data have been deleted."})


@auth_bp.route("/session", methods=["GET"])
@require_auth
def session_check():
    """Cheap endpoint for the frontend to validate a stored token."""
    return ok({"valid": True, "user_id": current_user_id() or getattr(g, "user_id", None)})