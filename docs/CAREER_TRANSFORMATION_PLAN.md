# ALBATROSS CAREER - Transformation Plan

## A. Current Architecture
The application currently operates as a Retrieval-Augmented Generation (RAG) knowledge assistant.
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, Zustand, React Router, Axios. Deployed on Vercel.
- **Backend**: Python (Flask, Gunicorn), PyMongo for MongoDB interactions, JWT for authentication, running background jobs for document ingestion. Deployed on Render.
- **Database**: MongoDB Atlas.
- **AI**: Groq API integration for LLM capabilities.
- **Features**: Document upload, RAG embedding, semantic search, AI chat with sources, collections, analytics.

## B. Existing Reusable Infrastructure
- **Authentication**: JWT generation, refresh tokens, role/tier checking, and password hashing (`backend/app/routes/auth.py`, `backend/app/db/repositories/users.py`, `frontend/src/api/client.js`, `frontend/src/store/authStore.js`).
- **Database Layer**: The `mongo.py` wrapper, repository pattern, and PyMongo configurations.
- **LLM Service**: The wrapper around Groq API (`backend/app/services/llm_service.py`).
- **Document Processing**: `extractor.py` handles PDF, DOCX, TXT which are exactly the formats needed for resumes and job descriptions.
- **Rate Limiting & Security**: Decorators for route protection, rate limits, CORS configurations.
- **Frontend Core**: Tailwind setup, `AppLayout`, `Sidebar`, `Topbar`, `ui/` primitives (Modal, Toast, Button, Input, Dropdown), and `client.js` with Axios interceptors.

## C. Components to Retain
- `frontend/src/components/ui/*`: All base UI primitives.
- `frontend/src/components/layout/*`: Core application shell, with minor visual tweaks.
- `frontend/src/components/auth/*`: Login/Signup components.
- `backend/app/services/llm_service.py` & `storage.py`.
- `backend/app/rag/extractor.py`.
- `backend/app/db/repositories/users.py`, `tokens.py`, `activity.py`, `usage.py`.
- `backend/app/routes/auth.py`, `account.py`, `meta.py`.
- Infrastructure files: `render.yaml`, `vercel.json`, `package.json`, `requirements.txt`.

## D. Components to Modify
- **Landing Page & Branding**: Update `LandingPage.jsx`, `Brand.jsx`, `Hero.jsx`, etc., from a RAG assistant to "ALBATROSS CAREER - Turn your skills into your next opportunity".
- **Dashboard (`DashboardPage.jsx`)**: Shift from generic document metrics to a "Career Profile" dashboard showing uploaded resumes, recent job fits, and tailored documents.
- **Navigation (`Sidebar.jsx`)**: Update links to point to Career Profile, Resume Analysis, Job Matcher, Tailoring, etc.
- **Documents Logic (`documents.py`)**: Expand the concept of a document to explicitly distinguish between `RESUME` and `JOB_DESCRIPTION`. Add parsing logic to extract structured JSON (skills, experience, education) from resumes.
- **Stores**: Update Zustand stores to manage career-specific states (e.g., active resume, current target job).

## E. Components to Deprecate
*Note: Do not delete immediately; phase out as new features replace them.*
- `backend/app/rag/chunker.py`, `index_store.py`, `retriever.py`, `embeddings/`: Strict vector-based retrieval is largely unnecessary if we are parsing resumes to JSON and directly feeding them + JD to the LLM.
- `frontend/src/pages/SearchPage.jsx` & `backend/app/routes/search.py`: Replaced by specific matching interfaces.
- `frontend/src/pages/ChatPage.jsx`: Unless repurposed into the "AI Career Agent" later.
- `backend/app/db/repositories/chunks.py`, `corpus.py`.

## F. New Frontend Architecture
- **Routes**:
  - `/dashboard`: Career Profile overview.
  - `/resumes`: Upload and manage base resumes.
  - `/resumes/:id/analysis`: Deep dive into a specific parsed resume.
  - `/match`: Job Description analyzer and Evidence-based Job Fit interface.
  - `/tailor`: Interactive workspace to generate a tailored resume for a specific job.
