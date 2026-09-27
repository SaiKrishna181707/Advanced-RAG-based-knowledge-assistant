"""
Answer generation via Groq.

Design notes
------------
* The model only ever sees retrieved context. It is told to cite with bracketed
  numbers that line up with the ``sources`` array returned alongside the answer, so
  the UI can resolve ``[2]`` into "Document.pdf - Page 14" and open the exact chunk.
* Document names and page numbers come from stored chunk metadata rather than being
  parsed back out of a filename, which is what the previous implementation did.
* Response style (concise / detailed / bulleted) is a user preference, and the
  conversation history passed in is bounded by the user's plan.
"""
from __future__ import annotations

import json
import logging
import re
import threading
import time
from collections.abc import Iterator

from groq import Groq

from ..config import GROQ_MODEL_PREFERENCE, settings
from ..errors import UpstreamError

logger = logging.getLogger(__name__)

_client: Groq | None = None

# Providers sometimes wrap citation markers in full-width brackets. The model
# contract is plain ``[n]``, so anything else is normalised back to that here.
_CITATION_TRANSLATION = str.maketrans(
    {"\u3010": "[", "\u3011": "]", "\u3016": "[", "\u3017": "]",
     "\uff3b": "[", "\uff3d": "]", "\u2045": "[", "\u2046": "]"}
)
_CITATION_PATTERN = re.compile(r"\[(\d{1,2})\]")

STYLE_INSTRUCTIONS = {
    "concise": "Answer in at most three short paragraphs. Lead with the answer itself.",
    "detailed": (
        "Give a thorough answer with headings where useful. Explain the reasoning "
        "behind the conclusion and note any caveats."
    ),
    "bulleted": "Answer as a short bulleted list. Keep each bullet to one sentence.",
}


def get_client() -> Groq:
    global _client
    if _client is None:
        if not settings.groq_api_key or settings.groq_api_key == "your_groq_api_key_here":
            raise UpstreamError(
                "Answer generation is not configured. The GROQ_API_KEY is missing.",
                status_code=503,
                code="llm_not_configured",
            )
        _client = Groq(api_key=settings.groq_api_key, timeout=settings.llm_timeout_seconds)
    return _client


def llm_configured() -> bool:
    return bool(settings.groq_api_key) and settings.groq_api_key != "your_groq_api_key_here"


# ------------------------------------------------------------- model selection

# Guarded by a lock because Flask serves requests from several threads.
_model_lock = threading.Lock()
_model_cache: dict = {
    "model": None,
    "available": None,
    "error": None,
    "checked_at": 0.0,
}
_MODEL_CACHE_TTL_SECONDS = 300.0

# Models that emit hidden reasoning tokens before the visible answer.
_REASONING_MARKERS = ("gpt-oss", "deepseek-r1", "qwq", "reasoning")


def is_reasoning_model(model: str) -> bool:
    lowered = (model or "").lower()
    return any(marker in lowered for marker in _REASONING_MARKERS)


def available_models(force: bool = False) -> set[str] | None:
    """Model ids the current API key may use, cached. ``None`` when unknown."""
    if not llm_configured():
        return None
    with _model_lock:
        fresh = time.time() - _model_cache["checked_at"] < _MODEL_CACHE_TTL_SECONDS
        if not force and fresh and _model_cache["available"] is not None:
            return _model_cache["available"]
    try:
        response = get_client().with_options(
            timeout=settings.llm_model_timeout_seconds
        ).models.list()
        listed = {
            item.id
            for item in getattr(response, "data", [])
            if getattr(item, "id", None)
        }
    except Exception as exc:
        logger.warning(
            "Could not list provider models",
            extra={"event": "llm_model_list_failed", "error_code": type(exc).__name__},
        )
        with _model_lock:
            _model_cache.update(error=type(exc).__name__, checked_at=time.time())
        return None
    with _model_lock:
        _model_cache.update(available=listed, error=None, checked_at=time.time())
    return listed


