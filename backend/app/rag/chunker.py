"""
rag/chunker.py  —  Text Chunking

After extraction, we can't feed entire documents to the embedding model.
We split text into overlapping chunks so:
  1. Each chunk fits in the embedding model's input window
  2. Overlap (50 chars) ensures context isn't lost at chunk boundaries

Strategy: RecursiveCharacterTextSplitter from LangChain
  - Tries to split on paragraphs first, then sentences, then words
  - Much better than naive fixed-size splitting
"""

import os
from langchain.text_splitter import RecursiveCharacterTextSplitter


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Input:  pages = [{ page, text, source, char_count }, ...]
    Output: chunks = [{ content, page_number, chunk_index, source, char_count }, ...]
    """
    chunk_size = int(os.getenv("CHUNK_SIZE", 500))
    chunk_overlap = int(os.getenv("CHUNK_OVERLAP", 50))

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        # Priority order: paragraphs → sentences → words → characters
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    all_chunks = []
    global_chunk_index = 0

    for page_data in pages:
        if not page_data["text"].strip():
            continue

        # Split this page's text into chunks
        raw_chunks = splitter.split_text(page_data["text"])

        for raw_chunk in raw_chunks:
            cleaned = raw_chunk.strip()
            if len(cleaned) < 30:    # skip tiny fragments
                continue

            all_chunks.append({
                "content": cleaned,
                "page_number": page_data["page"],
                "chunk_index": global_chunk_index,
                "source": page_data["source"],
                "char_count": len(cleaned),
            })
            global_chunk_index += 1

    return all_chunks
