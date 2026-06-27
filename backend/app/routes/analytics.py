"""routes/analytics.py — Dashboard statistics"""

from flask import Blueprint, jsonify
from sqlalchemy import func
from ..models.database import SessionLocal, Document, Chunk, Message, Conversation
from ..rag import embedder

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/", methods=["GET"])
def get_analytics():
    db = SessionLocal()
    try:
        total_docs = db.query(func.count(Document.id)).scalar()
        total_chunks = db.query(func.count(Chunk.id)).scalar()
        total_convs = db.query(func.count(Conversation.id)).scalar()
        total_messages = db.query(func.count(Message.id)).scalar()

        avg_retrieval = db.query(func.avg(Message.retrieval_time_ms)).scalar()
        avg_llm = db.query(func.avg(Message.llm_time_ms)).scalar()

        index, _ = embedder._get_index()
        total_embeddings = index.ntotal

        docs_by_collection = (
            db.query(Document.collection, func.count(Document.id))
            .group_by(Document.collection)
            .all()
        )

        return jsonify({
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "total_embeddings": total_embeddings,
            "total_conversations": total_convs,
            "total_messages": total_messages,
            "avg_retrieval_time_ms": round(avg_retrieval or 0, 1),
            "avg_llm_time_ms": round(avg_llm or 0, 1),
            "documents_by_collection": [
                {"collection": c, "count": n} for c, n in docs_by_collection
            ],
        })
    finally:
        db.close()
