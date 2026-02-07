from typing import Dict, List
from groq import Groq  # Change from openai to groq
from models import QueryRequest, QueryResponse, Citation, RiskLevel
from config import settings


class RAGService:
    def __init__(self, vector_store):
        self.vector_store = vector_store
        
        # Use Groq instead of OpenAI
        if settings.groq_api_key:
            self.llm_client = Groq(api_key=settings.groq_api_key)
            self.use_llm = True
            print("🚀 Using Groq LLM (FREE)")
        else:
            self.llm_client = None
            self.use_llm = False
            print("⚠️ No Groq API key - using fallback mode")
        
    def process_query(self, query_request: QueryRequest) -> QueryResponse:
        # Search for relevant chunks
        chunks = self.vector_store.search(query_request.query, query_request.user_role, 5)
        
        if not chunks:
            return QueryResponse(
                success=False,
                query=query_request.query,
                confidence=0.0,
                message="No relevant policy information found."
            )
        
        context = "\n\n---\n\n".join([c["text"] for c in chunks[:3]])

        # Inside process_query method, replace the try/except block:
        if self.use_llm:
            try:
                # Call Groq (much faster than OpenAI!)
                response = self.llm_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",  # Fast & accurate
                    messages=[
                        {"role": "system", "content": "You are a helpful loan policy assistant. Answer based strictly on the provided context."},
                        {"role": "user", "content": f"Context:\n\n{context}\n\nQuestion: {query_request.query}\n\nAnswer:"}
                    ],
                    temperature=0.1,
                    max_tokens=500
                )
                answer = response.choices[0].message.content
                print(f"✅ Generated answer with Groq")
            except Exception as e:
                print(f"❌ Groq error: {e}")
                answer = self._extract_answer_from_context(chunks, query_request.query)

        # Create citation
        citations = [
            Citation(
                policy_id=chunks[0]["metadata"].get("policy_id", "UNKNOWN"),
                policy_name=chunks[0]["metadata"].get("policy_name", "Policy Document"),
                version=chunks[0]["metadata"].get("version", "1.0"),
                effective_date=chunks[0]["metadata"].get("effective_date", "2024")
            )
        ]

        return QueryResponse(
            success=True,
            query=query_request.query,
            answer=answer,
            citations=citations,
            preconditions=[],
            exceptions=[],
            confidence=min(chunks[0].get("relevance_score", 0) * 100, 95.0),
            risk_level=RiskLevel.MEDIUM
        )
