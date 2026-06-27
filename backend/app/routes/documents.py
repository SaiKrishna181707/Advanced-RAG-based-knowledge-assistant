"""
routes/documents.py  —  Document Management API

Endpoints:
  POST   /api/documents/upload      Upload a PDF and process it through the RAG pipeline
  GET    /api/documents/            List all uploaded documents
  DELETE /api/documents/<id>        Delete a document and its chunks/vectors
  GET    /api/documents/<id>/status Check processing status
"""

import os
import time
import uuid
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from ..models.database import SessionLocal, Document, Chunk
from ..rag.extractor import extract_pdf
from ..rag.chunker import chunk_pages
from ..rag import embedder

documents_bp = Blueprint("documents", __name__)

ALLOWED_EXTENSIONS = {"pdf"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@documents_bp.route("/upload", methods=["POST"])
def upload_document():
    """
    Handles PDF upload. Full pipeline:
      1. Save file to disk
      2. Extract text (PyMuPDF)
      3. Chunk text (LangChain splitter)
      4. Embed chunks + store in FAISS
      5. Save metadata to SQLite
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    collection = request.form.get("collection", "General")

    if not file.filename:
        return jsonify({"error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only PDF files are supported"}), 400

    # Save with a unique name to avoid collisions
    original_name = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{original_name}"
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)

    file_size = os.path.getsize(file_path)

    db = SessionLocal()
    try:
        # Create DB record (status=processing)
        doc = Document(
            filename=unique_name,
            original_name=original_name,
            file_size=file_size,
            collection=collection,
            status="processing",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        doc_id = doc.id

        start = time.time()

        # --- RAG Pipeline ---
        extracted = extract_pdf(file_path)
        chunks = chunk_pages(extracted["pages"])

        if not chunks:
            doc.status = "error"
            db.commit()
            return jsonify({"error": "Could not extract text from PDF"}), 422

        # Embed and store in FAISS — returns list of FAISS indices
        faiss_indices = embedder.embed_and_store(chunks, doc_id)

        # Save each chunk to SQLite
        for i, (chunk, faiss_idx) in enumerate(zip(chunks, faiss_indices)):
            db_chunk = Chunk(
                document_id=doc_id,
                content=chunk["content"],
                page_number=chunk["page_number"],
                chunk_index=i,
                char_count=chunk["char_count"],
                faiss_index=faiss_idx,
            )
            db.add(db_chunk)

        # Update document record
        doc.page_count = extracted["page_count"]
        doc.chunk_count = len(chunks)
        doc.status = "ready"
        db.commit()

        elapsed = round((time.time() - start) * 1000)

        return jsonify({
            "id": doc_id,
            "original_name": original_name,
            "page_count": extracted["page_count"],
            "chunk_count": len(chunks),
            "file_size": file_size,
            "processing_time_ms": elapsed,
            "status": "ready",
        }), 201

    except Exception as e:
        db.rollback()
        if "doc" in locals():
            doc.status = "error"
            db.commit()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@documents_bp.route("/", methods=["GET"])
def list_documents():
    """Returns all documents with metadata."""
    db = SessionLocal()
    try:
        docs = db.query(Document).order_by(Document.created_at.desc()).all()
        return jsonify([
            {
                "id": d.id,
                "name": d.original_name,
                "file_size": d.file_size,
                "page_count": d.page_count,
                "chunk_count": d.chunk_count,
                "collection": d.collection,
                "status": d.status,
                "created_at": d.created_at.isoformat(),
            }
            for d in docs
        ])
    finally:
        db.close()


@documents_bp.route("/<int:doc_id>", methods=["DELETE"])
def delete_document(doc_id: int):
    """Deletes document, its chunks from SQLite, and its vectors from FAISS."""
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        # Remove from FAISS (rebuilds index without this doc)
        embedder.delete_document_vectors(doc_id)

        # Remove file from disk
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        file_path = os.path.join(upload_folder, doc.filename)
        if os.path.exists(file_path):
            os.remove(file_path)

        # SQLAlchemy cascade deletes the Chunks too
        db.delete(doc)
        db.commit()

        return jsonify({"message": f"Document '{doc.original_name}' deleted successfully"})
    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@documents_bp.route("/<int:doc_id>/status", methods=["GET"])
def document_status(doc_id: int):
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return jsonify({"error": "Not found"}), 404
        return jsonify({"id": doc_id, "status": doc.status})
    finally:
        db.close()
