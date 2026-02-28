import re
import uuid
from typing import List, Dict, Any
import pypdf
from app_config import settings

class DocumentProcessor:
    def __init__(self):
        self.chunk_size = settings.chunk_size

    def extract_text_from_pdf(self, pdf_path: str) -> Dict[int, str]:
        page_texts = {}
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = pypdf.PdfReader(file)
                for i, page in enumerate(pdf_reader.pages, start=1):
                    text = page.extract_text()
                    if text:
                        page_texts[i] = text
        except Exception as e:
            print(f"PDF error: {e}")
            raise
        return page_texts

    def chunk_document(self, pdf_path: str, policy_metadata: Dict) -> List[Dict]:
        page_texts = self.extract_text_from_pdf(pdf_path)
        chunks = []
        for page_num, text in page_texts.items():
            clean_text = re.sub(r'\s+', ' ', text).strip()
            chunk = {
                "id": str(uuid.uuid4()),
                "text": clean_text[:self.chunk_size],
                "metadata": {**policy_metadata, "page": page_num}
            }
            chunks.append(chunk)
        return chunks

    def extract_conditions_and_exceptions(self, text: str) -> Dict[str, List[str]]:
        return {"preconditions": [], "exceptions": []}
