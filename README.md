# Advanced RAG-Based Knowledge Assistant

An AI-powered document Q&A system built with Flask, React, FAISS, and Groq.

Upload PDFs → ask questions → get grounded answers from your documents with source metadata.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend | Flask | REST API and application server |
| PDF extraction | pdfplumber | Text + table extraction |
| Chunking | Custom recursive chunker | Page-aware overlapping chunks |
| Embeddings | Local feature hashing | Lightweight, offline 512-dimensional vectors |
| Vector store | FAISS IndexFlatIP | Fast local vector search |
| Keyword search | BM25 | Exact term matching |
| Retrieval | Hybrid BM25 + dense + RRF | Combines lexical and vector rankings |
| LLM | Llama-3.3-70B via Groq | Grounded response generation |
| Database | SQLite + SQLAlchemy | Document and conversation metadata |
| Frontend | React 18 + Vite + Tailwind CSS | Web UI |
| Deployment | Render + Vercel | Production hosting |

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env
python run.py
```

Health check: `http://localhost:5000/api/health`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite development server runs on `http://localhost:5173`.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | /api/health | Health check |
| POST | /api/documents/upload | Upload/process PDF |
| GET | /api/documents/ | List documents |
| GET | /api/documents/{id}/status | Document status |
| DELETE | /api/documents/{id} | Delete document |
| POST | /api/chat/ask | Ask a document-grounded question |
| GET | /api/chat/conversations | List conversations |
| GET | /api/chat/conversations/{id} | Load a conversation |
| DELETE | /api/chat/conversations/{id} | Delete a conversation |
| POST | /api/search/ | Hybrid document search |
| GET | /api/analytics/ | Pipeline metrics |

## Search behavior

The search endpoint and chat pipeline both use the same hybrid retrieval path:

1. BM25 ranks exact lexical matches.
2. FAISS ranks locally hashed dense features.
3. Reciprocal Rank Fusion combines both rankings.
4. The top results are supplied to the Groq model.

## Deployment

For Render, add the required secrets/environment values in the dashboard:

- `GROQ_API_KEY`
- `CORS_ORIGINS` — comma-separated allowed frontend origins
- `FLASK_SECRET_KEY`

The committed `render.yaml` mounts persistent storage under `backend/data`, and the application stores the SQLite database, uploads, FAISS index, and chunk store under that data directory.

For Vercel, set:

```
VITE_API_URL=https://your-render-service.onrender.com
```

Then redeploy the frontend.

## Notes

The local feature-hashing embedder is intentionally lightweight and lexical; it is not equivalent to a transformer semantic embedding model. The repository labels it accordingly.
