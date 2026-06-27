"""
routes/chat.py  —  Chat / Q&A API

Endpoints:
  POST /api/chat/ask                 Ask a question, get an answer with citations
  POST /api/chat/conversations       Create new conversation
  GET  /api/chat/conversations       List all conversations
  GET  /api/chat/conversations/<id>  Get messages for a conversation
  DELETE /api/chat/conversations/<id> Delete a conversation
"""

import json
import time
from flask import Blueprint, request, jsonify

from ..models.database import SessionLocal, Conversation, Message
from ..rag.retriever import retrieve
from ..services.llm_service import generate_answer

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/ask", methods=["POST"])
def ask():
    """
    The core RAG endpoint. Flow:
      1. Receive user question + conversation_id
      2. Retrieve relevant chunks (hybrid search)
      3. Send chunks + question to Groq LLM
      4. Save message to DB
      5. Return answer + sources
    """
    data = request.get_json()
    if not data or "question" not in data:
        return jsonify({"error": "Missing 'question' field"}), 400

    question = data["question"].strip()
    conversation_id = data.get("conversation_id")
    top_k = data.get("top_k", 5)

    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400

    db = SessionLocal()
    try:
        # Get or create conversation
        if conversation_id:
            conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
            if not conv:
                return jsonify({"error": "Conversation not found"}), 404
        else:
            # Auto-create conversation with first 50 chars of question as title
            title = question[:50] + ("..." if len(question) > 50 else "")
            conv = Conversation(title=title)
            db.add(conv)
            db.commit()
            db.refresh(conv)
            conversation_id = conv.id

        # --- Retrieval ---
        t_retrieval_start = time.time()
        chunks = retrieve(question, top_k=top_k)
        retrieval_ms = round((time.time() - t_retrieval_start) * 1000)

        # --- Generation ---
        result = generate_answer(question, chunks)

        # --- Save to DB ---
        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=question,
        )
        db.add(user_msg)

        assistant_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=result["answer"],
            sources=json.dumps(result["sources"]),
            retrieval_time_ms=retrieval_ms,
            llm_time_ms=result["llm_time_ms"],
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)

        return jsonify({
            "answer": result["answer"],
            "sources": result["sources"],
            "conversation_id": conversation_id,
            "message_id": assistant_msg.id,
            "retrieval_time_ms": retrieval_ms,
            "llm_time_ms": result["llm_time_ms"],
            "chunks_used": result["chunks_used"],
            "model": result["model"],
        })

    except ValueError as e:
        # Groq key missing
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@chat_bp.route("/conversations", methods=["POST"])
def create_conversation():
    db = SessionLocal()
    try:
        data = request.get_json() or {}
        conv = Conversation(title=data.get("title", "New conversation"))
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return jsonify({"id": conv.id, "title": conv.title}), 201
    finally:
        db.close()


@chat_bp.route("/conversations", methods=["GET"])
def list_conversations():
    db = SessionLocal()
    try:
        convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).limit(50).all()
        return jsonify([
            {
                "id": c.id,
                "title": c.title,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "message_count": len(c.messages),
            }
            for c in convs
        ])
    finally:
        db.close()


@chat_bp.route("/conversations/<int:conv_id>", methods=["GET"])
def get_conversation(conv_id: int):
    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conv:
            return jsonify({"error": "Not found"}), 404

        messages = []
        for m in conv.messages:
            msg = {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
            }
            if m.sources:
                msg["sources"] = json.loads(m.sources)
            if m.retrieval_time_ms:
                msg["retrieval_time_ms"] = m.retrieval_time_ms
            messages.append(msg)

        return jsonify({
            "id": conv.id,
            "title": conv.title,
            "messages": messages,
        })
    finally:
        db.close()


@chat_bp.route("/conversations/<int:conv_id>", methods=["DELETE"])
def delete_conversation(conv_id: int):
    db = SessionLocal()
    try:
        conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
        if not conv:
            return jsonify({"error": "Not found"}), 404
        db.delete(conv)
        db.commit()
        return jsonify({"message": "Deleted"})
    finally:
        db.close()
