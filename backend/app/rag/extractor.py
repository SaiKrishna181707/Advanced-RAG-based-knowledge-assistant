"""
rag/extractor.py  —  PDF Text Extraction

Pulls text out of uploaded PDFs page by page.
Uses PyMuPDF (fast) as primary, pdfplumber (table-aware) as fallback.

Returns a list of dicts:  [{ page, text, source, char_count }, ...]
"""

import re
import fitz          # PyMuPDF — import name is "fitz" even though package is "pymupdf"
import pdfplumber


def extract_pdf(file_path: str) -> dict:
    """
    Main entry point. Returns:
      {
        pages: [ {page, text, source, char_count} ],
        page_count: int,
        total_chars: int
      }
    """
    pages = _extract_with_pymupdf(file_path)

    # For any page that returned very little text, retry with pdfplumber
    # (catches pages that are mostly tables or complex layouts)
    for i, page_data in enumerate(pages):
        if page_data["char_count"] < 100:
            fallback = _extract_page_pdfplumber(file_path, i)
            if fallback and len(fallback) > page_data["char_count"]:
                pages[i]["text"] = fallback
                pages[i]["char_count"] = len(fallback)

    # Filter out completely empty pages
    pages = [p for p in pages if p["char_count"] > 20]

    return {
        "pages": pages,
        "page_count": len(pages),
        "total_chars": sum(p["char_count"] for p in pages),
    }


def _extract_with_pymupdf(file_path: str) -> list[dict]:
    doc = fitz.open(file_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        raw_text = page.get_text("text")
        cleaned = _clean_text(raw_text)

        pages.append({
            "page": page_num + 1,
            "text": cleaned,
            "source": file_path,
            "char_count": len(cleaned),
        })

    doc.close()
    return pages


def _extract_page_pdfplumber(file_path: str, page_idx: int) -> str:
    """Extract a single page using pdfplumber — handles tables better."""
    try:
        with pdfplumber.open(file_path) as pdf:
            if page_idx >= len(pdf.pages):
                return ""
            page = pdf.pages[page_idx]
            text = page.extract_text() or ""

            # Convert any tables found to markdown format
            tables = page.extract_tables()
            for table in tables:
                text += "\n\n" + _table_to_markdown(table)

            return _clean_text(text)
    except Exception:
        return ""


def _table_to_markdown(table: list) -> str:
    """Converts a table (list of rows) to markdown so the LLM can read it."""
    if not table or not table[0]:
        return ""

    rows = []
    header = [str(cell or "").strip() for cell in table[0]]
    rows.append(" | ".join(header))
    rows.append(" | ".join(["---"] * len(header)))

    for row in table[1:]:
        cells = [str(cell or "").strip() for cell in row]
        rows.append(" | ".join(cells))

    return "\n".join(rows)


def _clean_text(text: str) -> str:
    """
    Fixes common PDF extraction artifacts:
    - "hyphen-\nated" words across lines → "hyphenated"
    - 3+ consecutive newlines → 2 newlines
    - Multiple spaces → single space
    """
    text = re.sub(r"-\n", "", text)          # fix hyphenation
    text = re.sub(r"\n{3,}", "\n\n", text)   # collapse blank lines
    text = re.sub(r"[ \t]+", " ", text)      # normalize spaces
    return text.strip()