- **Stores**: `careerStore.js` to manage the active resume, active job description, and matching state.

## G. New Backend Architecture
- **Structured Extraction Workflow**: When a resume is uploaded, use `extractor.py` to get text, then use `llm_service.py` to extract a structured JSON representation (Experience, Education, Skills, Projects).
- **Matching Engine**: Service to compare parsed resume JSON against parsed Job Description JSON, outputting a fit score, gap analysis, and strengths.
- **Tailoring Engine**: Service that takes a base resume and a job description, then rewrites bullet points truthfully to highlight relevant experience.

## H. New Database Schema (Conceptual)
1. **Resumes** (repurposing `documents` or creating new):
   - `id`, `user_id`, `original_file_path`, `raw_text`, `parsed_data` (JSON), `created_at`.
2. **JobDescriptions**:
   - `id`, `user_id`, `title`, `company`, `raw_text`, `parsed_requirements` (JSON), `created_at`.
3. **JobMatches** / **Applications**:
   - `id`, `user_id`, `resume_id`, `job_id`, `fit_score`, `gap_analysis` (JSON), `tailored_resume_id`.

## I. New API Routes
- `POST /api/career/resumes/upload`: Handle upload, trigger extraction, store base resume.
- `GET /api/career/resumes`: List user's base resumes.
- `POST /api/career/jobs/analyze`: Submit a JD text/URL for requirement extraction.
- `POST /api/career/match`: Calculate fit between a resume ID and a JD ID.
- `POST /api/career/tailor`: Generate a tailored version of a resume for a given JD.
- `POST /api/career/export`: Generate PDF for ATS export.

## J. Environment Variables
- No new infrastructure variables required immediately.
- May add variables for feature flags or specific LLM constraints for structured JSON generation:
  - `LLM_JSON_MODEL=llama-3.3-70b-versatile` (If Groq's openAI wrapper struggles with JSON vs others).

## K. Deployment Considerations
- **Vercel** & **Render** configurations remain untouched. The architecture is fully compatible.
- The shift from vector retrieval to LLM extraction relies purely on Groq, meaning the Render container will actually use *less* RAM/CPU locally since `faiss-cpu` and `sentence-transformers` won't be heavily utilised.

## L. Security Considerations
- Data Privacy: Resumes contain PII. The existing isolated tenant model via JWT and `user_id` filters in the PyMongo repositories must be strictly maintained for the new collections.
- "Truthful Resume Tailoring": Prompt engineering must enforce strict boundaries so the AI does not hallucinate fake experience, but rather re-frames existing experience.

## M. Testing Strategy
- **Backend**: Extend Pytest suite. Add specific tests for the new `ResumeParser` and `JobMatcher` services, mocking the LLM responses to ensure JSON schemas are validated properly.
- **Frontend**: Add Vitest/React Testing Library specs for the new Job Fit UI and Tailoring workspace.

## N. Phase-by-Phase Implementation Plan
**Phase 1: Foundation & Repositioning**
- Update branding across Landing Page, Navbar, and emails to "ALBATROSS CAREER".
- Restructure Sidebar navigation.
- Update Dashboard to show "Career Profile" placeholders.

**Phase 2: Resume Ingestion**
- Build `ResumeUploadPage`.
- Create `/api/career/resumes/upload`.
- Integrate `extractor.py` to get text, and pass it to Groq to return structured JSON.
- Build the "Resume Analysis" view showing the extracted skills and experience.

**Phase 3: Job Description & Match Engine**
- Build the Job Description input interface.
- Implement the "Evidence-based Job Fit" service on the backend.
- Build the UI to display the Match Score, Strengths, and Skill Gaps.

**Phase 4: Resume Tailoring & Export**
- Implement the "Truthful Resume Tailoring" LLM workflow.
- Build the side-by-side comparison UI (Original vs Tailored).
- Implement basic ATS-friendly PDF export (using a frontend library like `@react-pdf/renderer` or backend HTML-to-PDF).

**Phase 5: Cleanup**
- Safely remove unused legacy RAG components (`index_store.py`, `chunks.py`, `SearchPage`).
