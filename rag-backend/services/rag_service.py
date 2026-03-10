"""
RAG Service  v4
---------------
Three clean query modes:

  GREETING  – hi, hello, thanks → instant reply, no LLM, no search
  POLICY    – question well-answered by uploaded PDFs (high vector score)
  GENERAL   – everything else: news, RBI rates, finance Q&A, concepts
               → Groq answers from its own knowledge, NO citations
"""

import re
from typing import List, Dict

from models import QueryRequest, QueryResponse, Citation, RiskLevel
from app_config import settings

# ─────────────────────────────────────────────
# Tuning knobs
# ─────────────────────────────────────────────

# Minimum TF-IDF relevance score to treat a hit as "the PDF answers this"
# Keep this high enough that generic PDF words don't hijack general questions.
_RAG_THRESHOLD = 0.35

# Greeting regex – must be the whole query (anchored ^…$)
_GREET_RE = re.compile(
    r"^\s*(hi+|hello+|hey+|howdy|greetings|"
    r"good\s*(morning|afternoon|evening|day)|"
    r"namaste|hola|what'?s?\s*up|yo+|sup|"
    r"thanks?(\s+you)?|ty|thx|"
    r"bye+|goodbye|see\s*you|good\s*night|take\s*care|"
    r"ok(ay)?|cool|great|nice|awesome|sure|alright|"
    r"who\s+are\s+you|what\s+are\s+you|"
    r"help|what\s+can\s+you\s+do)\W*$",
    re.IGNORECASE,
)


def _is_greeting(q: str) -> bool:
    return bool(_GREET_RE.match(q.strip()))


def _is_strong_policy_hit(chunks: List[Dict]) -> bool:
    """True only if the top chunk has a genuinely high relevance score."""
    return bool(chunks) and chunks[0].get("relevance_score", 0.0) >= _RAG_THRESHOLD


# ─────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────

