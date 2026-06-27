"""routes/search.py — Semantic search endpoint"""

from flask import Blueprint, request, jsonify
from ..rag import embedder

search_bp = Blueprint("search", __name__)


@search_bp.route("/", methods=["POST"])
def semantic_search():
    data = request.get_json()
    if not data or "query" not in data:
        return jsonify({"error": "Missing 'query'"}), 400

    query = data["query"].strip()
    top_k = min(data.get("top_k", 10), 20)

    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    results = embedder.search(query, top_k=top_k)

    return jsonify({
        "query": query,
        "results": [
            {
                "content": r["content"],
                "page_number": r.get("page_number"),
                "document_id": r.get("document_id"),
                "score": round(r.get("score", 0), 4),
                "snippet": r["content"][:300],
            }
            for r in results
        ],
        "total": len(results),
    })
