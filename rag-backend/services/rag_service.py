from __future__ import annotations  # 1. Allows postponed evaluation of annotations
from typing import Dict, List, TYPE_CHECKING
from openai import OpenAI
from models import QueryRequest, QueryResponse, Citation, RiskLevel
from config import settings

# 2. This block is ONLY seen by type checkers (VS Code/PyCharm), NOT by Python at runtime
if TYPE_CHECKING:
    from services.vector_store import VectorStore

class RAGService:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store
        self.llm_client = OpenAI(api_key=settings.openai_api_key)
        
    # ... rest of your code

        
    def process_query(self, query_request: QueryRequest) -> QueryResponse:
        # 1. Search for relevant chunks
        chunks = self.vector_store.search(query_request.query, query_request.user_role, 5)
    
        if not chunks:
            return QueryResponse(
                success=False,
                query=query_request.query,
                confidence=0.0,
                message="No policy documents found. Please upload policy PDFs first."
            )
    
        # 2. Join all chunks to provide full context
        context = "\n---\n".join([c["text"] for c in chunks])
    
        try:
            # 3. Request completion from OpenAI
            response = self.llm_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a loan policy assistant. Answer strictly based on the provided policy document context. If the answer isn't there, say you don't know."},
                    {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query_request.query}"}
                ],
                temperature=0.1
            )
            answer = response.choices[0].message.content
        except Exception as e:
            print(f"LLM error: {e}")
            answer = "An error occurred while generating the answer."

        # 4. Map citations from the metadata of retrieved chunks
        citations = [
            Citation(
                policy_id=c["metadata"].get("policy_id", "UNKNOWN"),
                policy_name=c["metadata"].get("policy_name", "Unknown Policy"),
                version=c["metadata"].get("version", "1.0"),
                effective_date=c["metadata"].get("effective_date", "N/A")
            ) for c in chunks[:1] # Using the top chunk for the primary citation
        ]
    
        return QueryResponse(
            success=True,
            query=query_request.query,
            answer=answer,
            citations=citations,
            preconditions=[],
            exceptions=[],
            confidence=85.0,
            risk_level=RiskLevel.MEDIUM
        )
