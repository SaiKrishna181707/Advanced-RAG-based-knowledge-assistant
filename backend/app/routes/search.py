"""Hybrid search endpoint."""

import time
from flask import Blueprint, request, jsonify
from ..rag.retriever import retrieve

search_bp = Blueprint("search", __name__)


@search_bp.route("/", methods=["POST"])
def semantic_search():
    data = request.get_json(silent=True) or {}
    if "query" not in data:
        return jsonify({"error": "Missing 'query'"}), 400

    query = str(data["query"]).strip()
    try:
        top_k = int(data.get("top_k", 10))
    except (TypeError, ValueError):
        return jsonify({"error": "'top_k' must be an integer"}), 400

    top_k = min(max(top_k, 1), 20)
    if not query:
        return jsonify({"error": "Query cannot be empty"}), 400

    started = time.time()
    results = retrieve(query, top_k=top_k)
    elapsed_ms = round((time.time() - started) * 1000)

    return jsonify({
        "query": query,
        "results": [
            {
                "content": r["content"],
                "page_number": r.get("page_number"),
                "document_id": r.get("document_id"),
                "score": round(r.get("rrf_score", r.get("score", 0)), 6),
                "snippet": r["content"][:300],
            }
            for r in results
        ],
        "total": len(results),
        "elapsed_ms": elapsed_ms,
        "strategy": "hybrid-bm25-dense-rrf",
    })
