"""
In-process fixed-window rate limiting.

Deliberately simple: a single Render web service instance is the deployment target,
so a per-process counter is accurate. Running multiple instances would need a shared
store such as Redis, which is noted in the roadmap rather than pretended away.
"""
from __future__ import annotations

import functools
import threading
import time
from collections import defaultdict, deque

from flask import g, request

from .config import settings
from .errors import RateLimitError

_buckets: dict[str, deque] = defaultdict(deque)
_lock = threading.Lock()


def _client_key(name: str) -> str:
    user_id = getattr(g, "user_id", None)
    if user_id:
        return f"{name}:user:{user_id}"
    forwarded = request.headers.get("X-Forwarded-For", "")
    address = forwarded.split(",")[0].strip() if forwarded else (request.remote_addr or "unknown")
    return f"{name}:ip:{address}"


def limit(name: str, max_requests: int):
    """Decorator factory. ``name`` separates buckets, ``max_requests`` is per window."""

    def decorator(view):
        @functools.wraps(view)
        def wrapper(*args, **kwargs):
            if not settings.rate_limit_enabled or max_requests <= 0:
                return view(*args, **kwargs)

            window = settings.rate_limit_window_seconds
            now = time.monotonic()
            key = _client_key(name)

            with _lock:
                bucket = _buckets[key]
                while bucket and now - bucket[0] > window:
                    bucket.popleft()
                if len(bucket) >= max_requests:
                    raise RateLimitError(
                        "Too many requests. Please wait a moment and try again."
                    )
                bucket.append(now)
            return view(*args, **kwargs)

        return wrapper

    return decorator


def reset() -> None:
    """Clear all buckets. Used by tests."""
    with _lock:
        _buckets.clear()