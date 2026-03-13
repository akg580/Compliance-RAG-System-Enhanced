"""
RAG Service — ComplianceAI
Query routing: greeting → policy → general
"""

import re
from typing import List, Dict

from models import QueryRequest, QueryResponse, Citation, RiskLevel
from app_config import settings

RAG_THRESHOLD = 0.30

_GREET_RE = re.compile(
    r"^("
    r"hi+|hello+|hey+|howdy|greetings|"
    r"good\s*(morning|afternoon|evening|day)|"
    r"namaste|hola|what'?s?\s*up|yo+|sup|"
    r"thanks?(\s+you)?|ty|thx|"
    r"bye+|goodbye|see\s+you|good\s*night|take\s+care|"
    r"ok(ay)?|cool|great|nice|awesome|sure|alright|"
    r"who\s+are\s+you|what\s+are\s+you(\s+capable\s+of)?|"
    r"what\s+can\s+you\s+(do|help)|"
    r"help(\s+me)?|tell\s+me\s+about\s+yourself"
    r")\W*$",
    re.IGNORECASE,
)

_GENERAL_SIGNALS = re.compile(
    r"\b(current|latest|today|now|recent|news|update|"
    r"rbi\s+rate|repo\s+rate|reverse\s+repo|crr|slr|"
    r"inflation|gdp|economy|budget|policy\s+rate|"
    r"sebi|nse|bse|sensex|nifty|stock|market|"
    r"weather|cricket|sports|movie|"
    r"what\s+is\s+rbi|tell\s+me\s+about\s+rbi)\b",
    re.IGNORECASE,
)


def _classify(query: str, chunks: List[Dict]) -> str:
    q = query.strip()
    if _GREET_RE.match(q):
        return "greeting"
    if _GENERAL_SIGNALS.search(q):
        return "general"
    if chunks and chunks[0].get("score", 0.0) >= RAG_THRESHOLD:
        return "policy"
    return "general"


