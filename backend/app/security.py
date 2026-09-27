"""Password hashing, JWT issuing/verification, and route guards."""
from __future__ import annotations

import datetime as dt
import functools
from typing import Any, Callable

import jwt
from flask import g, request
from werkzeug.security import check_password_hash, generate_password_hash

from .config import settings
from .errors import AuthError

_PASSWORD_METHOD = "scrypt"


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
    expires = now + dt.timedelta(hours=settings.jwt_ttl_hours)
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        "iss": "albatross",
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, int((expires - now).total_seconds())


def decode_access_token(token: str) -> dict[str, Any]:
    if not settings.jwt_secret:
        raise AuthError(
            "Authentication is not configured on this server.",
            status_code=503,
            code="auth_not_configured",
        )
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            issuer="albatross",
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


def _bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        return None
    token = header[7:].strip()
    return token or None


def current_user_id() -> str | None:
    return getattr(g, "user_id", None)


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
