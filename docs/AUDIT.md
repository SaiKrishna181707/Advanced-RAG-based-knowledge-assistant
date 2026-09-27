# ALBATROSS - Repository Audit (Phase 1)

Audit of the pre-existing `Advanced-RAG-based-knowledge-assistant` codebase, performed
before any modification. Everything below was verified by reading the source, not by
trusting the README.

## 1. What actually existed

### Backend (Flask, single-process)

| Area | Reality |
|------|---------|
| App factory | `app/__init__.py`, 4 blueprints, CORS allow-list containing `*` |
| Extraction | `rag/extractor.py`, PDF only, via `pdfplumber` + table to markdown |
| Chunking | `rag/chunker.py`, custom recursive splitter, 500 chars / 50 overlap |
| Embeddings | `rag/embedder.py`, **feature hashing** into 512 dims using builtin `hash()` |
| Vector store | FAISS `IndexFlatIP`, persisted to hardcoded `/tmp/faiss.index` |
| Keyword search | `rank_bm25` BM25Okapi, rebuilt from scratch on every query |
| Fusion | Weighted sum `0.65 * bm25 + 0.35 * dense`, labelled `rrf_score` (it is not RRF) |
| LLM | Groq `llama-3.3-70b-versatile`, blocking, `max_tokens=1024`, `temperature=0.1` |
| Persistence | SQLAlchemy + SQLite at `/tmp/rag_assistant.db`, 4 tables |
| Tables | `documents`, `chunks`, `conversations`, `messages` - **no user tables** |
| Auth | None. Every endpoint is public and unauthenticated. |

### Frontend (React 18 + Vite + Tailwind + Zustand)

Pages: `ChatPage` (mounted at `/`), `DocumentsPage`, `CollectionsPage`, `SearchPage`,
`AnalyticsPage`, `SettingsPage`. Components: `Sidebar`, `Topbar`, `UploadZone`,
`MessageBubble`, `ChatInput`, `TypingIndicator`, `Toast`. Dark-only theme, purple accent.

## 2. Broken functionality

1. **`requirements.txt` cannot install.** `faiss-cpu==1.14.3` does not exist on PyPI
   (published versions: 1.11.0.post1, 1.12.0, 1.13.0-1.13.2, 1.15.1). The Render build
   fails at `pip install -r requirements.txt`. The deployed backend cannot be rebuilt
   from this repository.
2. **The embedding function is non-deterministic across processes.** `_text_to_vector`
   uses Python's builtin `hash()`, which is salted by `PYTHONHASHSEED` and differs between
   interpreter runs. A FAISS index written by one worker is therefore meaningless to the
   next one. Persisted vectors never match freshly computed query vectors, so dense
   retrieval silently returns noise rather than raising an error.
3. **All persistent state lives in `/tmp`.** `FAISS_INDEX_PATH`, `CHUNK_STORE_PATH` and the
   default DB URL are hardcoded to `/tmp`. On Render this is wiped on every restart and
   deploy, and the `disk:` mount declared in `render.yaml` is never used. Metadata and
   vectors are lost together.
4. **`DATABASE_URL` is silently ignored.** `_get_engine()` rewrites any SQLite URL that
   does not contain `/tmp` into `/tmp/rag_assistant.db`, so the documented
   `DATABASE_URL=sqlite:///rag_assistant.db` has no effect.
5. **A new engine is created on every `SessionLocal()` call.** No connection pooling;
   engines leak; `init_db()` creates a third one.
6. **BM25 is rebuilt on every query**, and `max(bm25_scores)` is recomputed inside the
   per-chunk loop, making each query O(n^2) in corpus size.
7. **`delete_document_vectors()` re-embeds every remaining chunk** on every delete.
8. **Vector/metadata mapping is positional and unused.** `Chunk.faiss_index` is written to
   SQLite but never read; retrieval guesses that FAISS ids line up with the in-memory list.
9. **No conversation memory.** Follow-up questions are sent to the LLM as standalone
   queries, so "What dataset did they use?" cannot resolve against the previous turn.
10. **Search ignores the hybrid retriever.** `routes/search.py` calls `embedder.search`
    directly, so the Search page is dense-only while the UI and Analytics claim hybrid.
11. **Collections cannot be created.** Collection is a free-text column; the upload form is
    a hardcoded `<select>` of five literal strings.
12. **Internal errors are returned to clients** - `jsonify({"error": str(e)})` in
    `documents.py` and `chat.py` exposes exception text.
13. **`httpx` is imported but not declared** in `requirements.txt` (it works only as a
    transitive dependency of `groq`).

## 3. Incomplete functionality

- No streaming, stop, regenerate, retry, feedback, rename or search for conversations.
- No document preview, no source panel, no page-level inspection.
- No pagination on any list endpoint.
- No duplicate detection (re-uploading the same file re-ingests it).
- No background processing - the whole pipeline runs inside the HTTP request and risks the
  120s gunicorn timeout on large PDFs.
- No document checksum, MIME type, processing time or error detail is stored.
- No user settings are persisted; the Settings page is a read-only hardcoded table.
- Health check returns a constant string and verifies nothing.

## 4. Duplicated / contradictory functionality

- README, `AnalyticsPage` and `SettingsPage` all describe `all-MiniLM-L6-v2 (384d)` and
  `FAISS IndexFlatL2`. The implementation is 512-d feature hashing with `IndexFlatIP`.
  These are fabricated configuration displays.
- README's tech table claims PyMuPDF and LangChain. Neither is imported anywhere.
- `SearchPage` reimplements retrieval UI that `ChatPage` already renders.

## 5. Security issues

