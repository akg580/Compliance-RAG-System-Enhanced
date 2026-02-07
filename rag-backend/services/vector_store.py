"""
Vector database management with ChromaDB
"""
import hashlib
from typing import List, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings
import numpy as np

from models.models import UserRole
from config.config import settings


class _FallbackEmbedder:
    """Lightweight embedder when PyTorch/sentence-transformers fail (e.g. Windows DLL). No torch required."""

    DIM = 384

    def encode(self, texts: List[str], convert_to_numpy=True):
        out = []
        for i, text in enumerate(texts):
            h = hashlib.sha256((text + str(i)).encode()).hexdigest()
            seed = int(h[:16], 16) % (2**32)
            rng = np.random.default_rng(seed)
            vec = rng.standard_normal(self.DIM).astype(np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            out.append(vec)
        arr = np.stack(out)
        return arr if convert_to_numpy else arr.tolist()


def _get_embedding_model():
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer("all-MiniLM-L6-v2")
    except (ImportError, OSError) as e:
        print(f"Warning: sentence_transformers/torch not available ({e}). Using fallback embedder (no semantic similarity).")
        return _FallbackEmbedder()


class VectorStore:
    """Manages vector embeddings and semantic search"""

    def __init__(self):
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_directory,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            )
        )

        # Initialize embedding model (fallback if torch DLL fails on Windows)
        self.embedding_model = _get_embedding_model()
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="policy_documents",
            metadata={"description": "Financial policy documents"}
        )
        
        print(f"Vector store initialized. Collection size: {self.collection.count()}")
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for texts"""
        embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()
    
    def add_chunks(self, chunks: List[Dict]) -> int:
        """Add policy chunks to vector store"""
        if not chunks:
            return 0
        
        ids = [chunk["id"] for chunk in chunks]
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        
        # Generate embeddings
        embeddings = self.generate_embeddings(texts)
        
        # Add to collection
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )
        
        print(f"Added {len(chunks)} chunks to vector store")
        return len(chunks)
    
    def search(self, query: str, user_role: UserRole, top_k: int = None) -> List[Dict]:
        """Semantic search for relevant policy chunks"""
        if top_k is None:
            top_k = settings.top_k_results
        
        # Generate query embedding
        query_embedding = self.generate_embeddings([query])[0]
        
        # Define role hierarchy for RBAC
        role_hierarchy = {
            UserRole.JUNIOR_OFFICER: [UserRole.JUNIOR_OFFICER],
            UserRole.SENIOR_LOAN_OFFICER: [UserRole.JUNIOR_OFFICER, UserRole.SENIOR_LOAN_OFFICER],
            UserRole.CREDIT_MANAGER: [UserRole.JUNIOR_OFFICER, UserRole.SENIOR_LOAN_OFFICER, UserRole.CREDIT_MANAGER],
            UserRole.RISK_OFFICER: [UserRole.JUNIOR_OFFICER, UserRole.SENIOR_LOAN_OFFICER, UserRole.CREDIT_MANAGER, UserRole.RISK_OFFICER],
            UserRole.SENIOR_MANAGEMENT: list(UserRole)
        }
        
        allowed_roles = [role.value for role in role_hierarchy.get(user_role, [user_role])]
        
        # Search with RBAC filter
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k * 2,
            where={"required_role": {"$in": allowed_roles}}
        )
        
        # Format results
        formatted_results = []
        
        if results['ids'] and results['ids'][0]:
            for i in range(min(top_k, len(results['ids'][0]))):
                formatted_results.append({
                    "chunk_id": results['ids'][0][i],
                    "text": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i],
                    "relevance_score": 1 - results['distances'][0][i]
                })
        
        return formatted_results
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector store"""
        count = self.collection.count()
        
        # Get unique policies
        all_data = self.collection.get()
        unique_policies = set()
        if all_data['metadatas']:
            for metadata in all_data['metadatas']:
                if 'policy_id' in metadata:
                    unique_policies.add(metadata['policy_id'])
        
        return {
            "total_chunks": count,
            "unique_policies": len(unique_policies),
            "collection_name": self.collection.name
        }