class RAGService:

    def __init__(self, vector_store) -> None:
        self.vector_store = vector_store
        self.llm_client   = None
        self.use_llm      = False
        self._init_llm()

    def _init_llm(self) -> None:
        if not settings.groq_api_key:
            print("No Groq API key — keyword fallback active")
            return
        try:
            from groq import Groq
            self.llm_client = Groq(api_key=settings.groq_api_key)
            self.use_llm    = True
            print("Groq LLM ready (llama-3.3-70b-versatile)")
        except Exception as e:
            print(f"Groq init failed: {e}")

    def process_query(self, req: QueryRequest) -> QueryResponse:
        q      = req.query.strip()
        chunks = self.vector_store.search(q, req.user_role, top_k=5)
        qtype  = _classify(q, chunks)
        top    = chunks[0]["score"] if chunks else 0.0
        print(f"Query [{qtype}] score={top:.3f} | {q[:60]}")

        if qtype == "greeting":
            return self._build_greeting(q)
        elif qtype == "policy":
            return self._build_policy(q, chunks)
        else:
            return self._build_general(q)

    # ── Builders ──────────────────────────────────────────────────────────────

    def _build_greeting(self, q: str) -> QueryResponse:
        return QueryResponse(
            success=True, query=q, query_type="greeting",
            llm_mode="groq" if self.use_llm else "keyword_fallback",
            answer=(
                "Hello! I'm **ComplianceAI**, your loan policy assistant. 👋\n\n"
                "I can help you with:\n"
                "• **Policy questions** — LTV ratios, credit score requirements, DTI limits\n"
                "• **RBI & regulatory updates** — repo rate, CRR, SLR, RBI circulars\n"
                "• **General finance** — home loan eligibility, EMI concepts\n\n"
                "What would you like to know?"
            ),
            confidence=100.0, citations=[],
        )

    def _build_policy(self, q: str, chunks: List[Dict]) -> QueryResponse:
        if self.use_llm:
            answer = self._groq_rag(q, chunks)
            mode   = "groq"
        else:
            answer = self._keyword_fallback(q, chunks)
            mode   = "keyword_fallback"
        return QueryResponse(
            success=True, query=q, query_type="policy",
            llm_mode=mode,
            answer=answer,
            citations=self._citations(chunks),
            confidence=round(min(chunks[0]["score"] * 100, 95.0), 1),
            risk_level=RiskLevel.MEDIUM,
        )

    def _build_general(self, q: str) -> QueryResponse:
        if not self.use_llm:
            return QueryResponse(
                success=False, query=q, query_type="error",
                llm_mode="keyword_fallback",
                confidence=0.0,
                message=(
                    "This question goes beyond your uploaded policy documents. "
                    "Add a Groq API key (free at console.groq.com) to enable "
                    "general finance and regulatory Q&A."
                ),
            )
        answer = self._groq_general(q)
        return QueryResponse(
            success=True, query=q, query_type="general",
            llm_mode="groq",
            answer=answer, citations=[],
            confidence=80.0, risk_level=RiskLevel.LOW,
        )

    # ── Groq calls ────────────────────────────────────────────────────────────

    def _groq_rag(self, query: str, chunks: List[Dict]) -> str:
        context = "\n\n---\n\n".join(c["text"] for c in chunks[:3])
        try:
            r = self.llm_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": (
                        "You are a precise loan compliance assistant for an Indian bank. "
                        "Answer ONLY from the provided policy context below. "
                        "Always quote specific numbers (percentages, ratios, dates, amounts) "
                        "when they appear in the context. "
                        "If the context does not contain the answer, say: "
                        "'The uploaded policy documents do not cover this.' "
                        "Do not use outside knowledge for policy answers."
                    )},
                    {"role": "user", "content": (
                        f"POLICY CONTEXT:\n\n{context}\n\n"
                        f"QUESTION: {query}\n\n"
                        f"ANSWER (based only on the context above):"
                    )},
                ],
                temperature=0.05,
                max_tokens=700,
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq RAG error: {e}")
            return self._keyword_fallback(query, chunks)

    def _groq_general(self, query: str) -> str:
        try:
            r = self.llm_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": (
                        "You are ComplianceAI — expert on Indian banking regulation, "
                        "RBI, home loans, personal loans, interest rates, EMI, LTV, DTI, "
                        "CIBIL scores. Give accurate answers with numbers where known. "
                        "For frequently-changing rates, give last known value and suggest "
                        "verifying on rbi.org.in. Use markdown. Be concise."
                    )},
                    {"role": "user", "content": query},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq general error: {e}")
            return "I encountered an error reaching the AI service. Please try again."

    # ── Fallback & citations ──────────────────────────────────────────────────

    def _keyword_fallback(self, query: str, chunks: List[Dict]) -> str:
        stop = {
            "what", "is", "the", "are", "for", "and", "or", "how", "does",
            "do", "a", "an", "in", "of", "to", "please", "tell", "me",
            "give", "about", "can", "will", "would", "should", "its", "my",
        }
        q_terms = set(re.findall(r"\w+", query.lower())) - stop
        matched = []
        for chunk in chunks[:3]:
            for sent in re.split(r"(?<=[.!?])\s+", chunk["text"]):
                hits = sum(1 for t in q_terms if t in sent.lower())
                if hits >= min(2, len(q_terms)):
                    s = sent.strip()
                    if len(s) > 25 and s not in matched:
                        matched.append(s)
                if len(matched) >= 5:
                    break
        if matched:
            return ("Based on the indexed policy documents:\n\n"
                    + "\n\n".join(f"• {s}" for s in matched))
        top = chunks[0]["text"][:500].strip() if chunks else ""
        return (f"Relevant policy excerpt:\n\n{top}\n\n"
                "(Add a Groq API key to rag-backend/.env for AI-generated answers.)")

    @staticmethod
    def _citations(chunks: List[Dict]) -> List[Citation]:
        seen, out = set(), []
        for c in chunks:
            m   = c["metadata"]
            pid = m.get("policy_id", "UNKNOWN")
            if pid not in seen:
                seen.add(pid)
                excerpt = (c["text"][:300] + "…") if len(c["text"]) > 300 else c["text"]
                out.append(Citation(
                    policy_id=pid,
                    policy_name=m.get("policy_name", "Policy Document"),
                    version=m.get("version", "1.0"),
                    effective_date=m.get("effective_date", ""),
                    page=m.get("page"),
                    excerpt=excerpt,
                ))
        return out