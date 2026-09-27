"""
run.py  -  start the ALBATROSS API for local development.

Production uses gunicorn (see render.yaml):
    gunicorn "app:create_app()" --bind 0.0.0.0:$PORT

Run locally with:  python run.py
"""
import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print("Starting ALBATROSS backend")
    print(f"API:          http://localhost:{port}")
    print(f"Health check: http://localhost:{port}/api/health")
    app.run(host="0.0.0.0", port=port, debug=not os.getenv("APP_ENV") == "production")