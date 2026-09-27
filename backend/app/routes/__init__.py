"""Blueprint registry. Every API surface is mounted here with its URL prefix."""
from __future__ import annotations

from flask import Flask

from .account import account_bp
from .analytics import analytics_bp
from .auth import auth_bp
from .chat import chat_bp
from .collections import collections_bp
from .conversations import conversations_bp
from .documents import documents_bp
from .meta import meta_bp
from .search import search_bp

BLUEPRINTS = (
    (meta_bp, "/api"),
    (auth_bp, "/api/auth"),
    (account_bp, "/api/me"),
    (documents_bp, "/api/documents"),
    (collections_bp, "/api/collections"),
    (conversations_bp, "/api/conversations"),
    (chat_bp, "/api/chat"),
    (search_bp, "/api/search"),
    (analytics_bp, "/api/analytics"),
)


def register_blueprints(app: Flask) -> None:
    for blueprint, prefix in BLUEPRINTS:
        app.register_blueprint(blueprint, url_prefix=prefix)