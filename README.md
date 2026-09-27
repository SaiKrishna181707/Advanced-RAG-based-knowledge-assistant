# ALBATROSS

**Navigate your knowledge.**

ALBATROSS is an AI knowledge assistant for your private documents. Upload PDFs,
Markdown, text, Word and CSV files, and ask questions in plain language. Every
answer is grounded in retrieved passages and carries citations you can open and
inspect down to the page.

> Turn your documents into an intelligent, searchable knowledge base. Ask
> questions in plain language and get grounded answers with transparent sources.

---

## Contents

- [Product overview](#product-overview)
- [Architecture](#architecture)
- [Features](#features)
- [The RAG pipeline](#the-rag-pipeline)
- [MongoDB architecture](#mongodb-architecture)
- [Authentication and multi-tenancy](#authentication-and-multi-tenancy)
- [Subscription plans](#subscription-plans)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Deployment](#deployment)
- [Security](#security)
- [Observability](#observability)
- [Testing](#testing)
- [Screenshots](#screenshots)
- [Roadmap](#roadmap)
- [Known limitations](#known-limitations)

---

## Product overview

ALBATROSS replaces the "upload a file, get a black-box answer" pattern with a
retrieval system you can audit. The product is built around one loop:

```
UPLOAD -> UNDERSTAND -> ASK -> RETRIEVE -> ANSWER -> VERIFY
```

1. **Upload** - Add PDFs, Word documents, Markdown, text or CSV to a collection.
2. **Understand** - ALBATROSS stores the file, extracts its text page by page,
   splits it into overlapping chunks and indexes those chunks.
3. **Ask** - You ask a question in natural language.
4. **Retrieve** - Hybrid retrieval combines dense vector similarity with BM25
   keyword ranking and fuses the two with Reciprocal Rank Fusion.
5. **Answer** - The LLM writes an answer using only the retrieved passages.
6. **Verify** - Each answer lists its sources, and every citation opens the
   original text with document name, page and relevance score.

The knowledge base is per-user. Two accounts never share documents, chunks,
conversations, collections, analytics or settings.

---

## Architecture

ALBATROSS has exactly one responsibility per storage layer. Nothing is duplicated
across them, and the boundary is deliberate.

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| API | Flask 3 (app factory + blueprints) | HTTP, validation, auth, orchestration |
| Application persistence | **MongoDB** (PyMongo) | Users, documents, chunks, collections, conversations, messages, activity, feedback, usage |
| Vector retrieval | **FAISS `IndexFlatIP`** (NumPy fallback) | In-memory dense index, rebuilt from the `chunks` collection |
| Lexical retrieval | **rank-bm25 `BM25Plus`** | In-memory keyword index over chunk text |
| File storage | Local disk now, object storage later | Original uploaded bytes |
| Answer generation | **Groq** chat completions | Grounded answers and follow-up suggestions |
| Frontend | React 18 + Vite + Tailwind + Zustand | Landing page, dashboard, chat, search, analytics |

```
                    +---------------------------+
   Browser  ----->  |  Vercel static frontend   |
                    |  React 18 + Vite          |
                    +-------------+-------------+
                                  |  HTTPS  /api/*
                                  v
                    +---------------------------+
                    |  Render web service       |
                    |  gunicorn -> Flask        |
                    |  auth | routes | services |
                    +--+---------+---------+----+
                       |         |         |
        +--------------+         |         +-----------------+
        v                        v                           v
+---------------+   +------------------------+   +---------------------+
| MongoDB Atlas |   | In-memory hybrid index |   | Local disk / object |
|  source of    |   |  FAISS IndexFlatIP     |   | storage             |
|  truth        |   |  + BM25Plus            |   |  original uploads   |
+-------+-------+   +-----------+------------+   +---------------------+
        |                       ^
        |  chunks collection    |  rebuild on corpus revision change
        +-----------------------+

                    +---------------------------+
                    |  Groq API (LLM)           |  <-- answer generation
                    +---------------------------+
```

Two rules keep this clean:

- **MongoDB is the source of truth.** The vector and keyword indexes are derived
  structures. Deleting the index costs a rebuild, not data. This is why the
  FAISS index is *not* stored in MongoDB: it is a cache, not a record.
- **Every query is scoped by `user_id`.** Repository functions take `user_id` as
  a required argument, so an unscoped read is not expressible in the codebase.

The FAISS index is cached in memory, keyed by the owner's corpus revision, with
an LRU bound of 8 users. It is rebuilt only when chunks are added or removed.

---

## Features

### Knowledge base
- **Multi-format ingestion** - PDF, DOCX, Markdown, TXT and CSV. Formats that
  cannot be extracted reliably are rejected at validation time rather than
  silently producing empty documents.
- **Per-page provenance** - PDF text keeps its page number; DOCX and other
  formats record a section or row unit, so citations are always locatable.
- **Duplicate detection** - Files are hashed (SHA-256) on upload. Re-uploading
  the same bytes for the same user returns `409 Document already exists.`
- **Visible processing states** - `UPLOADING -> PROCESSING -> INDEXING -> READY`
  (or `FAILED`), with `processing_ms`, `chunk_count` and a safe error message.
- **Collections as knowledge spaces** - Create, rename and delete collections,
  move documents between them, and read per-collection statistics.
- **Background processing** - Ingestion runs off the request thread by default,
  so upload returns `202` immediately. Set `PROCESSING_MODE=sync` for tests.

### Retrieval and answers
- **Hybrid retrieval** - Dense (FAISS/NumPy) + BM25Plus, fused with Reciprocal
  Rank Fusion (`RRF_K=60`) rather than a weighted sum of incomparable scores.
- **Metadata filtering** - Restrict retrieval by collection, document, or both,
  applied as a position mask inside the index.
- **Answer discipline** - The model is instructed to answer only from retrieved
  context, to say plainly when the answer is not in the documents, and to mark
  inference as inference.
- **Rich citations** - `[1] ResearchPaper.pdf - Page 12`, where `[1]` is
  clickable and opens a source panel with the retrieved text and score.
- **Incomplete-scope notice** - If part of the requested scope is still
  processing, the answer says so instead of silently ignoring those documents.
- **Streaming** - `POST /api/chat/stream` emits newline-delimited JSON
  (`meta -> sources -> delta* -> done`) so answers render as they are written.
  Stop generation aborts the request; regenerate replaces the last turn.

### Conversations
- New / rename / delete / clear conversations, with searchable history.
- Persistent messages with timestamps and per-message source snapshots.
- Conversational memory bounded by `CONVERSATION_HISTORY_TURNS` (plan-dependent),
  so follow-ups like *"what dataset did they use?"* resolve against the previous
  turn without sending the whole thread to the model.
- Context-aware follow-up suggestions generated from the answer and its sources.

### Search
- Semantic, keyword or hybrid mode, with relevance, similarity and keyword
  subscores reported per result.
- Filters for collection, document and date, plus a snippet preview and a
  click-through to the full source chunk.

### Analytics and account
- Documents, pages, chunks, questions, conversations, storage usage, processing
  failures, retrieval and LLM latency, questions over time, most-queried
  documents, and documents by collection.
- Usage meters against the plan limits (`42 / 200 questions`, `1.2 GB / 10 GB`).
- Activity feed of uploads, processing, deletions, questions, searches and
  collection changes.
- Answer feedback (helpful / not helpful, with an optional comment).

### Experience
- Landing page with an interactive product preview, authentication, protected
  routes and a dashboard shell.
- Light / dark / system theme with an accessible, consistent design system.
- Markdown answers with tables, code highlighting and math rendering.
- Responsive layout with an overlay sidebar on small screens.
- Keyboard shortcuts: `Ctrl/Cmd+K` search, `Ctrl/Cmd+Enter` send, `Esc` close
  panels, `Ctrl/Cmd+Shift+O` new conversation.

---

## The RAG pipeline

### Ingestion

```
upload -> validation -> file storage -> text extraction -> metadata extraction
       -> chunking -> embedding -> indexing -> MongoDB metadata -> ready
```

| Stage | Implementation | Notes |
|-------|----------------|-------|
| Validation | `services/storage.py` | Extension allow-list, size limit, magic-byte check |
| File storage | `services/storage.py` | Content-addressed path under `UPLOAD_FOLDER` |
| Extraction | `rag/extractor.py` | **pdfplumber** for PDF, **python-docx** for DOCX, direct read for MD/TXT, `csv` module for CSV |
| Chunking | `rag/chunker.py` | 500 characters with 50 overlap, minimum 30 characters |
| Embedding | `rag/embeddings/` | Provider selected by `EMBEDDING_PROVIDER` |
| Indexing | `rag/index_store.py` | Dense + BM25 views over the same chunk set |
| Persistence | `db/repositories/` | Document record, chunk records, corpus revision bump |

### Retrieval

```
query -> preprocess -> [dense search | BM25 search] -> RRF fusion
      -> metadata filter -> deduplicate -> top-k -> context window
```

- **Query preprocessing** normalises whitespace and drops queries that carry no
  lexical content.
- **Dense search** runs inner product over L2-normalised vectors, which is
  cosine similarity. FAISS `IndexFlatIP` is exact, not approximate; a NumPy
  fallback is used when FAISS is not installed.
- **BM25 uses `BM25Plus`, not `BM25Okapi`.** Okapi's IDF goes negative for terms
  that appear in more than half the corpus, which produces negative scores on
  small knowledge bases. BM25Plus cannot.
- **Fusion is Reciprocal Rank Fusion**, `weight / (k + rank)` summed across the
  ranked lists. RRF is rank-based, so it does not require dense cosine scores and
  BM25 scores to be on the same scale. The per-list weights are configurable
  (`DENSE_WEIGHT`, `BM25_WEIGHT`).
- **Deduplication** collapses repeated passages by document, page and a text
  fingerprint, so overlapping chunks do not fill the context window twice.
- **Relevance** is reported as the fused score normalised against the best hit in
  the result set, alongside the raw `similarity` and `keyword_score`.

### Embeddings - what is actually used

The default provider is **`hashing`**: a deterministic feature-hashing embedder
(`blake2b`, 1024 dimensions) over unigrams and word bigrams, with a stopword
filter and L2 normalisation. It is documented as `blake2b-tf-bigram` and
reported verbatim by `GET /api/health`.

**This is a lexical representation, not a semantic one.** It is the default for
concrete engineering reasons:

- `sentence-transformers` pulls in PyTorch, which has no Windows ARM64 wheel and
  does not fit Render's smaller instance types. A default that cannot be
  installed on the supported platforms is not a usable default.
- It requires no model download, so cold starts and first-query latency stay flat.
- Its bigram component retains phrase-level signal, which recovers a meaningful
  part of what pure keyword search misses.

The trade-off is real and is not hidden: paraphrases that share no vocabulary
with the source text will not be retrieved by the dense half of hybrid retrieval.
BM25 carries those queries. **This is not the semantic embedding quality a
production knowledge product should ship**, and it is the first item on the
roadmap.

A real embedding model is one environment variable away:

```bash
pip install sentence-transformers
# backend/.env
EMBEDDING_PROVIDER=sentence_transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIM=384
```

Changing the provider changes the embedding signature, which invalidates the
cached index. Re-ingest (or re-index) after switching so chunks and queries are
embedded by the same model.

### Answer generation

- The prompt carries the retrieved passages, each labelled with its source index,
  document name and page.
- The system instruction requires grounding in the supplied context, explicit
  statements when the context is insufficient, and citation markers for claims.
- Providers occasionally emit full-width CJK bracket citations. These are
  normalised to `[n]` before the response leaves the server.
- Citations that point past the end of the source list are pruned, so the UI
  never renders a citation with no target.

### Model selection

`GROQ_MODEL` is a *preference*, not a hard requirement. On first use the API key
is probed against the provider's model list; if the configured model is not
reachable, ALBATROSS falls back through `GROQ_MODEL_PREFERENCE`:

```
openai/gpt-oss-120b -> llama-3.3-70b-versatile -> openai/gpt-oss-20b -> qwen/qwen3.8-27b
```

`GET /api/health` reports the model actually in use, and whether a fallback is
active. If the model list cannot be read at all, the configured model is used
unchanged so the real provider error surfaces instead of being masked.

**Reasoning models need a generous token budget.** `openai/gpt-oss-*` spends part
of `max_tokens` on hidden reasoning before emitting a single visible character.
With a small budget the answer comes back empty. Set `LLM_MAX_TOKENS` well above
the expected answer length (the default is 2048) and set `LLM_REASONING_EFFORT`.

---

## MongoDB architecture

Database: `MONGODB_DB_NAME` (default `albatross`; `MONGODB_DATABASE` is accepted
as a legacy alias). MongoDB holds all application state; the vector index is
derived and rebuildable.

| Collection | Holds | Isolation key |
|-----------|-------|---------------|
| `users` | Account, password hash, profile, plan, subscription status, preferences | `_id` |
| `documents` | File metadata, extraction/indexing status, checksum, page and chunk counts | `user_id` |
| `chunks` | Chunk text, embedding vector, page and index position | `user_id` |
| `collections` | Knowledge spaces | `user_id` |
| `conversations` | Thread metadata, title, last activity | `user_id` |
| `messages` | Turns, sources snapshot, timings, model used | `conversation_id`, `user_id` |
| `activity` | Audit trail of user actions | `user_id` |
| `feedback` | Answer ratings and comments | `user_id` |
| `usage` | Per-period counters (documents, storage, questions) | `user_id` |
| `corpus_state` | Per-user corpus revision that drives index invalidation | `user_id` |

**Indexes** are created idempotently on boot by `db/mongo.py:ensure_indexes()`:

`users.email` (unique), `users.subscription_plan`,
`documents.user_id + created_at`, `documents.user_id + collection_id`,
`documents.user_id + sha256` (unique, partial on `sha256` being a string),
`documents.user_id + status`, `chunks.user_id + document_id`,
`chunks.user_id + collection_id`, `chunks.document_id + chunk_index`,
`collections.user_id + name` (unique), `collections.user_id + created_at`,
`conversations.user_id + updated_at`,
`messages.conversation_id + created_at`, `messages.user_id + created_at`,
`activity.user_id + created_at`, `activity.user_id + event`,
`feedback.user_id + created_at`, `feedback.message_id` (unique),
`usage.user_id + period` (unique), `corpus_state.user_id` (unique).

Two details worth noting:

- The checksum index is **partial**. Without
  `partialFilterExpression: {sha256: {$type: "string"}}`, every document with no
  checksum would collide on `null` and the second upload would fail.
- If an index exists with the same name but different options (a schema change
  between deployments), it is dropped and recreated so the running database
  matches the code, instead of silently keeping the old shape.

Database access goes through `app/db/repositories/` (one module per collection),
so query construction is not scattered across routes.

---

## Authentication and multi-tenancy

- **Email + password.** Passwords are hashed with Werkzeug's `scrypt` (salted,
  memory-hard). Plaintext is never stored and never logged.
- **Short access tokens + rotating refresh tokens.** The access token is an HS256
  JWT signed with `JWT_SECRET`, sent as `Authorization: Bearer <token>` and valid
  for `JWT_ACCESS_TTL_MINUTES` (default 30). A longer refresh token, signed with
  the separate `JWT_REFRESH_SECRET`, is exchanged at `POST /api/auth/refresh` for
  a new pair. Each refresh token carries a `jti` (its `_id`) and a session
  `family`; using one rotates it, and replaying an already-revoked token is
  treated as theft and revokes the whole family. Refresh tokens are stored
  server-side so logout and password changes can revoke them, and a TTL index
  reclaims expired rows. Both tokens live in `localStorage`; the API client
  refreshes transparently once on a `401` and signs the user out if that fails.
- **Protected by default.** Only signup, login and the public metadata endpoints
  (`/api/health`, `/api/plans`) are unauthenticated, along with the refresh and
  logout endpoints that exist precisely for sessions that have already lapsed or
  are being ended. Every other route is wrapped in `@require_auth`, which resolves
  the token to a user document and attaches it to the request. Refresh tokens are
  never accepted as access tokens, or vice versa.
- **Ownership is enforced server-side, on every query.** Repositories take
  `user_id` as a required parameter and filter on it, so changing an ID in a
  request body or URL cannot reach another account's data. A resource that
  belongs to someone else returns `404`, not `403`, so IDs are not probe-able.
- **Never exposed.** `password_hash` and `billing_customer_id` are stripped by
  the public projection before any user object is serialised.

---

## Subscription plans

The plan catalogue lives in one place (`services/plans.py`) and is read by the
routes, the usage meter and the landing page pricing table, so a limit is never
hardcoded twice. `GET /api/plans` is public.

| | Free | Pro | Team |
|---|---|---|---|
| Price | $0 | $19 / month | $79 / month |
| Documents | 25 | 1,000 | 10,000 |
| Storage | 100 MB | 10 GB | 100 GB |
| Questions | 200 / month | 10,000 / month | 100,000 / month |
| Max file size | 25 MB | 50 MB | 100 MB |
| Retrieval depth | top 4 | top 8 | top 10 |
| Conversation memory | 3 turns | 6 turns | 8 turns |

Usage is tracked per period in the `usage` collection and enforced on upload and
on question. Exceeding a limit returns **402** with code `usage_limit_reached`,
which the UI turns into an upgrade prompt.

> **Billing is not connected.** There is no payment provider and no payment is
> taken. `/api/plans` reports `billing: { provider: null, mode: "manual" }`, and
> the landing page states this explicitly. What *is* in place is the data model a
> provider needs: `subscription_plan` and `subscription_status` on the user
> document, a reserved `billing_customer_id`, a `subscription.changed` activity
> event, and one place to call a billing API (`POST /api/me/plan`). Adding Stripe
> is additive work, not a rewrite. Plan changes made today are recorded, not
> charged.

---

## Project structure

```
albatross/
├── backend/
│   ├── app/
│   │   ├── __init__.py            # create_app(): blueprints, CORS, errors, logging
│   │   ├── config.py              # every environment read in the project
│   │   ├── errors.py              # typed API errors -> HTTP status + safe message
│   │   ├── security.py            # scrypt hashing, JWT issue/verify
│   │   ├── deps.py                # @require_auth, current-user resolution
│   │   ├── validators.py          # request payload validation
│   │   ├── serializers.py         # envelope + public projections
│   │   ├── ratelimit.py           # per-route sliding-window limiter
│   │   ├── logging_config.py      # structured JSON logs with request ids
│   │   ├── db/
│   │   │   ├── mongo.py           # client, health, ensure_indexes()
│   │   │   ├── serialize.py       # ObjectId/datetime marshalling
│   │   │   └── repositories/      # users, documents, chunks, collections,
│   │   │                          # conversations, activity, feedback, usage, corpus
│   │   ├── rag/
│   │   │   ├── extractor.py       # pdfplumber / python-docx / csv -> pages
│   │   │   ├── chunker.py         # pages -> overlapping chunks
│   │   │   ├── embeddings/        # hashing | sentence_transformers providers
│   │   │   ├── index_store.py     # FAISS + BM25 index, per-user, revision keyed
│   │   │   ├── retriever.py       # hybrid search, RRF, dedup, snippets
│   │   │   └── ingest.py          # the ingestion pipeline
│   │   ├── routes/                # auth, documents, collections, chat,
│   │   │                          # conversations, search, analytics, account, meta
│   │   └── services/
│   │       ├── llm_service.py     # Groq client, prompts, streaming, follow-ups
│   │       ├── plans.py           # plan catalogue (single source of truth)
│   │       ├── usage_service.py   # counters + limit enforcement
│   │       ├── storage.py         # validation + content-addressed file storage
│   │       ├── scope.py           # resolves retrieval scope to a filter
│   │       └── job_runner.py      # background worker pool for ingestion
│   ├── tests/                     # pytest suite
│   ├── run.py                     # local dev entry point
│   ├── requirements.txt
│   ├── runtime.txt                # python-3.11.9
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # the only place that knows the envelope shape
│   │   ├── lib/                   # citations, formatting, helpers
│   │   ├── store/                 # Zustand: auth, chat, ui, theme
│   │   ├── components/
│   │   │   ├── landing/           # hero, product preview, benefits, workflow,
│   │   │   │                      # pricing, closing CTA, footer
│   │   │   ├── auth/              # sign-in / sign-up forms
│   │   │   ├── layout/            # AppLayout, Sidebar, Topbar, Brand
│   │   │   ├── chat/              # MessageBubble, ChatInput, ScopeSelector,
│   │   │   │                      # ConversationList, FollowUps
│   │   │   ├── documents/         # UploadZone, DocumentTable, UploadProgress
│   │   │   └── ui/                # Primitives, Modal, Toast, EmptyState, ...
│   │   ├── pages/                 # Landing, Login, Signup, Dashboard, Documents,
│   │   │                          # Collections, Chat, Search, Analytics, Settings
│   │   ├── test/                  # vitest setup, fixtures, api mock, helpers
│   │   └── styles/globals.css
│   ├── vercel.json                # SPA rewrite + asset caching
│   └── .env.example
├── docs/
│   ├── AUDIT.md                   # repository audit performed before changes
│   └── ARCHITECTURE.md            # deeper architecture notes
├── render.yaml                    # Render blueprint for the API
└── README.md
```

---

## Local development

Requirements: **Python 3.11+** and **Node 18+**, plus a MongoDB instance
(local or Atlas).

### Backend

On Windows use `venv\Scripts\activate`; on macOS or Linux use
`source venv/bin/activate`.

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
cp .env.example .env             # then fill in MONGODB_URI and GROQ_API_KEY
python run.py
```

The API starts on `http://localhost:5000` and creates its MongoDB indexes on
boot. Verify with `curl http://localhost:5000/api/health`:

```json
{
  "success": true,
  "data": {
    "api": { "status": "ok" },
    "database": { "configured": true, "database": "albatross", "reachable": true },
    "vector_index": { "backend": "faiss", "embedding_provider": "hashing",
                      "embedding_model": "blake2b-tf-bigram", "dimension": 1024 },
    "llm": { "status": "ok", "provider": "groq",
             "model": "openai/gpt-oss-120b", "fallback_in_use": false }
  },
  "error": null
}
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env             # optional; the dev server proxies /api already
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to
`http://localhost:5000`, so no environment file is required locally.

### MongoDB without a local install

Local development only. Production runs on MongoDB Atlas - see
[Deployment](#deployment).

```bash
docker run -d --name albatross-mongo -p 27017:27017 mongo:7
# backend/.env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=albatross
```

The backend refuses to start when `APP_ENV=production` and `MONGODB_URI` points
at `localhost` / `127.0.0.1` / `::1`, so the Docker database cannot silently
become the production database.

---

## Environment variables

### Backend

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_ENV` | `development` | `production` enables stricter startup checks |
| `FLASK_SECRET_KEY` | - | Flask session secret. **Required in production** |
| `JWT_SECRET` | falls back to `FLASK_SECRET_KEY` | Signs access tokens. **Required in production** |
| `JWT_REFRESH_SECRET` | falls back to `JWT_SECRET` | Signs refresh tokens. **Required in production**; set it to a different value |
| `JWT_ACCESS_TTL_MINUTES` | `30` | Access-token lifetime |
| `JWT_REFRESH_TTL_DAYS` | `30` | Refresh-token lifetime |
| `JWT_EXPIRES_HOURS` | - | Deprecated. Overrides the access TTL when set above `0` |
| `MONGODB_URI` | - | **Required.** Atlas SRV string or `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | `albatross` | Database name (`MONGODB_DATABASE` also accepted) |
| `MONGODB_TIMEOUT_MS` | `5000` | Server-selection timeout |
| `GROQ_API_KEY` | - | **Required for answers** |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Preferred model; falls back automatically |
| `LLM_TEMPERATURE` | `0.1` | Answer temperature |
| `LLM_MAX_TOKENS` | `2048` | Keep generous for reasoning models |
| `LLM_TIMEOUT_SECONDS` | `60` | Answer request timeout |
| `LLM_MODEL_TIMEOUT_SECONDS` | `10` | Model-list probe timeout |
| `LLM_REASONING_EFFORT` | `low` | Sent only to reasoning models |
| `FOLLOWUP_MAX_TOKENS` | `400` | Follow-up suggestion budget |
| `CONVERSATION_HISTORY_TURNS` | `4` | Turns of history sent to the model |
| `EMBEDDING_PROVIDER` | `hashing` | `hashing` or `sentence_transformers` |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Only used by the ST provider |
| `EMBEDDING_DIM` | `1024` | Vector dimension |
| `CHUNK_SIZE` / `CHUNK_OVERLAP` | `500` / `50` | Chunking window |
| `MIN_CHUNK_CHARS` | `30` | Chunks shorter than this are dropped |
| `RETRIEVAL_TOP_K` | `5` | Default results returned |
| `RETRIEVAL_CANDIDATES` | `40` | Candidate pool per retriever before fusion |
| `MAX_TOP_K` | `20` | Upper bound a request may ask for |
| `RRF_K` | `60` | RRF constant |
| `DENSE_WEIGHT` / `BM25_WEIGHT` | `0.5` / `0.5` | Per-list RRF weights |
| `UPLOAD_FOLDER` | `uploads` | Where original files are stored |
| `MAX_FILE_SIZE_MB` | `50` | Upload size cap |
| `ALLOWED_EXTENSIONS` | `pdf,txt,md,markdown,docx,csv` | Accepted formats |
| `PROCESSING_MODE` | `background` | `background` or `sync` |
| `CORS_ORIGINS` | localhost origins | **Required in production**; `*` is rejected |
| `RATE_LIMIT_ENABLED` | `true` | Toggle the limiter |
| `RATE_LIMIT_AUTH` / `_UPLOAD` / `_CHAT` / `_DEFAULT` | `20` / `30` / `60` / `300` | Requests per window |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Window length |
| `LOG_LEVEL` | `INFO` | Log verbosity |
| `MAX_PREVIEW_CHARS` | `20000` | Cap on inline document preview |

### Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Base URL of the API **without** the `/api` suffix. Empty means same-origin `/api` (used with the dev proxy) |
| `VITE_DEV_API_TARGET` | Dev-proxy target when the API is not on `localhost:5000` |

---

## API reference

All responses use one envelope:

```json
{ "success": true, "data": { }, "error": null }
```

```json
{ "success": false, "data": null,
  "error": { "code": "validation_error", "message": "...", "details": null } }
```

| Status | Meaning |
|--------|---------|
| `200` / `202` | Success; `202` means processing continues in the background |
| `401` | Missing, expired or invalid token |
| `402` | Usage limit reached for the current plan |
| `404` | Not found, or not owned by the caller |
| `409` | Conflict (duplicate email, duplicate document) |
| `413` | File larger than the allowed limit |
| `415` | File type not supported |
| `422` | Validation failure |
| `429` | Rate limit exceeded |
| `502` | Upstream (LLM) failure |

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | API, database, vector index and LLM status |
| `GET` | `/api/plans` | Plan catalogue and billing mode |
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Obtain an access + refresh token pair |
| `POST` | `/api/auth/refresh` | Exchange a refresh token for a new pair (rotates it) |
| `POST` | `/api/auth/logout` | Revoke one session family, or every session with `all_devices` |

### Authentication - `/api/auth`

`signup`, `login` and `refresh` return
`{ token, token_type, expires_in, refresh_token, refresh_expires_in, user }`.
`refresh` and `logout` are forgiving by design: an unusable or already-revoked
refresh token returns `401` (or `200` for logout) rather than a stack trace, and
replaying a rotated token revokes the whole family.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/auth/session` | Lightweight session check |
| `PATCH` | `/api/auth/profile` | Update name / avatar |
| `POST` | `/api/auth/password` | Change password |
| `DELETE` | `/api/auth/account` | Delete the account and its data |

### Documents - `/api/documents`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/documents/upload` | Upload a file (`202`, returns the document record) |
| `GET` | `/api/documents/` | List documents (filter by collection, status) |
| `GET` | `/api/documents/<id>` | Document metadata |
| `GET` | `/api/documents/<id>/status` | Processing status, for progress polling |
| `GET` | `/api/documents/<id>/content` | Extracted text preview |
| `GET` | `/api/documents/<id>/chunks` | Chunks with page positions |
| `GET` | `/api/documents/<id>/file` | Original file bytes |
| `PATCH` | `/api/documents/<id>` | Rename or move to another collection |
| `DELETE` | `/api/documents/<id>` | Delete document, chunks and index entries |

### Collections - `/api/collections`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/collections/` | List with document counts |
| `POST` | `/api/collections/` | Create |
| `GET` | `/api/collections/<id>` | Detail with statistics |
| `PATCH` | `/api/collections/<id>` | Rename |
| `DELETE` | `/api/collections/<id>` | Delete |
| `POST` | `/api/collections/<id>/documents` | Add / move documents into it |

### Chat - `/api/chat`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/ask` | Ask a question, get an answer with sources |
| `POST` | `/api/chat/stream` | Same, streamed as newline-delimited JSON |
| `POST` | `/api/chat/followups` | Suggested follow-up questions |

### Conversations - `/api/conversations`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/conversations/` | List (searchable by title) |
| `POST` | `/api/conversations/` | Create |
| `GET` | `/api/conversations/<id>` | Conversation with messages |
| `PATCH` | `/api/conversations/<id>` | Rename |
| `DELETE` | `/api/conversations/<id>` | Delete |
| `POST` | `/api/conversations/<id>/clear` | Clear messages, keep the thread |
| `POST` | `/api/conversations/<id>/feedback` | Rate an answer |

### Search - `/api/search`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/search/` | Hybrid / semantic / keyword search with filters |
| `GET` | `/api/search/options` | Available collections and documents for filters |
| `GET` | `/api/search/chunk/<id>` | Full text of one chunk |

### Account - `/api/me`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/me/overview` | Dashboard summary |
| `GET` | `/api/me/usage` | Current usage against plan limits |
| `GET` | `/api/me/activity` | Recent activity feed |
| `GET` | `/api/me/preferences` | Retrieve preferences |
| `PATCH` | `/api/me/preferences` | Update preferences |
| `POST` | `/api/me/plan` | Change subscription plan |
| `GET` | `/api/me/export` | Export the account's data |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/` | Corpus, usage, latency, failure and time-series metrics |

---

## Deployment

Target topology: **frontend on Vercel, API on Render, data on MongoDB Atlas,
LLM on Groq.**

### 1. MongoDB Atlas

1. Create a free M0 cluster.
2. Create a database user (Atlas UI -> Database Access).
3. Allow your Render egress (Network Access -> `0.0.0.0/0` for a quick start, or
   Render's static outbound IPs for production).
4. Copy the connection string:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`

Indexes are created on first boot; no manual setup is needed. Use a database
name (`albatross`) that is not shared with anything else.

Set `MONGODB_URI` to the Atlas SRV string and `MONGODB_DB_NAME=albatross`. The
API refuses to boot in production against a loopback URI, so a leftover Docker
value fails loudly at startup instead of quietly serving local data.

### 2. Backend on Render

Use the blueprint in `render.yaml` (New -> Blueprint) or create a web service
manually:

- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `gunicorn "app:create_app()" --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180`
- Health check: `/api/health`

Set the secrets in the dashboard (never in git):

```
FLASK_SECRET_KEY  (generate)
JWT_SECRET        (generate)
JWT_REFRESH_SECRET (generate; must differ from JWT_SECRET)
GROQ_API_KEY      (console.groq.com/keys)
MONGODB_URI       (Atlas)
MONGODB_DB_NAME   albatross
CORS_ORIGINS      https://<your-app>.vercel.app
GROQ_MODEL        openai/gpt-oss-120b
```

The blueprint also attaches a 1 GB disk at
`/opt/render/project/src/backend/uploads` so uploaded files survive restarts.
Render disks require a paid instance type; on the free tier, drop the `disk`
block and uploads are simply re-uploaded after an instance cycle. Document
metadata, chunks and conversations live in MongoDB regardless, so only the
original bytes are affected.

### 3. Frontend on Vercel

- Root directory: `frontend`
- Framework preset: Vite (already encoded in `frontend/vercel.json`)
- Environment variable: `VITE_API_URL=https://<your-service>.onrender.com`
  (**no** `/api` suffix)

`frontend/vercel.json` rewrites every path to `index.html` so client-side routes
resolve on a hard refresh, and marks hashed assets immutable.

### Production checklist

- `APP_ENV=production` (enables the strict startup checks).
- `CORS_ORIGINS` set to the exact frontend origin(s). `*` is rejected in
  production and logged as a startup problem.
- `FLASK_SECRET_KEY`, `JWT_SECRET` and `JWT_REFRESH_SECRET` are real random
  values, not the placeholders from `.env.example`, and the two JWT secrets
  differ.
- `MONGODB_URI` points at Atlas, not localhost. Startup fails otherwise.
- `/api/health` reports every subsystem as reachable before you announce the URL.

No URL is hardcoded anywhere: the frontend reads `VITE_API_URL`, and the backend
reads `CORS_ORIGINS`, so the same build moves between environments.

---

## Security

| Area | Control |
|------|---------|
| Passwords | Werkzeug `scrypt`, salted; plaintext never stored or logged |
| Sessions | HS256 JWT signed with `JWT_SECRET`, verified on every request |
| Refresh tokens | Separate `JWT_REFRESH_SECRET`, `jti`-identified and stored server-side; rotating on use, with replay revoking the session family |
| Authorization | `@require_auth` on all non-public routes; `user_id` is a required repository argument |
| Cross-tenant reads | Not expressible: every query is scoped by `user_id`; foreign IDs return `404` |
| File uploads | Extension allow-list, size limit, magic-byte verification, DOCX zip check, generated storage names |
| Path traversal | Stored filenames are server-generated; the original name is metadata only and never used as a path |
| Input validation | Central validation; malformed payloads fail with `422` before touching the database |
| Injection | PyMongo parameterised queries; no user input is interpolated into a query document |
| Rate limiting | Per-route sliding window (`auth`, `upload`, `chat`, `default`) |
| CORS | Explicit allow-list; `*` rejected in production |
| Error leakage | Typed errors map to safe messages; stack traces stay in the server log |
| Secrets | Read only from the environment; never serialised into a response |
| XSS | React escapes by default; Markdown rendering does not allow raw HTML |
| Logging | Passwords, tokens, API keys and document bodies are never logged |

`GET /api/health` reports configuration presence, never values, and never reads
the API key back out.

---

## Observability

Structured JSON logs with a per-request id, so a request can be traced end to
end. Each log line carries an `event` field such as `request_completed`,
`document_ingested`, `retrieval_completed`, `llm_completed`,
`usage_limit_reached` or `mongo_ping_failed`, alongside the timings that matter:

- request latency
- retrieval latency
- LLM latency
- document processing time
- error type and status

Document contents, passwords, tokens and API keys are never written to the log.

---

## Testing

**Backend** - `pytest`, 132 tests:

```bash
cd backend
pip install -r requirements.txt
pytest tests -q
```

The suite runs against a real MongoDB (indexes, aggregations and ownership
filters are the parts most worth testing, and mocking them would test nothing)
but pins `MONGODB_DB_NAME=albatross_test` and drops it before and after the run,
asserting at startup that it is not pointed at the development database.

Coverage includes authentication (hashing, token issue/verify, rejection of a
token signed with another secret), refresh tokens (rotation, replay revoking the
family, refresh/access tokens being mutually unusable, logout, logout-all,
revocation on password change and account deletion), authorization (a second
user cannot read, modify or delete the first user's documents, conversations,
collections, chunks, usage or subscription), upload validation (`415` for
unsupported types, duplicate detection, size limits), the ingestion pipeline,
retrieval (fusion ordering, metadata filtering, dedup), chat (grounding,
citations, incomplete-scope notice, follow-ups) and the plan catalogue. No test
asserts trivial behaviour.

**Frontend** - `vitest` + Testing Library, 81 tests:

```bash
cd frontend
npm test
```

Coverage includes the landing page (the positioning statement, both calls to
action, the interactive product preview including its keyboard tab behaviour,
the three-step workflow, the plan catalogue, the fallback when the plan fetch
fails, every in-page anchor resolving to a real section, and a guard that the
page stays short), routing and protected routes (an anonymous visitor cannot
reach any `/app/*` route, a signed-in user is bounced away from `/login`), the
API contract layer (envelope unwrapping, error classification, `401` handling,
single-flight token refresh and replay, refusing to treat a failed login as an
expired session), the auth flow (sign in, sign up, session restore from a refresh
token, and sign out that revokes server-side but still clears locally when the
API is unreachable),
the chat store (delta assembly, citation normalisation across chunk boundaries,
retry and regenerate), the message renderer (markdown, tables, citation click
targets, feedback, error states) and citation helpers.

Build (this is also the type check - Vite fails the build on a type error; there
is no separate linter configured):

```bash
cd frontend
npm run build      # production build + type check
```

### End-to-end smoke test

The suite above stubs the answer model so it stays deterministic and offline. To
check the parts a stub cannot reach - retrieval feeding context into a real
provider, and the citations that come back pointing at real chunks - there is a
script that drives the whole product against a live `GROQ_API_KEY`:

```bash
cd backend
.\venv\Scripts\python.exe scripts\e2e_smoke.py    # Linux/macOS: python scripts/e2e_smoke.py
```

It walks signup, login, refresh rotation, upload, ingestion, all three search
modes, a grounded answer with citations, conversation persistence, usage
metering and logout, then has a second tenant attempt to read, search, modify
and delete the first tenant's data. It runs against its own throwaway database
(`albatross_e2e`, dropped before and after) so it never touches development
data, and exits non-zero if any check fails.

---

## Screenshots

> Placeholder - add captures of the surfaces below.

| Surface | Description |
|---------|-------------|
| Landing page | Hero, interactive product preview, benefits, workflow and pricing |
| Dashboard | Counts, recent documents, recent conversations, quick actions |
| Upload | Drag-and-drop with per-file processing states |
| Chat | Streamed answer with inline citations and the source panel |
| Search | Hybrid results with relevance, page and collection |
| Analytics | Usage, latency and time-series charts |

---

## Roadmap

1. **Real semantic embeddings** - make `sentence-transformers` (or a hosted
   embedding API) the default so paraphrases are retrievable without lexical
   overlap. This is the single highest-value change to answer quality.
2. **Object storage** - swap local disk for S3/R2 behind the existing storage
   service so instances stay stateless.
3. **Dedicated workers** - move ingestion onto a queue (RQ / Celery / Render
   workers) instead of an in-process thread pool.
4. **Billing** - implement Stripe Checkout and webhooks against the plan model
   that already exists, then enforce paid limits for real.
5. **Team workspaces** - shared collections, membership and roles on top of the
   Team plan, which is currently a catalogue entry rather than a feature.
6. **Retrieval evaluation** - a labelled question set with recall@k and
   answer-grounding scores, so retrieval changes are measured instead of assumed.
7. **OCR** - scanned PDFs currently yield no text; add an OCR stage for them.

---

## Known limitations

Stated plainly, because a knowledge tool that hides its failure modes is worse
than one that names them:

- **Default retrieval is lexical, not semantic.** See
  [Embeddings](#embeddings---what-is-actually-used). Paraphrased questions that
  share no vocabulary with the source may not retrieve the right passage.
- **Scanned PDFs and images are not OCR'd.** A PDF with no text layer ingests as
  an empty document and is reported as a processing failure rather than silently
  succeeding with nothing.
- **The vector index is in-process memory.** Horizontally scaling the API to
  multiple workers means each worker builds its own index. It is correct but
  memory-scaled per worker; a shared vector service is a roadmap item.
- **Billing is not implemented.** Plans and limits are enforced; no payment is
  taken (see [Subscription plans](#subscription-plans)).
- **Team features are a catalogue entry.** There is no membership model yet, so
  the Team plan's shared spaces are not usable.
- **Ingestion uses an in-process thread pool.** It survives long uploads but not
  a process restart mid-processing; the document is then marked failed and can
  be re-uploaded.
- **Table extraction is best-effort.** PDF tables become Markdown when
  pdfplumber detects them; complex multi-page tables may be linearised.

---

## License

See the repository for license information.
