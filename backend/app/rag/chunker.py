import os

def chunk_pages(pages: list[dict]) -> list[dict]:
    chunk_size = int(os.getenv("CHUNK_SIZE", 500))
    chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 50))
    all_chunks = []
    global_index = 0

    for page_data in pages:
        text = page_data["text"].strip()
        if not text:
            continue
        raw_chunks = _split_text(text, chunk_size, chunk_overlap)
        for raw in raw_chunks:
            cleaned = raw.strip()
            if len(cleaned) < 30:
                continue
            all_chunks.append({
                "content": cleaned,
                "page_number": page_data["page"],
                "chunk_index": global_index,
                "source": page_data["source"],
                "char_count": len(cleaned),
            })
            global_index += 1
    return all_chunks

def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    separators = ["\n\n", "\n", ". ", " ", ""]
    for sep in separators:
        if sep == "":
            return _hard_split(text, chunk_size, overlap)
        parts = text.split(sep)
        if len(parts) == 1:
            continue
        chunks = []
        current = ""
        for part in parts:
            candidate = (current + sep + part).lstrip(sep) if current else part
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                    overlap_text = current[-overlap:] if overlap else ""
                    current = (overlap_text + sep + part).lstrip() if overlap_text else part
                else:
                    sub = _split_text(part, chunk_size, overlap)
                    chunks.extend(sub[:-1])
                    current = sub[-1] if sub else ""
        if current:
            chunks.append(current)
        return [c for c in chunks if c.strip()]
    return [text]

def _hard_split(text: str, chunk_size: int, overlap: int) -> list[str]:
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return chunks