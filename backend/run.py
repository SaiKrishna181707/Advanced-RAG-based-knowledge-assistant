"""
run.py  —  Start the Flask development server

Run with:  python run.py
"""

from app import create_app

app = create_app()

if __name__ == "__main__":
    print("Starting RAG Assistant backend...")
    print("API available at: http://localhost:5000")
    print("Health check: http://localhost:5000/api/health")
    app.run(host="0.0.0.0", port=5000, debug=True)
