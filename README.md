# Advanced RAG-Based Knowledge Assistant

An AI-powered document Q&A system built with Flask, React, FAISS, and Groq.
Upload PDFs → ask questions → get answers grounded in your documents with source citations.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Flask (Python) | Lightweight, you already know it |
| PDF extraction | PyMuPDF + pdfplumber | Fast + table-aware |
| Chunking | LangChain RecursiveCharacterTextSplitter | Best chunking strategy |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | Free, local, fast |
| Vector store | FAISS | Same library from  CLIP project |
| Keyword search | BM25 (rank-bm25) | Hybrid search for better retrieval |
| LLM | Llama-3.3-70b via Groq | Free API, very fast |
| Database | SQLite via SQLAlchemy | No server needed |
| Frontend | React 18 + Vite + Tailwind CSS | Modern, fast |
| State | Zustand | Simpler than Redux |
| Deployment | Render (backend) + Vercel (frontend) | Free tier |

---

## Local Setup (Windows)

### Step 1 — Get a Groq API key (free)
1. Go to https://console.groq.com
2. Sign up (Google login works)
3. Go to "API Keys" → "Create API Key"
4. Copy the key — you'll use it in Step 3

### Step 2 — Backend setup

```cmd
cd backend

# Create a virtual environment (Python 3.11 recommended)
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 3 — Configure environment

```cmd
# Copy the example env file
copy .env.example .env
```

Open `.env` in any text editor and replace:
```
GROQ_API_KEY=your_groq_api_key_here
```
with your actual key from Step 1.

### Step 4 — Run the backend

```cmd
python run.py
```

You should see:
```
Starting RAG Assistant backend...
API available at: http://localhost:5000
```

Test it: open http://localhost:5000/api/health in your browser.
You should see: `{"status": "ok", "message": "RAG Assistant is running"}`

### Step 5 — Frontend setup (new terminal)

```cmd
cd frontend

# Install Node dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Project Structure

```
rag-assistant/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── rag/
│   │   │   ├── extractor.py     # PDF → text
│   │   │   ├── chunker.py       # text → chunks
│   │   │   ├── embedder.py      # chunks → vectors + FAISS
│   │   │   └── retriever.py     # hybrid search (dense + BM25)
│   │   ├── routes/
│   │   │   ├── chat.py          # /api/chat/*
│   │   │   ├── documents.py     # /api/documents/*
│   │   │   ├── search.py        # /api/search/
│   │   │   └── analytics.py     # /api/analytics/
│   │   ├── models/
│   │   │   └── database.py      # SQLAlchemy models + SQLite init
│   │   └── services/
│   │       └── llm_service.py   # Groq API calls + prompt builder
│   ├── uploads/                 # Uploaded PDFs stored here
│   ├── storage/                 # FAISS index + chunk store
│   ├── requirements.txt
│   ├── .env.example
│   └── run.py
│
├── frontend/
│   └── src/
│       ├── api/client.js        # All API calls (axios)
│       ├── store/index.js       # Global state (Zustand)
│       ├── components/
│       │   ├── layout/          # Sidebar, Topbar
│       │   ├── chat/            # MessageBubble, ChatInput, TypingIndicator
│       │   ├── documents/       # UploadZone
│       │   └── ui/              # Toast
│       ├── pages/               # ChatPage, DocumentsPage, SearchPage, etc.
│       ├── styles/globals.css
│       ├── App.jsx              # Router + layout
│       └── main.jsx             # Entry point
│
├── render.yaml                  # Deployment config
└── README.md
```

---

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/health | Health check |
| POST | /api/documents/upload | Upload a PDF |
| GET | /api/documents/ | List all documents |
| DELETE | /api/documents/{id} | Delete a document |
| POST | /api/chat/ask | Ask a question |
| GET | /api/chat/conversations | List conversations |
| GET | /api/chat/conversations/{id} | Get conversation messages |
| POST | /api/search/ | Semantic search |
| GET | /api/analytics/ | Dashboard stats |

---

## Deploy to Render + Vercel

### Backend (Render)
1. Push this repo to GitHub
2. Go to https://render.com → New Web Service
3. Connect your GitHub repo
4. Set root directory: `backend`
5. Add environment variable: `GROQ_API_KEY = your_key`
6. Deploy

### Frontend (Vercel)
1. Go to https://vercel.com → New Project
2. Connect your GitHub repo
3. Set root directory: `frontend`
4. Add environment variable: `VITE_API_URL = https://your-render-url.onrender.com`
5. In `frontend/vite.config.js`, update proxy target to your Render URL
6. Deploy

---
