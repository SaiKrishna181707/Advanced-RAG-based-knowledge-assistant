import logging

from flask import Blueprint, request, jsonify, g
from app.security import require_auth
from app.services.storage import save_upload, delete_stored_file
from app.db.repositories.career_resumes import CareerResumeRepository
from app.db.serialize import doc_out, docs_out
from app.errors import ValidationError, NotFoundError

logger = logging.getLogger(__name__)

bp = Blueprint("career_resumes", __name__, url_prefix="/career/resumes")
repo = CareerResumeRepository()

ALLOWED_RESUME_EXTENSIONS = {"pdf", "docx", "txt", "md", "markdown"}


@bp.route("", methods=["GET"])
@require_auth
def list_resumes():
    user_id = g.user_id
    resumes = repo.list_by_user(user_id)
    # Don't send extracted_text in list view — it can be huge
    safe = []
    for r in docs_out(resumes):
        r.pop("extracted_text", None)
        safe.append(r)
    return jsonify({"success": True, "data": safe})


@bp.route("/<resume_id>", methods=["GET"])
@require_auth
def get_resume(resume_id):
    user_id = g.user_id
    resume = repo.get_by_user(user_id, resume_id)
    if not resume:
        raise NotFoundError("Resume not found.")
    out = doc_out(resume)
    out.pop("extracted_text", None)
    return jsonify({"success": True, "data": out})


@bp.route("/<resume_id>/extraction", methods=["GET"])
@require_auth
def get_extraction(resume_id):
    """Return structured_draft separately so it's only fetched when needed."""
    user_id = g.user_id
    resume = repo.get_by_user(user_id, resume_id)
    if not resume:
        raise NotFoundError("Resume not found.")
    return jsonify({
        "success": True,
        "data": {
            "id": str(resume["_id"]),
            "status": resume.get("status"),
            "extraction_status": resume.get("extraction_status"),
            "extraction_metadata": resume.get("extraction_metadata"),
            "structured_draft": resume.get("structured_draft"),
            "error_message": resume.get("error_message"),
        }
    })


@bp.route("", methods=["POST"])
@require_auth
def upload_resume():
    user_id = g.user_id

    if "file" not in request.files:
        raise ValidationError("No file was included in the request.")

    file_storage = request.files["file"]
    if not file_storage or not file_storage.filename:
        raise ValidationError("No file was selected.")

    # Extension guard before hitting save_upload
    ext = (file_storage.filename.rsplit(".", 1)[-1] if "." in file_storage.filename else "").lower()
    if ext not in ALLOWED_RESUME_EXTENSIONS:
        supported = ", ".join(f".{e}" for e in sorted(ALLOWED_RESUME_EXTENSIONS))
        raise ValidationError(f"Unsupported file type. Supported types: {supported}")

    declared_length = request.content_length or 0
    upload = save_upload(file_storage, user_id, declared_length=declared_length)

    resume_doc = {
        "user_id": user_id,
        "original_filename": upload.original_name,
        "stored_name": upload.stored_name,
        "file_type": upload.extension,
        "file_size": upload.size_bytes,
        "sha256": upload.sha256,
        "status": "uploaded",
        "processing_status": "pending",
        "extraction_status": "pending",
        "extracted_text": None,
        "extraction_metadata": None,
        "structured_draft": None,
        "is_primary": False,
        "error_message": None,
    }
    resume = repo.create(resume_doc)

    logger.info(
        "Resume uploaded",
        extra={"event": "resume_uploaded", "resume_id": str(resume["_id"])},
    )
    out = doc_out(resume)
    out.pop("extracted_text", None)
    return jsonify({"success": True, "data": out}), 201


@bp.route("/<resume_id>", methods=["DELETE"])
@require_auth
def delete_resume(resume_id):
    user_id = g.user_id
    resume = repo.delete(user_id, resume_id)
    if not resume:
        raise NotFoundError("Resume not found.")

    if resume.get("stored_name"):
        delete_stored_file(resume["stored_name"])

    logger.info(
        "Resume deleted",
        extra={"event": "resume_deleted", "resume_id": str(resume["_id"])},
    )
    return jsonify({"success": True, "message": "Resume deleted."})


@bp.route("/<resume_id>/process", methods=["POST"])
@require_auth
def process_resume_route(resume_id):
    from app.services.resume_service import process_resume

    user_id = g.user_id
    # Verify ownership first
    resume = repo.get_by_user(user_id, resume_id)
    if not resume:
        raise NotFoundError("Resume not found.")

    try:
        updated = process_resume(user_id, resume_id)
        out = doc_out(updated)
        out.pop("extracted_text", None)
        return jsonify({"success": True, "data": out})
    except Exception as exc:
        logger.exception(
            "Resume processing failed",
            extra={"event": "resume_process_failed", "resume_id": resume_id},
        )
        return jsonify({"success": False, "error": {"message": str(exc)}}), 400


@bp.route("/<resume_id>/import", methods=["POST"])
@require_auth
def import_resume(resume_id):
    from app.db.repositories.career import CareerProfileRepository

    user_id = g.user_id
    resume = repo.get_by_user(user_id, resume_id)
    if not resume:
        raise NotFoundError("Resume not found.")
    if not resume.get("structured_draft"):
        raise ValidationError(
            "This resume has not been processed yet. Run extraction first."
        )

    data = request.json or {}
    sections_to_import = data.get("sections", [])

    # Whitelist allowed section names
    valid_sections = {
        "personal", "summary", "education", "skills", "experience",
        "projects", "certifications", "achievements", "languages",
    }
    sections_to_import = [s for s in sections_to_import if s in valid_sections]

    if not sections_to_import:
        raise ValidationError("No valid sections selected for import.")

    career_repo = CareerProfileRepository()
    profile = career_repo.get_by_user(user_id) or {}

    draft = resume["structured_draft"]
    for section in sections_to_import:
        if section not in draft:
            continue
        value = draft[section]
        # Strip internal metadata before importing
        if isinstance(value, dict):
            value = {k: v for k, v in value.items() if not k.startswith("_")}
        # Merge strategy: dicts are merged (non-empty values win), lists replace
        existing = profile.get(section)
        if isinstance(value, dict) and isinstance(existing, dict):
            merged = dict(existing)
            for k, v in value.items():
                if v:  # Only import non-empty values
                    merged[k] = v
            profile[section] = merged
        else:
            profile[section] = value

    updated_profile = career_repo.upsert(user_id, profile)

    # Mark the resume as imported
    repo.update(user_id, resume_id, {"status": "completed"})

    return jsonify({"success": True, "data": doc_out(updated_profile)})