def resolve_model(force: bool = False) -> str:
    """The model to actually call.

    Uses ``GROQ_MODEL`` when the key can reach it, otherwise the first reachable
    entry of :data:`GROQ_MODEL_PREFERENCE`. When the provider cannot be queried at
    all the configured model is returned unchanged so the real error surfaces from
    the completion call rather than being masked here.
    """
    configured = settings.groq_model
    with _model_lock:
        fresh = time.time() - _model_cache["checked_at"] < _MODEL_CACHE_TTL_SECONDS
        if not force and fresh and _model_cache["model"]:
            return _model_cache["model"]

    listed = available_models(force=force)
    if listed is None:
        return configured
    if configured in listed:
        chosen = configured
    else:
        chosen = next(
            (candidate for candidate in GROQ_MODEL_PREFERENCE if candidate in listed),
            configured,
        )
        if chosen != configured:
            logger.warning(
                "Configured model unavailable; using a fallback",
                extra={
                    "event": "llm_model_fallback",
                    "requested_model": configured,
                    "resolved_model": chosen,
                },
            )
    with _model_lock:
        _model_cache.update(model=chosen, available=listed, error=None, checked_at=time.time())
    return chosen


def cached_model() -> str | None:
    """The model chosen by a previous resolution, or ``None`` if never probed."""
    with _model_lock:
        return _model_cache["model"]


def model_status(probe: bool = False) -> dict:
    """Current model state. Never contains the API key.

    ``probe=False`` (the default) reads only the cache, so the health endpoint
    stays fast and does not depend on the provider being reachable. Pass
    ``probe=True`` to force a fresh lookup.
    """
    configured = settings.groq_model
    if probe:
        listed = available_models(force=True)
        resolved = resolve_model(force=True)
    else:
        listed = _model_cache["available"]
        resolved = _model_cache["model"] or configured
    return {
        "configured": llm_configured(),
        "requested_model": configured,
        "resolved_model": resolved,
        "model": resolved,
        "probed": _model_cache["model"] is not None,
        "fallback_in_use": resolved != configured,
        "available_models": sorted(listed) if listed else None,
    }


def _completion_options(model: str) -> dict:
    """Extra provider kwargs a model needs to answer rather than only reason."""
    if is_reasoning_model(model):
        return {"reasoning_effort": settings.llm_reasoning_effort}
    return {}


# ------------------------------------------------------------ citation hygiene


def normalize_citations(text: str) -> str:
    """Rewrite full-width citation markers back to the ``[n]`` contract."""
    if not text:
        return text
    return text.translate(_CITATION_TRANSLATION)


def prune_dangling_citations(text: str, source_count: int) -> str:
    """Drop citations that point at a source we did not send.

    The model occasionally cites ``[5]`` when only four blocks were supplied. A
    marker the UI cannot resolve is worse than no marker, so it is removed.
    """
    if not text:
        return text

    def _replace(match: re.Match) -> str:
        index = int(match.group(1))
        return match.group(0) if 1 <= index <= source_count else ""

    cleaned = _CITATION_PATTERN.sub(_replace, text)
    # Tidy the gaps a removed marker can leave behind, e.g. "text ." -> "text."
    return re.sub(r"[ \t]+([.,;:!?)])", r"\1", cleaned)


def finalize_answer(text: str, source_count: int) -> str:
    """Normalise and validate the citation markers in a finished answer."""
    return prune_dangling_citations(normalize_citations(text or ""), source_count)


# --------------------------------------------------------------------- prompting


def build_context(chunks: list[dict]) -> str:
    """Render retrieved chunks as numbered, citable blocks."""
    if not chunks:
        return "(no matching content was found in the user's documents)"
    blocks = []
    for number, chunk in enumerate(chunks, start=1):
        unit = (chunk.get("location_unit") or "page").capitalize()
        page = chunk.get("page_number")
        location = f"{unit} {page}" if page else "location unknown"
        name = chunk.get("document_name") or "Document"
        blocks.append(f"[{number}] {name} - {location}\n{chunk.get('content', '').strip()}")
    return "\n\n---\n\n".join(blocks)


