# ALBATROSS CAREER - Resume Extraction Pipeline

## 1. Overview
The resume extraction pipeline converts a user's unstructured resume file (PDF, DOCX, TXT, MD) into a structured JSON representation of their career history, without fabricating or inventing missing information.

The core principle is:
**RESUME → EXTRACTION → STRUCTURED DRAFT → USER REVIEW → CAREER PROFILE**

## 2. Pipeline Steps

### 1. Upload & Validation
- **Action**: User uploads a file via the frontend Dropzone component.
- **Validation**: Frontend validates MIME types and size (max 10MB). Backend explicitly verifies file extension and binary signatures via `validate_extension` and `_assert_content_matches`.
- **API**: `POST /api/career/resumes`

### 2. Storage
- **Action**: The uploaded file is saved securely to the existing local filesystem storage via `save_upload`.
- **Security**: The filename is sanitized. The file is placed in a user-isolated directory. We do not store large binary files directly inside MongoDB.

### 3. Text Extraction
- **Action**: Triggered via `POST /api/career/resumes/:id/process`.
- **Implementation**: The pipeline reuses `app.rag.extractor.extract_document`, leveraging `pdfplumber` for PDFs and `python-docx` for Word documents.
- **Error Handling**: If no readable text is found (e.g., scanned images), it fails with a clear message indicating OCR is not currently supported.

### 4. Text Normalization
- **Action**: The raw paginated text is joined and whitespace is normalized (e.g., removing excessive blank lines) to create a clean string for the LLM.
- **Limits**: The normalized text is truncated to ~12000 characters if overly long, to fit comfortably within context limits.

### 5. Structured Extraction (LLM)
- **Action**: The normalized text is passed to the existing LLM service (Groq) with a strict system prompt and zero temperature.
- **Rules Enforced**: 
  - Never invent facts, dates, or technologies.
  - Return missing information as empty strings/arrays.
  - Output strict JSON according to the schema (Personal, Education, Skills, Experience, Projects, etc.).
- **Provenance**: The extracted JSON is tagged with `_metadata: { source: "resume_extraction" }` to distinguish it from manual user entries.

### 6. User Review & Import
- **Action**: The frontend displays the parsed draft side-by-side with import controls.
- **Import Strategy**: The user selects which sections to import into their canonical Career Profile. 
- **Merge Logic**: The `POST /api/career/resumes/:id/import` endpoint applies the selected sections. Currently, lists are overwritten, but objects (like personal info) are merged safely without destroying existing keys unless explicitly replaced.

## 3. Future Capabilities
- **Async Processing**: Extraction is currently synchronous on the `/process` route. As scale grows, this should be deferred to a background worker (e.g., Celery/Redis).
- **OCR**: Image-heavy PDFs currently fail gracefully. Future iterations could integrate Tesseract or a cloud Vision API prior to the text extraction phase.
- **Confidence Scores**: If the LLM provider offers reliable logprobs in the future, we could attach field-level confidence scores.

## 4. Privacy & Security
- Resumes are stored in tenant-isolated paths.
- The raw resume text and PII are deliberately kept out of application logs.
- The user_id is explicitly derived from the JWT context on every request; the frontend can never supply another user's ID to access their resumes.
