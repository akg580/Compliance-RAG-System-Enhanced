"""
Document Processor — ComplianceAI
Sliding-window chunking with overlap. OCR fallback for scanned PDFs.
"""
import re
import uuid
from typing import Any, Dict, List

import pypdf
from app_config import settings


def _ocr_page(page) -> str:
    """Try pytesseract OCR on a page image. Returns '' if unavailable."""
    try:
        import pytesseract
        from PIL import Image
        import io
        img_bytes = page.to_image(resolution=200).original
        if hasattr(img_bytes, "tobytes"):
            img = img_bytes
        else:
            img = Image.open(io.BytesIO(img_bytes))
        return pytesseract.image_to_string(img) or ""
    except Exception:
        return ""


def _sliding_chunks(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> List[str]:
    """Split text into overlapping word-based chunks."""
    words = text.split()
    if not words:
        return []
    step = max(1, chunk_size - chunk_overlap)
    chunks = []
    pos = 0
    while pos < len(words):
        chunk_words = words[pos: pos + chunk_size]
        chunks.append(" ".join(chunk_words))
        # Last chunk
        if pos + chunk_overlap >= len(words) and pos < len(words):
            break
        pos += step
    return chunks


class DocumentProcessor:
    def __init__(self):
        self.chunk_size    = getattr(settings, "chunk_size", 150)
        self.chunk_overlap = getattr(settings, "chunk_overlap", 30)

    def extract_text_from_pdf(self, pdf_path: str) -> Dict[int, str]:
        page_texts: Dict[int, str] = {}
        try:
            with open(pdf_path, "rb") as fh:
                reader = pypdf.PdfReader(fh)
                for i, page in enumerate(reader.pages, start=1):
                    text = page.extract_text() or ""
                    if not text.strip():
                        text = _ocr_page(page)
                    if text.strip():
                        page_texts[i] = text
        except Exception as e:
            print(f"PDF extract error for {pdf_path}: {e}")
            raise
        return page_texts

    def chunk_document(
        self, pdf_path: str, policy_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        page_texts = self.extract_text_from_pdf(pdf_path)
        chunks: List[Dict[str, Any]] = []
        for page_num, raw_text in page_texts.items():
            clean = re.sub(r"\s+", " ", raw_text).strip()
            for chunk_text in _sliding_chunks(clean, self.chunk_size, self.chunk_overlap):
                if len(chunk_text.strip()) < 20:
                    continue
                chunks.append({
                    "id":       str(uuid.uuid4()),
                    "text":     chunk_text,
                    "metadata": {**policy_metadata, "page": page_num},
                })
        return chunks

    def extract_conditions_and_exceptions(self, text: str) -> Dict[str, List[str]]:
        return {"preconditions": [], "exceptions": []}