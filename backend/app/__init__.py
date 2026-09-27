"""
Flask application factory for the Advanced RAG Knowledge Assistant.
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


def _cors_origins():
    configured = os.getenv("CORS_ORIGINS", "")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]
    return ["http://localhost:5173", "http://localhost:3000"]


def create_app():
    load_dotenv()

    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")

    data_dir = os.getenv("DATA_DIR", "/tmp")
    os.makedirs(data_dir, exist_ok=True)

    app.config["DATA_DIR"] = data_dir
    app.config["UPLOAD_FOLDER"] = os.getenv(
        "UPLOAD_FOLDER",
        os.path.join(data_dir, "uploads"),
    )
    app.config["MAX_CONTENT_LENGTH"] = (
        int(os.getenv("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024
    )

    CORS(
        app,
        resources={r"/api/*": {"origins": _cors_origins()}},
        supports_credentials=False,
    )

    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(search_bp, url_prefix="/api/search")
    app.register_blueprint(analytics_bp, url_prefix="/api/analytics")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "RAG Assistant is running"}

    with app.app_context():
        init_db()

    return app
