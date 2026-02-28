from typing import Optional, List
from models import QueryRequest, QueryResponse, Citation, RiskLevel
from app_config import settings


class RAGService:
    def __init__(self, vector_store):
        self.vector_store = vector_store
        if settings.groq_api_key:
            try:
                from groq import Groq
                self.llm_client = Groq(api_key=settings.groq_api_key)
                self.use_llm = True
                print("Using Groq LLM")
            except ImportError:
                print("groq package not installed — using fallback mode")
                self.llm_client = None
                self.use_llm = False
        else:
            self.llm_client = None
            self.use_llm = False
            print("No Groq API key — using keyword-extraction fallback")

    def process_query(self, query_request: QueryRequest) -> QueryResponse:
        chunks = self.vector_store.search(
            query_request.query, query_request.user_role, top_k=5
        )
        if not chunks:
            return QueryResponse(
                success=False,
                query=query_request.query,
                confidence=0.0,
                message="No relevant policy information found. Upload policy documents first."
            )

        context = "\n\n---\n\n".join(c["text"] for c in chunks[:3])
        answer: Optional[str] = None

        if self.use_llm:
            try:
                resp = self.llm_client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a compliance policy assistant. Answer based strictly on the provided context."},
                        {"role": "user", "content": f"Context:\n\n{context}\n\nQuestion: {query_request.query}\n\nAnswer:"}
                    ],
                    temperature=0.1,
                    max_tokens=600
                )
                answer = resp.choices[0].message.content.strip()
            except Exception as e:
                print(f"Groq error: {e}")
                answer = self._extract_answer_from_context(chunks, query_request.query)
        else:
            answer = self._extract_answer_from_context(chunks, query_request.query)

        citations = self._build_citations(chunks)
        confidence = min(round(chunks[0].get("relevance_score", 0) * 100, 1), 95.0)

        return QueryResponse(
            success=True,
            query=query_request.query,
            answer=answer,
            citations=citations,
            preconditions=[],
            exceptions=[],
            confidence=confidence,
            risk_level=RiskLevel.MEDIUM
        )

    def _extract_answer_from_context(self, chunks: list, query: str) -> str:
        if not chunks:
            return "No relevant policy information could be extracted."
        text = chunks[0]["text"]
        query_words = set(query.lower().split())
        sentences = [s.strip() for s in text.replace("\n", " ").split(".") if len(s.strip()) > 20]
        scored = sorted(
            [(len(query_words & set(s.lower().split())), s) for s in sentences],
            reverse=True
        )
        top = [s for _, s in scored[:3] if s]
        return (". ".join(top) + ".") if top else text[:500]

    def _build_citations(self, chunks: list) -> List[Citation]:
        seen = set()
        citations = []
        for chunk in chunks:
            meta = chunk.get("metadata", {})
            pid = meta.get("policy_id", "UNKNOWN")
            if pid in seen:
                continue
            seen.add(pid)
            citations.append(Citation(
                policy_id=pid,
                policy_name=meta.get("policy_name", "Policy Document"),
                version=meta.get("version", "1.0"),
                page=meta.get("page"),
                effective_date=meta.get("effective_date", "N/A")
            ))
        return citations
