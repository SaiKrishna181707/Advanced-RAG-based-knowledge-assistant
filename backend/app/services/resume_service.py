import json
import logging
import re
from app.db.repositories.career_resumes import CareerResumeRepository
from app.rag.extractor import extract_document
from app.services.storage import resolve_stored_path
from app.services.llm_service import get_client, resolve_model, _completion_options

logger = logging.getLogger(__name__)
repo = CareerResumeRepository()

def process_resume(user_id: str, resume_id: str) -> dict:
    resume = repo.get_by_user(user_id, resume_id)
    if not resume:
        raise ValueError("Resume not found")
    
    stored_name = resume.get("stored_name")
    if not stored_name:
        repo.update(user_id, resume_id, {"status": "failed", "processing_status": "failed", "error_message": "No file found."})
        raise ValueError("No file found for resume")

    path = resolve_stored_path(stored_name)
    if not path or not path.exists():
        repo.update(user_id, resume_id, {"status": "failed", "processing_status": "failed", "error_message": "File is missing from storage."})
        raise ValueError("File is missing from storage")

    repo.update(user_id, resume_id, {"status": "processing", "processing_status": "extracting_text"})
    
    try:
        extraction = extract_document(path, resume.get("file_type", ""))
    except Exception as e:
        logger.exception("Resume extraction failed")
        repo.update(user_id, resume_id, {"status": "failed", "processing_status": "failed", "error_message": str(e)})
        raise
    
    # Normalize text
    raw_pages = [page.get("text", "") for page in extraction.get("pages", [])]
    raw_text = "\n\n".join(raw_pages)
    normalized_text = re.sub(r'\n{3,}', '\n\n', raw_text).strip()
    
    if not normalized_text:
        repo.update(user_id, resume_id, {"status": "failed", "processing_status": "failed", "error_message": "No readable text could be extracted."})
        raise ValueError("No readable text found")

    repo.update(user_id, resume_id, {
        "extracted_text": normalized_text,
        "extraction_metadata": {
            "page_count": extraction.get("page_count", 0),
            "character_count": len(normalized_text)
        },
        "processing_status": "extracting_structure"
    })
    
    # Structured Extraction using LLM
    try:
        structured_data = _extract_structure_with_llm(normalized_text)
        updated = repo.update(user_id, resume_id, {
            "status": "review_required",
            "processing_status": "completed",
            "extraction_status": "completed",
            "structured_draft": structured_data
        })
        return updated
    except Exception as e:
        logger.exception("Structured extraction failed")
        repo.update(user_id, resume_id, {"status": "failed", "processing_status": "failed", "error_message": "LLM structured extraction failed: " + str(e)})
        raise

def _extract_structure_with_llm(text: str) -> dict:
    client = get_client()
    model = resolve_model()
    
    prompt = (
        "You are an expert career data extractor. Your task is to extract information from the provided resume text into a strict JSON schema.\n"
        "Rules:\n"
        "1. Extract ONLY information present in the resume. NEVER invent or hallucinate missing information.\n"
        "2. Use empty strings or empty arrays when information is absent.\n"
        "3. Preserve factual wording where possible.\n"
        "4. Do NOT infer employment dates or technologies that are not explicitly stated.\n"
        "5. Output ONLY raw JSON, with no markdown code fences, no ```json, and no conversational text.\n\n"
        "Schema:\n"
        "{\n"
        '  "personal": { "name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" },\n'
        '  "summary": "",\n'
        '  "education": [ { "institution": "", "degree": "", "field": "", "start_date": "", "end_date": "" } ],\n'
        '  "skills": [ "" ],\n'
        '  "experience": [ { "company": "", "role": "", "location": "", "start_date": "", "end_date": "", "description": [ "" ], "technologies": [ "" ] } ],\n'
        '  "projects": [ { "name": "", "description": "", "technologies": [ "" ], "url": "", "start_date": "", "end_date": "" } ],\n'
        '  "certifications": [ "" ],\n'
        '  "achievements": [ "" ],\n'
        '  "languages": [ "" ]\n'
        "}\n\n"
        f"Resume Text:\n{text[:12000]}"
    )
    
    messages = [
        {"role": "system", "content": "You are a precise resume extraction system that outputs only valid JSON."},
        {"role": "user", "content": prompt}
    ]
    
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=0.0, # Zero temperature for deterministic extraction
        max_tokens=4000,
        **_completion_options(model)
    )
    
    content = (response.choices[0].message.content or "").strip()
    content = re.sub(r"^```(?:json)?|```$", "", content, flags=re.MULTILINE).strip()
    
    try:
        parsed = json.loads(content)
        # Add provenance tag safely
        _add_provenance(parsed)
        return parsed
    except json.JSONDecodeError as e:
        raise ValueError("Failed to parse LLM response as JSON") from e

def _add_provenance(data):
    if isinstance(data, dict):
        # We don't necessarily want to litter the data with provenance if it breaks the frontend expectations.
        # But the spec says: "Where practical, maintain provenance. { 'source': 'resume_extraction' }"
        # The easiest is to just tag the top-level structure, or each list item. Let's tag the top level.
        data["_metadata"] = {"source": "resume_extraction"}