def build_sources(chunks: list[dict]) -> list[dict]:
    """Structured citation list, numbered to match the context blocks."""
    sources: list[dict] = []
    for number, chunk in enumerate(chunks, start=1):
        sources.append(
            {
                "index": number,
                "chunk_id": chunk.get("chunk_id"),
                "document_id": chunk.get("document_id"),
                "document": chunk.get("document_name") or "Document",
                "page": chunk.get("page_number"),
                "location_unit": chunk.get("location_unit") or "page",
                "relevance": chunk.get("relevance"),
                "similarity": chunk.get("similarity"),
                "snippet": chunk.get("snippet"),
                "content": chunk.get("content"),
            }
        )
    return sources


def _system_prompt(style: str) -> str:
    return (
        "You are ALBATROSS, a document knowledge assistant. You answer questions about "
        "the user's uploaded documents.\n\n"
        "Rules you must follow:\n"
        "1. Use only the numbered context blocks to make factual claims about the "
        "documents. Never invent facts, numbers, names or quotes.\n"
        "2. Cite the blocks you used with their bracketed numbers, for example [1] or "
        "[2][3]. Put the citation immediately after the claim it supports.\n"
        "3. If the context does not contain the answer, say so plainly and suggest what "
        "the user could upload or ask instead. Do not guess.\n"
        "4. When you are reasoning beyond what the text states directly, label it "
        "explicitly, for example 'This suggests...' or 'Inference:'.\n"
        "5. Never mention the words 'context block', 'chunk' or 'retrieved'. Refer to "
        "documents by name.\n"
        "6. Reply in GitHub-flavoured Markdown. Use tables for comparisons and fenced "
        "code blocks with a language tag for code or formulas.\n"
        "7. If the message is only a greeting or thanks, reply briefly and naturally.\n\n"
        f"Response style: {STYLE_INSTRUCTIONS.get(style, STYLE_INSTRUCTIONS['concise'])}"
    )


def history_messages(history: list[dict], max_turns: int) -> list[dict]:
    """Bound and shape prior turns for the model."""
    if not history:
        return []
    trimmed = history[-(max_turns * 2) :]
    messages = []
    for item in trimmed:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": content[:4000]})
    return messages


def build_messages(
    query: str,
    chunks: list[dict],
    *,
    history: list[dict] | None = None,
    style: str = "concise",
    max_turns: int = 4,
    scope_label: str = "All documents",
) -> list[dict]:
    messages = [{"role": "system", "content": _system_prompt(style)}]
    messages.extend(history_messages(history or [], max_turns))
    messages.append(
        {
            "role": "user",
            "content": (
                f"Retrieval scope: {scope_label}\n\n"
                f"Context:\n{build_context(chunks)}\n\n"
                f"Question: {query}"
            ),
        }
    )
    return messages


# -------------------------------------------------------------------- generation


def generate_answer(
    query: str,
    chunks: list[dict],
    *,
    history: list[dict] | None = None,
    style: str = "concise",
    max_turns: int = 4,
    scope_label: str = "All documents",
) -> dict:
    """Blocking answer generation. Returns the answer plus citation metadata."""
    import time

    client = get_client()
    messages = build_messages(
        query, chunks, history=history, style=style, max_turns=max_turns, scope_label=scope_label
    )
    model = resolve_model()
    started = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            **_completion_options(model),
        )
    except Exception as exc:
        raise _wrap_llm_error(exc) from exc

    answer = finalize_answer(
        (response.choices[0].message.content or "").strip(), len(chunks)
    )
    return {
        "answer": answer,
        "sources": build_sources(chunks),
        "llm_ms": round((time.perf_counter() - started) * 1000),
        "model": model,
        "usage": _usage_payload(response),
    }


