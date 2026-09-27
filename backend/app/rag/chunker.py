"""
Text chunking.

The recursive-splitter algorithm is carried over unchanged from the original
implementation; only configuration now comes from the central settings object
rather than reading ``os.getenv`` directly.
"""
from __future__ import annotations

from ..config import settings


def chunk_pages(pages: list[dict]) -> list[dict]:
    """Split extracted pages into overlapping chunks suitable for embedding."""
    chunk_size = settings.chunk_size
    chunk_overlap = settings.chunk_overlap
    min_chars = settings.min_chunk_chars
    all_chunks: list[dict] = []
    global_index = 0

    for page_data in pages:
        text = (page_data.get("text") or "").strip()
        if not text:
            continue
        for raw in _split_text(text, chunk_size, chunk_overlap):
            cleaned = raw.strip()
            if len(cleaned) < min_chars:
                continue
            all_chunks.append(
                {
                    "content": cleaned,
                    "page_number": page_data.get("page"),
                    "chunk_index": global_index,
                    "char_count": len(cleaned),
                }
            )
            global_index += 1
    return all_chunks


def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    separators = ["\n\n", "\n", ". ", " ", ""]
    for separator in separators:
        if separator == "":
            return _hard_split(text, chunk_size, overlap)
        parts = text.split(separator)
        if len(parts) == 1:
            continue
        chunks: list[str] = []
        current = ""
        for part in parts:
            candidate = (current + separator + part).lstrip(separator) if current else part
            if len(candidate) <= chunk_size:
                current = candidate
                continue
            if current:
                chunks.append(current)
                overlap_text = current[-overlap:] if overlap else ""
                current = (overlap_text + separator + part).lstrip() if overlap_text else part
            else:
                sub_chunks = _split_text(part, chunk_size, overlap)
                chunks.extend(sub_chunks[:-1])
                current = sub_chunks[-1] if sub_chunks else ""
        if current:
            chunks.append(current)
        return [chunk for chunk in chunks if chunk.strip()]
    return [text]


def _hard_split(text: str, chunk_size: int, overlap: int) -> list[str]:
    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    start = 0
    while start < len(text):
        chunks.append(text[start : start + chunk_size])
        start += step
    return chunks