class RAGService:

    def __init__(self, vector_store) -> None:
        self.vector_store = vector_store
        self.llm_client   = None
        self.use_llm      = False
        self._init_llm()

    def _init_llm(self) -> None:
        if not settings.groq_api_key:
            print("No Groq API key — keyword fallback mode active")
            return
        try:
            from groq import Groq
            self.llm_client = Groq(api_key=settings.groq_api_key)
            self.use_llm    = True
            print("Groq LLM ready (llama-3.3-70b-versatile)")
        except Exception as e:
            print(f"Groq init failed: {e}")

    # ── public ────────────────────────────────────────────────────────────

    def process_query(self, req: QueryRequest) -> QueryResponse:
        q = req.query.strip()

        # 1. Greeting
        if _is_greeting(q):
            return self._greeting_response(q)

        # 2. Vector search (always run, result decides routing)
        chunks = self.vector_store.search(q, req.user_role, top_k=5)

        # 3. Strong PDF hit → RAG with citations
        if _is_strong_policy_hit(chunks):
            return self._rag_response(q, chunks)

        # 4. Everything else → general LLM (no citations)
        return self._general_response(q)

    # ── response builders ─────────────────────────────────────────────────

    def _greeting_response(self, q: str) -> QueryResponse:
        answer = (
            "Hello! I'm **ComplianceAI**, your loan policy and finance assistant. 👋\n\n"
            "I can help you with:\n"
            "• **Policy questions** — LTV ratios, credit scores, DTI limits, BSA/AML rules\n"
            "• **RBI & regulatory news** — repo rate, SEBI updates, banking circulars\n"
            "• **General finance** — home loan eligibility, interest rates, EMI concepts\n\n"
            "What would you like to know?"
        )
        return QueryResponse(
            success=True, query=q, answer=answer,
            confidence=100.0, citations=[],
            # special marker so frontend knows this is a greeting
            message="greeting",
        )

    def _rag_response(self, q: str, chunks: List[Dict]) -> QueryResponse:
        """Answer strictly from indexed policy PDFs."""
        if self.use_llm:
            answer = self._call_groq_rag(chunks, q)
        else:
            answer = self._keyword_answer(chunks, q)

        return QueryResponse(
            success=True, query=q,
            answer=answer,
            citations=self._build_citations(chunks),
            confidence=round(min(chunks[0]["relevance_score"] * 100, 95.0), 1),
            risk_level=RiskLevel.MEDIUM,
        )

    def _general_response(self, q: str) -> QueryResponse:
        """Answer from Groq's own training knowledge — no PDF citations."""
        if not self.use_llm:
            return QueryResponse(
                success=False, query=q, confidence=0.0,
                message=(
                    "This question is outside the indexed policy documents. "
                    "Add a Groq API key (free at console.groq.com) to enable "
                    "general finance and news answers."
                ),
            )

        answer = self._call_groq_general(q)
        return QueryResponse(
            success=True, query=q,
            answer=answer,
            citations=[],           # ← no document citations for general answers
            confidence=80.0,
            risk_level=RiskLevel.LOW,
            message="general",      # marker for frontend rendering
        )

    # ── Groq calls ────────────────────────────────────────────────────────

    def _call_groq_rag(self, chunks: List[Dict], query: str) -> str:
        context = "\n\n---\n\n".join(c["text"] for c in chunks[:3])
        try:
            r = self.llm_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": (
                        "You are a precise loan compliance assistant for an Indian bank. "
                        "Answer ONLY from the provided policy context. "
                        "Quote specific numbers (%, ratios, dates) when present. "
                        "If the context is insufficient, say so briefly."
                    )},
                    {"role": "user", "content": (
                        f"Policy Context:\n\n{context}\n\n"
                        f"Question: {query}\n\nAnswer:"
                    )},
                ],
                temperature=0.05,
                max_tokens=700,
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq RAG error: {e}")
            return self._keyword_answer(chunks, query)

    def _call_groq_general(self, query: str) -> str:
        try:
            r = self.llm_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": (
                        "You are ComplianceAI, an expert on Indian banking, RBI policy, "
                        "home loans, personal finance, and general finance topics. "
                        "Give accurate, up-to-date answers using your training knowledge. "
                        "For rates or news that may change frequently, mention your "
                        "knowledge cutoff (early 2025) and suggest checking RBI's website "
                        "for the very latest figures. "
                        "Be concise, professional, and use markdown formatting where helpful."
                    )},
                    {"role": "user", "content": query},
                ],
                temperature=0.3,
                max_tokens=800,
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq general error: {e}")
            return "I encountered an error reaching the AI service. Please try again."

    # ── fallbacks ─────────────────────────────────────────────────────────

    def _keyword_answer(self, chunks: List[Dict], query: str) -> str:
        stop = {"what","is","the","are","for","and","or","how","does","do",
                "a","an","in","of","to","please","tell","me","give","about"}
        q_terms = set(re.findall(r"\w+", query.lower())) - stop
        matched = []
        for chunk in chunks[:3]:
            for sent in re.split(r"(?<=[.!?])\s+", chunk["text"]):
                if sum(1 for t in q_terms if t in sent.lower()) >= min(2, len(q_terms)):
                    s = sent.strip()
                    if len(s) > 20 and s not in matched:
                        matched.append(s)
                if len(matched) >= 5:
                    break
        if matched:
            return "Based on the indexed policy documents:\n\n" + \
                   "\n\n".join(f"• {s}" for s in matched)
        top = chunks[0]["text"][:400].strip()
        return (f"Relevant policy excerpt:\n\n{top}\n\n"
                "(Add a Groq API key for detailed AI-generated answers.)")

    @staticmethod
    def _build_citations(chunks: List[Dict]) -> List[Citation]:
        seen, out = set(), []
        for c in chunks:
            m = c["metadata"]
            pid = m.get("policy_id", "UNKNOWN")
            if pid not in seen:
                seen.add(pid)
                out.append(Citation(
                    policy_id=pid,
                    policy_name=m.get("policy_name", "Policy Document"),
                    version=m.get("version", "1.0"),
                    effective_date=m.get("effective_date", ""),
                    page=m.get("page"),
                ))
        return out