def stream_answer(
    query: str,
    chunks: list[dict],
    *,
    history: list[dict] | None = None,
    style: str = "concise",
    max_turns: int = 4,
    scope_label: str = "All documents",
) -> Iterator[str]:
    """Yield answer text deltas as they arrive from the provider."""
    client = get_client()
    messages = build_messages(
        query, chunks, history=history, style=style, max_turns=max_turns, scope_label=scope_label
    )
    model = resolve_model()
    try:
        stream = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            stream=True,
            **_completion_options(model),
        )
        for event in stream:
            if not getattr(event, "choices", None):
                continue
            delta = getattr(event.choices[0].delta, "content", None)
            if delta:
                # A citation marker can straddle two deltas, so only whole
                # markers are rewritten here; the client normalises the rest
                # once the stream has finished.
                yield normalize_citations(delta)
    except GeneratorExit:
        raise
    except Exception as exc:
        raise _wrap_llm_error(exc) from exc


def generate_followups(
    query: str,
    answer: str,
    *,
    document_names: list[str] | None = None,
    limit: int = 3,
) -> list[str]:
    """Suggest contextual next questions. Returns an empty list on any failure."""
    if not llm_configured():
        return []
    try:
        client = get_client()
        documents = ", ".join((document_names or [])[:5]) or "the uploaded documents"
        model = resolve_model()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You propose the next questions a user would naturally ask about "
                        "their documents. Reply with a JSON array of short question "
                        "strings only, no prose and no code fences."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Documents: {documents}\n"
                        f"Question asked: {query}\n"
                        f"Answer given: {answer[:1200]}\n\n"
                        f"Propose {limit} follow-up questions grounded in this material."
                    ),
                },
            ],
            temperature=0.4,
            max_tokens=settings.followup_max_tokens,
            **_completion_options(model),
        )
        return _parse_followups(response.choices[0].message.content or "", limit)
    except Exception:
        logger.info("Follow-up generation skipped", extra={"event": "followups_failed"})
        return []


def _parse_followups(raw: str, limit: int) -> list[str]:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    suggestions: list[str] = []
    for item in parsed:
        if isinstance(item, str) and item.strip():
            suggestions.append(item.strip()[:160])
        elif isinstance(item, dict):
            question = item.get("question") or item.get("text")
            if isinstance(question, str) and question.strip():
                suggestions.append(question.strip()[:160])
        if len(suggestions) >= limit:
            break
    return suggestions


def health() -> dict:
    """Provider status for ``/api/health``. Performs no request when unconfigured."""
    payload = {
        "status": "ok" if llm_configured() else "not_configured",
        "provider": "groq",
        "configured": llm_configured(),
        "model": settings.groq_model,
    }
    if not llm_configured():
        return payload
    try:
        # Cache-only: a health probe must never block on the provider.
        status = model_status()
    except Exception as exc:
        payload.update(status="error", error=type(exc).__name__)
        return payload
    payload.update(
        model=status["resolved_model"],
        requested_model=status["requested_model"],
        fallback_in_use=status["fallback_in_use"],
    )
    if not status["probed"]:
        # Probed lazily on the first answer so cold starts never wait on Groq.
        payload["status"] = "ready"
        payload["note"] = "The model is resolved on the first answer request."
    elif status["available_models"] is None:
        payload["status"] = "unknown"
        payload["note"] = "The provider model list could not be read."
    else:
        payload["status"] = "ok"
    return payload


def _usage_payload(response) -> dict | None:
    usage = getattr(response, "usage", None)
    if usage is None:
        return None
    return {
        "prompt_tokens": getattr(usage, "prompt_tokens", None),
        "completion_tokens": getattr(usage, "completion_tokens", None),
        "total_tokens": getattr(usage, "total_tokens", None),
    }


def _wrap_llm_error(exc: Exception) -> UpstreamError:
    logger.warning(
        "LLM request failed",
        extra={"event": "llm_failed", "error_code": type(exc).__name__},
    )
    name = type(exc).__name__
    if "RateLimit" in name or "429" in str(exc):
        return UpstreamError(
            "The answer service is rate limited right now. Please try again in a moment.",
            status_code=429,
            code="llm_rate_limited",
        )
    if "Timeout" in name or "Connect" in name:
        return UpstreamError(
            "The answer service took too long to respond. Please try again.",
            code="llm_timeout",
        )
    return UpstreamError(
        "The answer service is unavailable right now. Please try again.",
        code="llm_unavailable",
    )
