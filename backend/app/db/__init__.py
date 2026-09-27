"""MongoDB access layer: connection management and repositories."""

from .mongo import ensure_indexes, get_client, get_db, health, ping

__all__ = ["ensure_indexes", "get_client", "get_db", "health", "ping"]
