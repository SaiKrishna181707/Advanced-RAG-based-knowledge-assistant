"""Authentication: signup, signin, profile and account management."""
from __future__ import annotations

import logging
import re

from flask import Blueprint, g, request

from ..db import get_db
from ..db.repositories import activity as activity_repo
from ..db.repositories import collections as collections_repo
from ..db.repositories import tokens as tokens_repo
from ..db.repositories import users as users_repo
from ..deps import current_user
from ..errors import AuthError, ValidationError, ok
from ..ratelimit import limit
from ..security import (
    create_access_token,
    create_refresh_token,
    current_user_id,
    decode_refresh_token,
    hash_password,
    new_session_family,
    optional_user_id,
    refresh_token_expiry,
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


def _client_meta() -> dict:
    """Best-effort device metadata for the session list. Never used for auth."""
    forwarded = request.headers.get("X-Forwarded-For", "")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "")
    return {"user_agent": request.headers.get("User-Agent"), "ip": ip}


def _store_refresh_token(db, user_id, *, jti: str, family_id: str) -> None:
    tokens_repo.store(
        db,
        user_id,
        jti=jti,
        family_id=family_id,
        expires_at=refresh_token_expiry(),
        **_client_meta(),
    )


def _issue_session(db, user: dict, *, family_id: str | None = None) -> dict:
    """Mint an access token plus a refresh token for a new or continuing session."""
    family = family_id or new_session_family()
    token, expires_in = create_access_token(str(user["_id"]), email=user["email"])
    refresh_token, jti, refresh_expires_in = create_refresh_token(
        str(user["_id"]), family_id=family
    )
    _store_refresh_token(db, user["_id"], jti=jti, family_id=family)
    return {
        "token": token,
        "token_type": "Bearer",
        "expires_in": expires_in,
        "refresh_token": refresh_token,
        "refresh_expires_in": refresh_expires_in,
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
    return ok(_issue_session(db, user), status=201)


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
    activity_repo.record(db, user["_id"], "user.signed_in")
    return ok(_issue_session(db, user))


@auth_bp.route("/refresh", methods=["POST"])
@limit("auth", settings.rate_limit_auth)
def refresh_session():
    """Exchange a refresh token for a new access token, rotating the refresh token.

    Rotation means a refresh token is single use. If one is presented twice, the
    second use is either a replay of a stolen token or a client bug; either way the
    whole session family is revoked so the attacker loses access too.
    """
    data = json_body()
    presented = require_string(
        data, "refresh_token", max_length=4096, label="refresh token"
    )
    payload = decode_refresh_token(presented)
    db = get_db()

    record = tokens_repo.find(db, payload["jti"])
    if not record:
        raise AuthError(
            "Your session is no longer valid. Please sign in again.",
            status_code=401,
            code="invalid_refresh_token",
        )

    if record.get("revoked_at") is not None:
        tokens_repo.revoke_family(db, record.get("family_id"))
        logger.warning(
            "Refresh token reuse detected; session revoked",
            extra={
                "event": "refresh_token_reuse",
                "user_id": str(record.get("user_id")),
            },
        )
        raise AuthError(
            "Your session has expired. Please sign in again.",
            status_code=401,
            code="refresh_token_reused",
        )

    user = users_repo.find_by_id(db, payload["sub"])
    if not user or str(record.get("user_id")) != str(user["_id"]):
        raise AuthError(
            "Your session is no longer valid. Please sign in again.",
            status_code=401,
            code="invalid_refresh_token",
        )
    if user.get("subscription_status") == "suspended":
        raise AuthError(
            "This account is suspended. Please contact support.",
            status_code=403,
            code="account_suspended",
        )

    family_id = record.get("family_id")
    rotated_token, rotated_jti, refresh_expires_in = create_refresh_token(
        str(user["_id"]), family_id=family_id
    )
    # Consume the presented token before issuing anything. If the claim fails,
    # another request rotated (or revoked) it in the meantime, which is the same
    # signal as an explicit replay, so the whole family goes.
    if not tokens_repo.claim(db, payload["jti"], replaced_by=rotated_jti):
        tokens_repo.revoke_family(db, family_id)
        logger.warning(
            "Concurrent refresh token use detected; session revoked",
            extra={"event": "refresh_token_reuse", "user_id": str(user["_id"])},
        )
        raise AuthError(
            "Your session has expired. Please sign in again.",
            status_code=401,
            code="refresh_token_reused",
        )
    _store_refresh_token(db, user["_id"], jti=rotated_jti, family_id=family_id)

    token, expires_in = create_access_token(str(user["_id"]), email=user["email"])
    return ok(
        {
            "token": token,
            "token_type": "Bearer",
            "expires_in": expires_in,
            "refresh_token": rotated_token,
            "refresh_expires_in": refresh_expires_in,
            "user": users_repo.public_user(user),
        }
    )


@auth_bp.route("/logout", methods=["POST"])
@limit("auth", settings.rate_limit_auth)
def logout():
    """Revoke the caller's session.

    Deliberately forgiving: an expired or already-revoked token still returns
    success, because the client's goal (be signed out) is achieved either way and
    a hard failure would only make "log out" appear broken.
    """
    data = request.get_json(silent=True)
    data = data if isinstance(data, dict) else {}
    presented = data.get("refresh_token")
    presented = presented.strip() if isinstance(presented, str) else ""
    revoke_everything = bool(data.get("all_devices"))
    db = get_db()

    if revoke_everything:
        # Signing out everywhere needs to know who "everywhere" is, so this branch
        # requires a usable access token even though the endpoint as a whole does
        # not (a client with an expired access token must still be able to log out).
        user_id = optional_user_id()
        if not user_id:
            raise AuthError("Authentication required.", status_code=401, code="unauthenticated")
        revoked = tokens_repo.revoke_all_for_user(db, user_id)
        activity_repo.record(db, user_id, "user.signed_out", metadata={"all_devices": True})
        return ok({"message": "Signed out of all devices.", "sessions_revoked": revoked})

    if presented:
        try:
            payload = decode_refresh_token(presented)
            record = tokens_repo.find(db, payload["jti"])
            if record:
                tokens_repo.revoke_family(db, record.get("family_id"))
                activity_repo.record(
                    db, record.get("user_id"), "user.signed_out", metadata={"all_devices": False}
                )
        except AuthError:
            # An unusable token is already signed out; nothing to revoke.
            pass

    return ok({"message": "You have been signed out."})


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
    # A password change must end every other session: if the old password leaked,
    # the attacker's refresh tokens stop working the moment it is changed.
    revoked = tokens_repo.revoke_all_for_user(db, user["_id"])
    activity_repo.record(db, user["_id"], "user.password_changed")
    return ok(
        {
            "message": "Your password has been updated. Other devices have been signed out.",
            "sessions_revoked": revoked,
        }
    )


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
