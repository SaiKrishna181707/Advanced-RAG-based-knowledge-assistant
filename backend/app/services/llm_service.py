"""
services/llm_service.py  —  LLM Generation via Groq

What is Groq?
  A free AI API service. You send it a question + context, it returns an answer.
  We use the model "llama-3.3-70b-versatile" — a powerful open-source model hosted
  by Groq for free (with rate limits).

What is "context"?
  The retrieved document chunks. We paste them into the prompt so the LLM can
  answer based on YOUR documents instead of its general training knowledge.

The RAG prompt template is critical — it tells the LLM:
  1. Only answer from the provided context
  2. If context doesn't contain the answer, say so (prevents hallucination)
  3. Always cite which document the information came from
"""

import os
import time
from groq import Groq

_client = None


def _get_client() -> Groq:
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key or api_key == "your_groq_api_key_here":
            raise ValueError(
                "GROQ_API_KEY not set. Get a free key at https://console.groq.com"
            )
        import httpx
        _client = Groq(
            api_key=api_key,
            http_client=httpx.Client()
        )
    return _client


def build_prompt(query: str, chunks: list[dict]) -> str:
    if not chunks:
        context_text = "No relevant documents found."
    else:
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk.get("source", "Unknown")
            doc_name = os.path.basename(source)
            if "_" in doc_name:
                doc_name = "_".join(doc_name.split("_")[1:])
            page = chunk.get("page_number", "?")
            context_parts.append(
                f"[Document: {doc_name}, Page {page}]\n{chunk['content']}"
            )
        context_text = "\n\n---\n\n".join(context_parts)

    return f"""You are a helpful knowledge assistant. Answer the user's question using ONLY the document context provided below.

STRICT RULES:
- Answer directly without any preamble like "Summary of the PDF" or "Based on the context"
- NEVER mention source numbers, citations, or document names in your answer text
- Use clean markdown: **bold** for key terms, bullet points for lists
- Be concise and factual
- If context lacks the answer, say only: "I couldn't find relevant information in the uploaded documents for this question."

CONTEXT:
{context_text}

QUESTION: {query}

ANSWER:"""


def generate_answer(query: str, chunks: list[dict]) -> dict:
    """
    Sends query + context to Groq, returns the answer with timing metadata.
    """
    client = _get_client()
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    prompt = build_prompt(query, chunks)

    start = time.time()

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are a precise, helpful knowledge assistant. Always cite your sources.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.1,     # Low = more factual, less creative
        max_tokens=1024,
    )

    elapsed_ms = round((time.time() - start) * 1000)
    answer = response.choices[0].message.content

    # Build source citation list for the frontend
    sources = []
    seen = set()
    for chunk in chunks:
        source = chunk.get("source", "Unknown")
        doc_name = os.path.basename(source)
        if "_" in doc_name:
            doc_name = "_".join(doc_name.split("_")[1:])
        page = chunk.get("page_number", "?")
        key = f"{doc_name}_{page}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "document": doc_name,
                "page": page,
                "score": round(chunk.get("rrf_score", chunk.get("score", 0)), 3),
                "snippet": chunk["content"][:200] + "...",
            })

    return {
        "answer": answer,
        "sources": sources,
        "llm_time_ms": elapsed_ms,
        "model": model,
    }
