from flask import Blueprint, request, jsonify, g
from app.db.repositories.career import CareerProfileRepository
from app.security import require_auth
from app.db.serialize import doc_out

bp = Blueprint("career", __name__, url_prefix="/career")
repo = CareerProfileRepository()

@bp.route("/profile", methods=["GET"])
@require_auth
def get_profile():
    user_id = g.user_id
    profile = repo.get_by_user(user_id)
    if not profile:
        return jsonify({"success": True, "data": None})
    return jsonify({"success": True, "data": doc_out(profile)})

@bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile():
    user_id = g.user_id
    data = request.json
    if not data:
        return jsonify({"success": False, "error": {"message": "Invalid payload"}}), 400
    
    # Basic validation for Phase 1
    safe_data = {
        "personal": data.get("personal", {}),
        "summary": data.get("summary", ""),
        "education": data.get("education", []),
        "skills": data.get("skills", []),
        "experience": data.get("experience", []),
        "projects": data.get("projects", []),
        "certifications": data.get("certifications", []),
        "achievements": data.get("achievements", []),
        "languages": data.get("languages", []),
        "links": data.get("links", []),
        "target_roles": data.get("target_roles", []),
        "preferences": data.get("preferences", {}),
    }
    
    profile = repo.upsert(user_id, safe_data)
    return jsonify({"success": True, "data": doc_out(profile)})
