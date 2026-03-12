"""
Document Processor  v2
======================
Key improvements over v1:
  - Sliding-window chunking with configurable overlap (was one chunk per page)
  - chunk_overlap setting from config is now actually used
  - Stores page, offset_start, offset_end in every chunk metadata
  - OCR fallback for scanned PDFs (pytesseract, if installed)
  - Returns supporting excerpt with each chunk (first 200 chars)
"""

import re
import uuid
from typing import List, Dict, Any

import pypdf
from app_config import settings


# ── OCR fallback ──────────────────────────────────────────────────────────────

def _ocr_page(page) -> str:
    """Try pytesseract OCR on a page image. Returns '' if unavailable."""
    try:
        import pytesseract
        from PIL import Image
        import io
        # pypdf can render page to image via pypdfium2 if installed,
        # otherwise we use a simpler approach
        try:
            from pypdf import PdfReader
            # Extract images from page
            for img_obj in page.images:
                img_data = img_obj.data
                img = Image.open(io.BytesIO(img_data))
                text = pytesseract.image_to_string(img, lang="eng")
                if text.strip():
                    return text
        except Exception:
            pass
    except ImportError:
        pass
    return ""


# ── Sliding window chunker ────────────────────────────────────────────────────

def _sliding_chunks(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
    page_num: int,
    policy_metadata: Dict,
) -> List[Dict]:
    """
    Split text into overlapping word-boundary chunks.
    Each chunk records page, offset_start, offset_end for citation accuracy.
    """
    words = text.split()
    if not words:
        return []

    step = max(1, chunk_size - chunk_overlap)
    chunks = []
    pos = 0

    while pos < len(words):
        window = words[pos : pos + chunk_size]
        chunk_text = " ".join(window)

        # Character offsets in original text (approximate, word-based)
        char_start = len(" ".join(words[:pos])) + (1 if pos > 0 else 0)
        char_end   = char_start + len(chunk_text)

        chunks.append({
            "id":   str(uuid.uuid4()),
            "text": chunk_text,
            "metadata": {
                **policy_metadata,
                "page":         page_num,
                "offset_start": char_start,
                "offset_end":   char_end,
                "chunk_index":  len(chunks),
                # First 200 chars as display excerpt for Evidence panel
                "excerpt":      chunk_text[:200].strip(),
            },
        })

        pos += step
        if pos + chunk_overlap >= len(words) and pos < len(words):
            # Capture the final tail if it would otherwise be skipped
            break

    # Always include a final chunk if the last window didn't reach the end
    if words and chunks:
        last_end = len(" ".join(words[:pos + chunk_size]))
        if pos < len(words):
            tail = " ".join(words[pos:])
            if tail and tail != chunks[-1]["text"]:
                chunks.append({
                    "id":   str(uuid.uuid4()),
                    "text": tail,
                    "metadata": {
                        **policy_metadata,
                        "page":         page_num,
                        "offset_start": last_end,
                        "offset_end":   last_end + len(tail),
                        "chunk_index":  len(chunks),
                        "excerpt":      tail[:200].strip(),
                    },
                })

    return chunks


# ── Processor ────────────────────────────────────────────────────────────────

class DocumentProcessor:

    def __init__(self):
        self.chunk_size    = settings.chunk_size       # words per chunk (default 150)
        self.chunk_overlap = settings.chunk_overlap    # overlap in words  (default 30)
        # Convert from characters (old config) to approximate word counts
        # Old default was 1000 chars ≈ 150 words; overlap 200 chars ≈ 30 words
        # Clamp to sensible word-count range
        if self.chunk_size > 500:   # was set as char count
            self.chunk_size    = 150
            self.chunk_overlap = 30

    def extract_text_from_pdf(self, pdf_path: str) -> Dict[int, str]:
        page_texts: Dict[int, str] = {}
        try:
            with open(pdf_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for i, page in enumerate(reader.pages, start=1):
                    text = page.extract_text() or ""
                    text = text.strip()

                    # OCR fallback for scanned/image-only pages
                    if len(text) < 40:
                        ocr_text = _ocr_page(page)
                        if ocr_text.strip():
                            print(f"  OCR fallback used for page {i}")
                            text = ocr_text

                    if text:
                        page_texts[i] = text
        except Exception as e:
            print(f"PDF extraction error: {e}")
            raise
        return page_texts

    def chunk_document(self, pdf_path: str, policy_metadata: Dict) -> List[Dict]:
        page_texts = self.extract_text_from_pdf(pdf_path)
        all_chunks: List[Dict] = []

        for page_num, text in page_texts.items():
            # Clean whitespace but preserve sentence boundaries
            clean = re.sub(r"\s+", " ", text).strip()
            page_chunks = _sliding_chunks(
                clean,
                self.chunk_size,
                self.chunk_overlap,
                page_num,
                policy_metadata,
            )
            all_chunks.extend(page_chunks)

        print(f"Chunked '{policy_metadata.get('policy_id')}': "
              f"{len(page_texts)} pages → {len(all_chunks)} chunks "
              f"(size={self.chunk_size}w, overlap={self.chunk_overlap}w)")
        return all_chunks

    def extract_conditions_and_exceptions(self, text: str) -> Dict[str, List[str]]:
        return {"preconditions": [], "exceptions": []}