| Severity | Issue |
|----------|-------|
| Critical | No authentication or authorization on any endpoint |
| Critical | No data isolation - a single global corpus for all visitors |
| High | `CORS origins` includes `"*"`, so the allow-list is meaningless |
| High | Exception text returned to API clients |
| Medium | No rate limiting anywhere (auth, upload, LLM cost) |
| Medium | Extension-only file validation; no MIME sniffing or magic-byte check |
| Medium | No upload size check before writing to disk (only Flask's global cap) |
| Medium | `Message.sources` is an unvalidated JSON string blob |
| Low | No request ID correlation, no structured logs |

Note: filename sanitisation via `secure_filename` is present and correct, and the
L2-normalised inner-product maths itself is sound.

## 6. Deployment issues

- `faiss-cpu==1.14.3` breaks the build (see 2.1).
- `/tmp` persistence is destroyed on every Render restart; the declared disk is unused.
- CORS does not restrict production origins.
- `runtime.txt` is pinned to `python-3.11.9` while the whole pipeline is untested on it.
- Frontend `vite.config.js` proxies to `localhost:5000` and the README instructs users to
  edit it for production, which is unnecessary because `VITE_API_URL` already exists.
- No `vercel.json`, no SPA rewrite config - deep links 404 on Vercel.
- No health/readiness signal that a load balancer can trust.

## 7. Scalability limitations

- Single global FAISS index and module-level mutable state (`_index`, `_chunk_store`)
  assume exactly one process; multiple gunicorn workers would each hold a divergent copy
  and overwrite each other's index files.
- The entire chunk corpus is always held in RAM and scored per query.
- No index versioning, so an embedding-model change silently corrupts retrieval.
- No per-tenant partitioning of retrieval.

## 8. UX problems

- The app opens straight into a chat screen - there is no product surface, no explanation
  and no sign-in, so a first-time visitor has no idea what the product is.
- `body { overflow: hidden }` globally, which breaks scrolling on mobile.
- No light mode; no responsive sidebar behaviour below `md`.
- Modals have no focus trap, no `role="dialog"`, no Escape handling.
- Icon-only buttons lack `aria-label`; there is no skip link and no focus-visible styling.
- Interactive elements are `<div onClick>` rather than buttons.
- `text-muted` (#5a5a72) on `bg-primary` (#0a0a0f) is roughly 3.3:1, below WCAG AA.
- No error boundary; a render error blanks the app.
- The brand is "RAG Assistant" with a bare brain icon and "Built by Sai Krishna".

## 9. Opportunities for major product improvement

1. Introduce a real product shell: landing page, auth, dashboard, protected routes.
2. Move persistence to MongoDB with per-user ownership enforced server-side.
3. Make FAISS a *derived*, per-user, rebuildable index with MongoDB as the source of truth.
4. Replace builtin-`hash` feature hashing with a deterministic embedder behind a
   pluggable provider interface, and version the index by provider + dimension.
5. Real hybrid retrieval: BM25 (cached) + dense, fused with genuine Reciprocal Rank Fusion,
   plus metadata filtering and scope selection.
6. Grounded answers with resolvable citations (document name + page + text) served from
   stored chunk records rather than parsed filenames.
7. Collections as first-class entities with CRUD, statistics and chat scope.
8. Analytics built from real events, not fabricated configuration.
9. Subscription/plan architecture with centrally configured limits and usage metering.

## 10. Target architecture

```
Frontend (Vercel)          Backend (Render)                 Data
-----------------          ----------------                 ----
Landing  ->  Auth     ->   Flask app factory           ->   MongoDB Atlas
Dashboard             ->   routes/ (thin, validated)   ->   - users, documents,
Chat / Documents /         services/ (orchestration)        chunks, collections,
Collections / Search /     rag/ (pure functions)            conversations, messages,
Analytics / Settings       db/repositories (Mongo only)     activity, feedback, usage
                                                             
                           embeddings/ (pluggable)      ->   FAISS (per-user, derived)
                           vector_store.py                   
                           llm_service.py               ->   Groq
                           storage/ (local disk now,    ->   uploaded files
                                     S3-swappable)
```

**Source-of-truth rule.** MongoDB owns all application data, including chunk text and
metadata. FAISS holds only vectors and is rebuildable from MongoDB at any time, so a lost
or stale index self-heals instead of destroying retrieval quality.

**Isolation rule.** Every MongoDB query is scoped by `user_id` derived from the verified
JWT. Document and collection ids from the client are never trusted as ownership proof.

## 11. Decisions taken (and why)

- **Embeddings.** Keep a local, dependency-free default but make it *deterministic*
  (blake2b-based feature hashing with sublinear TF and L2 normalisation) and expose a
  provider interface so `sentence_transformers` (all-MiniLM-L6-v2, 384d) or a hosted API
  can be enabled by env var. Rationale: `faiss-cpu` and `torch` do not publish wheels for
  the Windows ARM64 target used for local verification, and Render's free tier (512 MB)
  cannot host torch comfortably. The docs will state exactly this instead of claiming
  sentence-transformers.
- **Vector search.** Use FAISS when importable; otherwise fall back to an exact NumPy
  inner-product index. Both are behind one interface, so the app runs everywhere and
  retrieval quality is identical for the corpus sizes involved.
- **Auth.** Email + password with Werkzeug `scrypt` hashing, short-lived HS256 JWTs sent
  as `Authorization: Bearer`. Chosen over cross-site httpOnly cookies because the frontend
  and backend live on different registrable domains (Vercel / Render), where
  `SameSite=None` cookies add CSRF surface without removing storage risk.
- **Do not rewrite** the chunker, the extractor's table handling, the L2/IP maths, the
  React component structure, or the Zustand store shape. These are sound.
