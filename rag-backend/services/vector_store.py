from typing import List, Dict, Any
from models import UserRole
from collections import defaultdict
import re
import math


class VectorStore:
    def __init__(self):
        self.documents = []
        self.doc_count = 0
        self.word_doc_freq = defaultdict(int)
        print(f"Vector store initialised. Collection size: 0")

    def _tokenize(self, text: str) -> List[str]:
        text = text.lower()
        words = re.findall(r'\w+', text)
        return [w for w in words if len(w) > 2]

    def _calculate_tf(self, words: List[str]) -> Dict[str, float]:
        tf = defaultdict(int)
        for word in words:
            tf[word] += 1
        total = len(words)
        return {word: count / total for word, count in tf.items()}

    def _calculate_idf(self, word: str) -> float:
        if self.doc_count == 0:
            return 0
        doc_freq = self.word_doc_freq.get(word, 0)
        if doc_freq == 0:
            return 0
        return math.log(self.doc_count / doc_freq)

    def add_chunks(self, chunks: List[Dict]) -> int:
        if not chunks:
            return 0
        for chunk in chunks:
            words = self._tokenize(chunk["text"])
            tf = self._calculate_tf(words)
            for word in set(words):
                self.word_doc_freq[word] += 1
            self.documents.append({
                "id": chunk["id"],
                "text": chunk["text"],
                "metadata": chunk["metadata"],
                "words": words,
                "tf": tf
            })
        self.doc_count = len(self.documents)
        print(f"Added {len(chunks)} chunks (Total: {self.doc_count})")
        return len(chunks)

    def search(self, query: str, user_role: UserRole, top_k: int = 5) -> List[Dict]:
        if not self.documents:
            print("No documents in store")
            return []
        query_words = self._tokenize(query)
        query_words_set = set(query_words)
        scores = []
        for doc in self.documents:
            doc_words_set = set(doc["words"])
            overlap = len(query_words_set & doc_words_set)
            keyword_score = overlap / max(len(query_words_set), 1)
            tfidf_score = 0
            for word in query_words:
                if word in doc["tf"]:
                    tfidf_score += doc["tf"][word] * self._calculate_idf(word)
            final_score = (keyword_score * 0.7) + (tfidf_score * 0.3)
            if final_score > 0:
                scores.append({
                    "chunk_id": doc["id"],
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "distance": 1 - final_score,
                    "relevance_score": final_score
                })
        scores.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scores[:top_k]

    def get_collection_stats(self) -> Dict[str, Any]:
        unique_policies = set(
            doc["metadata"].get("policy_id")
            for doc in self.documents
            if doc["metadata"].get("policy_id")
        )
        return {
            "total_chunks": self.doc_count,
            "unique_policies": len(unique_policies),
            "collection_name": "simple_store"
        }
