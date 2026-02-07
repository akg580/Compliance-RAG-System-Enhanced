"""
Simple in-memory vector store - NO external dependencies
Uses basic TF-IDF for search (no ML, no onnxruntime, no PyTorch)
"""
from typing import List, Dict, Any
from models import UserRole
from collections import defaultdict
import re
import math


class VectorStore:
    """Simple TF-IDF based document store"""
    
    def __init__(self):
        self.documents = []  # Store all chunks
        self.doc_count = 0
        self.word_doc_freq = defaultdict(int)  # IDF calculation
        print(f"Vector store initialized. Collection size: 0")
    
    def _tokenize(self, text: str) -> List[str]:
        """Simple tokenization"""
        text = text.lower()
        words = re.findall(r'\w+', text)
        return [w for w in words if len(w) > 2]  # Filter short words
    
    def _calculate_tf(self, words: List[str]) -> Dict[str, float]:
        """Term frequency"""
        tf = defaultdict(int)
        for word in words:
            tf[word] += 1
        # Normalize
        total = len(words)
        return {word: count/total for word, count in tf.items()}
    
    def _calculate_idf(self, word: str) -> float:
        """Inverse document frequency"""
        if self.doc_count == 0:
            return 0
        doc_freq = self.word_doc_freq.get(word, 0)
        if doc_freq == 0:
            return 0
        return math.log(self.doc_count / doc_freq)
    
    def add_chunks(self, chunks: List[Dict]) -> int:
        """Add chunks to store"""
        if not chunks:
            return 0
        
        for chunk in chunks:
            doc_id = chunk["id"]
            text = chunk["text"]
            metadata = chunk["metadata"]
            
            # Tokenize and calculate TF
            words = self._tokenize(text)
            tf = self._calculate_tf(words)
            
            # Update word document frequency
            unique_words = set(words)
            for word in unique_words:
                self.word_doc_freq[word] += 1
            
            # Store document
            self.documents.append({
                "id": doc_id,
                "text": text,
                "metadata": metadata,
                "words": words,
                "tf": tf
            })
        
        self.doc_count = len(self.documents)
        print(f"✅ Added {len(chunks)} chunks to vector store (Total: {self.doc_count})")
        return len(chunks)

    def search(self, query: str, user_role: UserRole, top_k: int = 5) -> List[Dict]:
        """Search using improved keyword matching + TF-IDF"""
        if not self.documents:
            print("❌ No documents in store")
            return []
        
        print(f"\n🔍 Searching for: '{query}'")
        
        # Tokenize query
        query_words = self._tokenize(query)
        query_words_set = set(query_words)
        
        print(f"   Query tokens: {query_words[:5]}...")
        
        # Calculate scores for each document
        scores = []
        for doc in self.documents:
            # Method 1: Simple keyword overlap (works better for short queries)
            doc_words_set = set(doc["words"])
            overlap = len(query_words_set & doc_words_set)
            keyword_score = overlap / max(len(query_words_set), 1)
            
            # Method 2: TF-IDF score
            tfidf_score = 0
            for word in query_words:
                if word in doc["tf"]:
                    tf = doc["tf"][word]
                    idf = self._calculate_idf(word)
                    tfidf_score += tf * idf
            
            # Combine both scores (keyword matching is more reliable for simple queries)
            final_score = (keyword_score * 0.7) + (tfidf_score * 0.3)
            
            if final_score > 0:
                scores.append({
                    "chunk_id": doc["id"],
                    "text": doc["text"],
                    "metadata": doc["metadata"],
                    "distance": 1 - final_score,
                    "relevance_score": final_score
                })
        
        # Sort by score (descending)
        scores.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        # Return top k
        results = scores[:top_k]
        
        if results:
            print(f"✅ Found {len(results)} results")
            print(f"   Top result score: {results[0]['relevance_score']:.3f}")
            print(f"   Preview: {results[0]['text'][:100]}...")
        else:
            print(f"❌ No results found")
        
        return results
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get stats"""
        unique_policies = set()
        for doc in self.documents:
            policy_id = doc["metadata"].get("policy_id")
            if policy_id:
                unique_policies.add(policy_id)
        
        return {
            "total_chunks": self.doc_count,
            "unique_policies": len(unique_policies),
            "collection_name": "simple_store"
        }
