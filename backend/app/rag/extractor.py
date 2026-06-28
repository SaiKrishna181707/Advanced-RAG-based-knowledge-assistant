import re
import pdfplumber

def extract_pdf(file_path: str) -> dict:
    pages = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                try:
                    for table in (page.extract_tables() or []):
                        if table:
                            text += "\n\n" + _table_to_markdown(table)
                except Exception:
                    pass
                cleaned = _clean_text(text)
                if len(cleaned) > 20:
                    pages.append({
                        "page": page_num + 1,
                        "text": cleaned,
                        "source": file_path,
                        "char_count": len(cleaned),
                    })
    except Exception as e:
        raise ValueError(f"Failed to extract PDF: {e}")

    if not pages:
        raise ValueError("No text could be extracted. PDF may be image-only.")

    return {
        "pages": pages,
        "page_count": len(pages),
        "total_chars": sum(p["char_count"] for p in pages),
    }

def _table_to_markdown(table: list) -> str:
    if not table or not table[0]:
        return ""
    header = [str(c or "").strip() for c in table[0]]
    rows = [" | ".join(header), " | ".join(["---"] * len(header))]
    for row in table[1:]:
        rows.append(" | ".join([str(c or "").strip() for c in row]))
    return "\n".join(rows)

def _clean_text(text: str) -> str:
    text = re.sub(r"-\n", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()