"""
app/__init__.py  —  Flask Application Factory

What this file does:
  - Creates the Flask app
  - Loads config from .env
  - Registers all route blueprints (chat, documents, search, analytics)
  - Sets up CORS so the React frontend (on a different port) can talk to us
  - Initialises the database

Why "factory pattern"?
  Instead of creating app = Flask(__name__) globally, we wrap it in a function.
  This makes testing easier and avoids circular imports.
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from .routes.chat import chat_bp
from .routes.documents import documents_bp
from .routes.search import search_bp
from .routes.analytics import analytics_bp
from .models.database import init_db


def create_app():
    load_dotenv()

    app = Flask(__name__)

    # --- Config ---
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")
    app.config["UPLOAD_FOLDER"] = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "uploads"
    )
    app.config["MAX_CONTENT_LENGTH"] = (
        int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024
    )

    # --- CORS ---
    # Allows the React dev server (localhost:5173) and production frontend to call our API
    CORS(
        app,
        resources={r"/api/*": {"origins": ["http://localhost:5173", "http://localhost:3000", "*"]}},
    )

    # --- Blueprints ---
    # Each blueprint is a group of related routes
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

    # --- Health check ---
    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "RAG Assistant is running"}

    # --- Database ---
    with app.app_context():
        init_db()

    return app
