"""
Lightweight vector store without onnxruntime dependency
"""
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from typing import List, Dict, Any
from models import UserRole
from config import settings


class VectorStore:
    """Manages vector embeddings using ChromaDB's default embeddings"""
    
    def __init__(self):
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=settings.chroma_persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False)
        )
        
        # Use simple default embedding (no onnxruntime needed)
        default_ef = embedding_functions.DefaultEmbeddingFunction()
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name="policy_documents",
            embedding_function=default_ef,
            metadata={"description": "Financial policy documents"}
        )
        
        print(f"Vector store initialized. Collection size: {self.collection.count()}")
    
    def add_chunks(self, chunks: List[Dict]) -> int:
        """Add policy chunks to vector store"""
        if not chunks:
            return 0
        
        ids = [chunk["id"] for chunk in chunks]
        texts = [chunk["text"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        
        # Add to collection (embeddings generated automatically)
        self.collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas
        )
        
        print(f"Added {len(chunks)} chunks to vector store")
        return len(chunks)
    
    def search(self, query: str, user_role: UserRole, top_k: int = None) -> List[Dict]:
        """Semantic search for relevant policy chunks"""
        if top_k is None:
            top_k = settings.top_k_results
        
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
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k * 2,
                where={"required_role": {"$in": allowed_roles}}
            )
        except Exception as e:
            print(f"Search with filter failed: {e}, trying without filter")
            # Fallback: search without filter
            results = self.collection.query(
                query_texts=[query],
                n_results=top_k
            )
        
        # Format results
        formatted_results = []
        
        if results['ids'] and results['ids'][0]:
            for i in range(min(top_k, len(results['ids'][0]))):
                formatted_results.append({
                    "chunk_id": results['ids'][0][i],
                    "text": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i],
                    "distance": results['distances'][0][i] if 'distances' in results else 0,
                    "relevance_score": 1 - (results['distances'][0][i] if 'distances' in results else 0)
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