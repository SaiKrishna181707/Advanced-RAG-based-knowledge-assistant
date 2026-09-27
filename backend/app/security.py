"""Password hashing, JWT issuing/verification, and route guards."""
from __future__ import annotations

import datetime as dt
import functools
import uuid
from typing import Any, Callable

import jwt
from flask import g, request
from werkzeug.security import check_password_hash, generate_password_hash

from .config import settings
from .errors import AuthError

_PASSWORD_METHOD = "scrypt"

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"
ISSUER = "albatross"


def hash_password(raw_password: str) -> str:
    return generate_password_hash(raw_password, method=_PASSWORD_METHOD)


def verify_password(raw_password: str, password_hash: str) -> bool:
    if not raw_password or not password_hash:
        return False
    try:
        return check_password_hash(password_hash, raw_password)
    except (TypeError, ValueError):
        return False


def create_access_token(user_id: str, *, email: str) -> tuple[str, int]:
    """Return ``(token, expires_in_seconds)``."""
    if not settings.jwt_secret:
        raise AuthError(
            "Authentication is not configured on this server.",
            status_code=503,
            code="auth_not_configured",
        )
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=settings.jwt_access_ttl_minutes)
    payload = {
        "sub": str(user_id),
        "email": email,
        "type": ACCESS_TOKEN_TYPE,
        # A unique id keeps two tokens minted in the same second distinct, which
        # matters for caching, log correlation and any future deny-list.
        "jti": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "iss": ISSUER,
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int((expires - now).total_seconds())


def new_session_family() -> str:
    """Identifier for a signed-in session, shared by every rotation within it."""
    return uuid.uuid4().hex


def create_refresh_token(user_id: str, *, family_id: str) -> tuple[str, str, int]:
    """Return ``(token, jti, expires_in_seconds)`` for a new refresh token.

    ``jti`` is the server-side handle for this token. The caller records it so the
    token can be revoked or rotated; the token itself is never stored.
    """
    if not settings.jwt_refresh_secret:
        raise AuthError(
            "Authentication is not configured on this server.",
            status_code=503,
            code="auth_not_configured",
        )
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(days=settings.jwt_refresh_ttl_days)
    jti = uuid.uuid4().hex
    payload = {
        "sub": str(user_id),
        "type": REFRESH_TOKEN_TYPE,
        "jti": jti,
        "fam": family_id,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "iss": ISSUER,
    }
    token = jwt.encode(payload, settings.jwt_refresh_secret, algorithm=settings.jwt_algorithm)
    return token, jti, int((expires - now).total_seconds())


def refresh_token_expiry() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=settings.jwt_refresh_ttl_days)


def decode_refresh_token(token: str) -> dict[str, Any]:
    """Verify a refresh token. Rejects anything that is not a refresh token."""
    if not settings.jwt_refresh_secret:
        raise AuthError(
            "Authentication is not configured on this server.",
            status_code=503,
            code="auth_not_configured",
        )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_refresh_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=ISSUER,
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError(
            "Your session has expired. Please sign in again.",
            status_code=401,
            code="refresh_token_expired",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(
            "Invalid refresh token.", status_code=401, code="invalid_refresh_token"
        ) from exc

    if payload.get("type") != REFRESH_TOKEN_TYPE:
        # An access token must never be usable as a refresh token, even if both
        # are signed with the same secret.
        raise AuthError(
            "Invalid refresh token.", status_code=401, code="invalid_refresh_token"
        )
    if not payload.get("sub") or not payload.get("jti"):
        raise AuthError(
            "Invalid refresh token.", status_code=401, code="invalid_refresh_token"
        )
    return payload


def decode_access_token(token: str) -> dict[str, Any]:
    if not settings.jwt_secret:
        raise AuthError(
            "Authentication is not configured on this server.",
            status_code=503,
            code="auth_not_configured",
        )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer=ISSUER,
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthError(
            "Your session has expired. Please sign in again.",
            status_code=401,
            code="token_expired",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError(
            "Invalid authentication token.",
            status_code=401,
            code="invalid_token",
        ) from exc

    # A refresh token must never be accepted as an access token. Tokens issued
    # before the type claim existed have no "type" and are still treated as
    # access tokens so an in-flight session survives the upgrade.
    token_type = payload.get("type")
    if token_type not in (None, ACCESS_TOKEN_TYPE):
        raise AuthError(
            "Invalid authentication token.", status_code=401, code="invalid_token"
        )
    return payload


def _bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header[7:].strip()
    return token or None


def current_user_id() -> str | None:
    return getattr(g, "user_id", None)


def optional_user_id() -> str | None:
    """Identify the caller when a valid bearer token happens to be present.

    Returns ``None`` instead of raising, so an endpoint can offer an authenticated
    option (such as "sign out everywhere") while still being usable by a client
    whose access token has already expired.
    """
    token = _bearer_token()
    if not token:
        return None
    try:
        payload = decode_access_token(token)
    except AuthError:
        return None
    subject = payload.get("sub")
    return str(subject) if subject else None


def require_auth(view: Callable) -> Callable:
    """Guard a route. Populates ``g.user_id`` from a verified JWT."""

    @functools.wraps(view)
    def wrapper(*args, **kwargs):
        token = _bearer_token()
        if not token:
            raise AuthError("Authentication required.", status_code=401, code="unauthenticated")
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if not subject:
            raise AuthError("Invalid authentication token.", status_code=401, code="invalid_token")
        g.user_id = str(subject)
        g.user_email = payload.get("email")
        return view(*args, **kwargs)

    return wrapper
