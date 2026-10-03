# ALBATROSS CAREER - Product Specification

## 1. Product Vision
**Working Name**: ALBATROSS CAREER
**Promise**: "Turn your skills into your next opportunity."
**Target Audience**: Computer science students, recent graduates, junior software engineers, and early-career developers.

ALBATROSS CAREER transitions from a general RAG knowledge assistant to a specialized, AI-driven career platform designed to bridge the gap between early-career technical talent and their target roles. It provides actionable insights, evidence-based matching, and truthful document tailoring to maximize ATS (Applicant Tracking System) success and interview conversion.

## 2. Core Philosophy
- **Truthful Tailoring**: The platform will *never* invent experience. It rewrites and re-frames the user's existing, verified skills to speak the language of the job description.
- **Evidence-Based**: Fit scores and gap analyses are backed by direct citations from the user's resume compared against explicit requirements in the Job Description.
- **ATS-First**: All exports and tailored outputs prioritize ATS readability (clean text, standard headings, parsable formats) over overly complex visual designs.

## 3. First Version Features (MVP)

### 3.1. Career Profile (Resume Upload & Parsing)
- Users can upload their base resume (PDF, DOCX, TXT, MD).
- The system extracts the raw text and uses the LLM to parse it into a structured schema:
  - Personal Info
  - Education
  - Experience (Roles, Companies, Dates, Bullets)
  - Projects
  - Skills (categorized into Languages, Frameworks, Tools)
- Users can view and manage their master career profile.

### 3.2. Resume Analysis
- The AI acts as a recruiter reviewing the base resume.
- Identifies weak bullet points (e.g., lacking metrics, using passive voice).
- Provides actionable suggestions to improve impact (e.g., "Change 'Worked on backend' to 'Developed REST APIs using Flask, reducing latency by 20%'").

### 3.3. Job Description Analysis
- Users can paste the text of a Job Description (JD).
- The system extracts key entities: Required Skills, Preferred Skills, Years of Experience, Role Responsibilities.

### 3.4. Evidence-based Job Fit
- The core matching engine compares the Parsed Resume against the Parsed JD.
- Outputs a **Match Score (0-100%)**.
- **Strengths**: Highlights explicit matches (e.g., "JD requires Python; you have 2 years of Python experience at Company X").
- **Skill Gaps**: Identifies missing requirements (e.g., "JD requires AWS; no cloud experience found in resume").

### 3.5. Truthful Resume Tailoring
- Generates a bespoke version of the user's resume for the specific JD.
- Re-orders skills to prioritize those mentioned in the JD.
- Rewrites bullet points to emphasize relevant experience without hallucinating.
- Side-by-side UI allows the user to accept, reject, or manually edit the AI's suggestions.

### 3.6. ATS-friendly PDF Export
- Generates a clean, standard, single-column PDF of the tailored resume.
- Ensures the document passes standard ATS parsing tools.

## 4. Future Roadmap (Out of Scope for V1)
- Cover Letter Generation
- Interview Preparation (Mock Q&A based on the specific JD and Resume)
- Application Tracking (Kanban board of applied jobs)
- Personalized Learning Roadmaps (Courses to bridge identified skill gaps)
- Portfolio Project Recommendations
- AI Career Agent (Conversational interface for career advice)
- Browser/Application assistant & MCP integration

## 5. Phase 1 Implementation Details
Phase 1 established the foundation for ALBATROSS CAREER:
- **Product Identity**: Rebranded from RAG Assistant to ALBATROSS CAREER ("Turn your skills into your next opportunity").
- **Visual Direction**: Implemented the dark graphite, charcoal, and electric cyan palette, with clean Sans/Mono typography (`docs/UI_SYSTEM.md`).
- **Application Shell**: Updated `AppLayout`, `Sidebar`, and `Brand` components to reflect the new navigation and aesthetics.
- **Routing**: Introduced `/app/profile`, `/app/resumes`, and placeholders for `/app/jobs`, `/app/applications`, `/app/interview`, `/app/projects`, and `/app/learning`.
- **Landing Page**: Fully rewritten to articulate the career intelligence workspace value proposition.
- **Dashboard**: Refactored to an ALBATROSS CAREER OVERVIEW highlighting Profile Completeness, Resume Readiness, Target Roles, and Recent Activity.
- **Backend Architecture**: Registered the new `career` blueprint with GET/PUT `/api/career/profile` routes and a new MongoDB `career_profiles` collection via `CareerProfileRepository`.

## 6. User Journey
1. **Onboarding**: User signs up and uploads their current resume.
2. **Profile Creation**: System parses the resume into a unified Career Profile.
3. **Discovery**: User finds an interesting job online and pastes the JD into ALBATROSS CAREER.
4. **Analysis**: System provides a Match Score and Gap Analysis.
5. **Action**: User clicks "Tailor Resume". The system generates a targeted version.
6. **Review**: User reviews changes, tweaks wording, and hits "Export".
7. **Result**: User receives an ATS-friendly PDF ready to submit to the employer.
