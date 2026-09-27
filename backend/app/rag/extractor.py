"""
Text extraction for every supported document format.

Every extractor returns the same shape:

    {
      "pages": [{"page": int, "text": str, "char_count": int}, ...],
      "page_count": int,
      "total_chars": int,
      "location_unit": "page" | "part" | "block",
    }

``location_unit`` exists so citations stay honest: a PDF genuinely has pages,
whereas a DOCX or TXT file does not, and labelling its virtual sections as "Page 7"
would be misleading.
"""
from __future__ import annotations

import csv
import io
import re
from pathlib import Path

# Target size of a virtual section for formats that have no real pagination.
VIRTUAL_SECTION_CHARS = 3000
# Rows per block when treating a CSV as a paged document.
CSV_ROWS_PER_BLOCK = 50


class DocumentExtractionError(Exception):
    """Raised when a file cannot be turned into usable text."""


SUPPORTED_EXTENSIONS = ("pdf", "txt", "md", "markdown", "docx", "csv")


def extract_document(file_path: str | Path, extension: str) -> dict:
    extension = (extension or "").lower().lstrip(".")
    handlers = {
        "pdf": _extract_pdf,
        "txt": _extract_plain_text,
        "md": _extract_plain_text,
        "markdown": _extract_plain_text,
        "docx": _extract_docx,
        "csv": _extract_csv,
    }
    handler = handlers.get(extension)
    if handler is None:
        raise DocumentExtractionError(f"Unsupported file type: .{extension}")
    result = handler(Path(file_path))
    if not result["pages"]:
        raise DocumentExtractionError(
            "No readable text was found in this file. It may be scanned images or empty."
        )
    result["total_chars"] = sum(page["char_count"] for page in result["pages"])
    return result


# --------------------------------------------------------------------------- PDF


def _extract_pdf(path: Path) -> dict:
    import pdfplumber

    pages: list[dict] = []
    try:
        with pdfplumber.open(str(path)) as pdf:
            for page_number, page in enumerate(pdf.pages, start=1):
                try:
                    text = page.extract_text() or ""
                except Exception:
                    text = ""
                try:
                    for table in page.extract_tables() or []:
                        if table:
                            text += "\n\n" + _table_to_markdown(table)
                except Exception:
                    pass
                cleaned = _clean_text(text)
                if len(cleaned) > 20:
                    pages.append(
                        {"page": page_number, "text": cleaned, "char_count": len(cleaned)}
                    )
    except DocumentExtractionError:
        raise
    except Exception as exc:
        raise DocumentExtractionError(
            "This PDF could not be read. It may be corrupted or password protected."
        ) from exc

    return {"pages": pages, "page_count": len(pages), "location_unit": "page"}


def _table_to_markdown(table: list) -> str:
    if not table or not table[0]:
        return ""
    header = [str(cell or "").strip() for cell in table[0]]
    rows = [" | ".join(header), " | ".join(["---"] * len(header))]
    for row in table[1:]:
        rows.append(" | ".join([str(cell or "").strip() for cell in row]))
    return "\n".join(rows)


# ------------------------------------------------------------------- TXT / MD


def _extract_plain_text(path: Path) -> dict:
    raw = _read_text_file(path)
    sections = _paginate(raw)
    return {
        "pages": sections,
        "page_count": len(sections),
        "location_unit": "part",
    }


def _read_text_file(path: Path) -> str:
    data = path.read_bytes()
    for encoding in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            return data.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            continue
    return data.decode("latin-1", errors="replace")


# ---------------------------------------------------------------------- DOCX


def _extract_docx(path: Path) -> dict:
    try:
        from docx import Document
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise DocumentExtractionError(
            "DOCX support is not installed on this server."
        ) from exc

    try:
        document = Document(str(path))
    except Exception as exc:
        raise DocumentExtractionError(
            "This DOCX file could not be read. It may be corrupted."
        ) from exc

    parts: list[str] = []
    for block in _iter_docx_blocks(document):
        text = block.strip()
        if text:
            parts.append(text)

    sections = _paginate("\n\n".join(parts))
    return {
        "pages": sections,
        "page_count": len(sections),
        "location_unit": "part",
    }


def _iter_docx_blocks(document):
    """Yield paragraphs and tables in document order."""
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document).text
        elif isinstance(child, CT_Tbl):
            table = Table(child, document)
            rows = [
                " | ".join(cell.text.strip().replace("\n", " ") for cell in row.cells)
                for row in table.rows
            ]
            if rows:
                yield "\n".join(rows)


# ----------------------------------------------------------------------- CSV


def _extract_csv(path: Path) -> dict:
    raw = _read_text_file(path)
    if not raw.strip():
        raise DocumentExtractionError("This CSV file is empty.")

    try:
        dialect = csv.Sniffer().sniff(raw[:4096], delimiters=",;\t|")
        rows = list(csv.reader(io.StringIO(raw), dialect))
    except csv.Error:
        rows = list(csv.reader(io.StringIO(raw)))

    rows = [row for row in rows if any(cell.strip() for cell in row)]
    if not rows:
        raise DocumentExtractionError("This CSV file has no readable rows.")

    blocks: list[dict] = []
    header, body = rows[0], rows[1:]
    for block_number, start in enumerate(range(0, max(len(body), 1), CSV_ROWS_PER_BLOCK), start=1):
        slice_rows = body[start : start + CSV_ROWS_PER_BLOCK]
        if not slice_rows:
            continue
        lines = [_table_to_markdown([header] + slice_rows)]
        text = _clean_text("\n".join(lines))
        if text:
            blocks.append({"page": block_number, "text": text, "char_count": len(text)})

    if not blocks and header:
        text = _clean_text(_table_to_markdown([header]))
        blocks.append({"page": 1, "text": text, "char_count": len(text)})

    return {"pages": blocks, "page_count": len(blocks), "location_unit": "block"}


# ------------------------------------------------------------------- helpers


def _paginate(text: str, target_chars: int = VIRTUAL_SECTION_CHARS) -> list[dict]:
    """Split continuous text into sequential virtual sections."""
    cleaned = _clean_text(text)
    if not cleaned:
        return []
    if len(cleaned) <= target_chars:
        return [{"page": 1, "text": cleaned, "char_count": len(cleaned)}]

    sections: list[dict] = []
    paragraphs = cleaned.split("\n\n")
    buffer = ""
    for paragraph in paragraphs:
        if buffer and len(buffer) + len(paragraph) + 2 > target_chars:
            sections.append(buffer.strip())
            buffer = paragraph
        else:
            buffer = f"{buffer}\n\n{paragraph}" if buffer else paragraph
    if buffer.strip():
        sections.append(buffer.strip())

    return [
        {"page": index, "text": section, "char_count": len(section)}
        for index, section in enumerate(sections, start=1)
        if section
    ]


def _clean_text(text: str) -> str:
    text = re.sub(r"-\n", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()
