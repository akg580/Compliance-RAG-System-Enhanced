"""
RAG Service  v6
===============
Improvements:
  - Evidence snippets included in policy responses (excerpt from chunk)
  - Citations now include page, offset, and excerpt for Evidence panel
  - Cleaner Groq prompts referencing excerpt context
  - query_type, confidence, and all routing unchanged from v5
"""

import re
from typing import List, Dict

from models import QueryRequest, QueryResponse, Citation, RiskLevel
from app_config import settings

RAG_THRESHOLD = 0.28   # normalised BM25 (0-1 scale)

_GREET_RE = re.compile(
    r"^(hi+|hello+|hey+|howdy|greetings|good\s*(morning|afternoon|evening|day)|"
    r"namaste|hola|what'?s?\s*up|yo+|sup|thanks?(\s+you)?|ty|thx|"
    r"bye+|goodbye|see\s+you|good\s*night|take\s+care|ok(ay)?|cool|great|"
    r"nice|awesome|sure|alright|who\s+are\s+you|what\s+are\s+you(\s+capable\s+of)?|"
    r"what\s+can\s+you\s+(do|help)|help(\s+me)?|tell\s+me\s+about\s+yourself)\W*$",
    re.IGNORECASE,
)

_GENERAL_SIGNALS = re.compile(
    r"\b(current|latest|today|now|recent|news|update|rbi\s+rate|repo\s+rate|"
    r"reverse\s+repo|crr|slr|inflation|gdp|economy|budget|policy\s+rate|"
    r"sebi|nse|bse|sensex|nifty|stock|market|weather|cricket|sports|movie|"
    r"what\s+is\s+rbi|tell\s+me\s+about\s+rbi)\b",
    re.IGNORECASE,
)


def _classify(query: str, chunks: List[Dict]) -> str:
    q = query.strip()
    if _GREET_RE.match(q):          return "greeting"
    if _GENERAL_SIGNALS.search(q):  return "general"
    if chunks and chunks[0].get("relevance_score", 0.0) >= RAG_THRESHOLD:
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
        q = req.query.strip()
        chunks = self.vector_store.search(q, req.user_role, top_k=5)
        qtype  = _classify(q, chunks)
        print(f"Query type: {qtype!r} | " +
              (f"top score {chunks[0]['relevance_score']:.3f}" if chunks else "no chunks"))

        if qtype == "greeting": return self._build_greeting(q)
        if qtype == "policy":   return self._build_policy(q, chunks, req)
        return self._build_general(q)

    # ── Builders ─────────────────────────────────────────────────────────────

    def _build_greeting(self, q: str) -> QueryResponse:
        return QueryResponse(
            success=True, query=q, query_type="greeting",
            answer=(
                "Hello! I'm **ComplianceAI**, your loan policy and finance assistant. 👋\n\n"
                "I can help you with:\n"
                "• **Policy questions** — LTV ratios, credit score requirements, DTI limits, BSA/AML rules\n"
                "• **RBI & regulatory updates** — repo rate, reverse repo, CRR, SLR, RBI circulars\n"
                "• **General finance** — home loan eligibility, EMI calculation, interest rate concepts\n\n"
                "What would you like to know?"
            ),
            confidence=100.0, citations=[],
            llm_mode="groq" if self.use_llm else "keyword_fallback",  # #18
        )

    def _build_policy(self, q: str, chunks: List[Dict], req: QueryRequest) -> QueryResponse:
        answer = self._groq_rag(q, chunks) if self.use_llm else self._keyword_fallback(q, chunks)
        return QueryResponse(
            success=True, query=q, query_type="policy",
            answer=answer,
            citations=self._citations(chunks),
            confidence=round(min(chunks[0]["relevance_score"] * 100, 95.0), 1),
            risk_level=RiskLevel.MEDIUM,
            llm_mode="groq" if self.use_llm else "keyword_fallback",  # #18
        )

    def _build_general(self, q: str) -> QueryResponse:
        if not self.use_llm:
            return QueryResponse(
                success=False, query=q, query_type="error", confidence=0.0,
                message="Add a Groq API key (free at console.groq.com) to answer general finance and news queries.",
                llm_mode="keyword_fallback",  # #18
            )
        return QueryResponse(
            success=True, query=q, query_type="general",
            answer=self._groq_general(q),
            citations=[], confidence=80.0, risk_level=RiskLevel.LOW,
            llm_mode="groq",  # #18
        )

    # ── Groq calls ────────────────────────────────────────────────────────────

    def _groq_rag(self, query: str, chunks: List[Dict]) -> str:
        context = "\n\n---\n\n".join(c["text"] for c in chunks[:4])
        try:
            r = self.llm_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": (
                        "You are a precise loan compliance assistant for an Indian bank. "
                        "Answer ONLY from the provided policy context. "
                        "Quote specific numbers (%, ratios, dates, amounts) when present. "
                        "If the context is insufficient, say so clearly — do not invent."
                    )},
                    {"role": "user", "content": (
                        f"POLICY CONTEXT:\n\n{context}\n\n"
                        f"QUESTION: {query}\n\nANSWER:"
                    )},
                ],
                temperature=0.05, max_tokens=700,
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
                        "You are ComplianceAI — expert on Indian banking, RBI policy, home loans, "
                        "personal finance, SEBI guidelines, and general finance. "
                        "Give accurate answers with numbers. For frequently-changing rates, "
                        "give last known value and suggest verifying at rbi.org.in. "
                        "Use **bold** and bullet points. Be concise (2–4 paragraphs max). "
                        "Never fabricate numbers."
                    )},
                    {"role": "user", "content": query},
                ],
                temperature=0.2, max_tokens=800,
            )
            return r.choices[0].message.content.strip()
        except Exception as e:
            print(f"Groq general error: {e}")
            return "I encountered an error reaching the AI service. Please try again."

    # ── Fallbacks ─────────────────────────────────────────────────────────────

    def _keyword_fallback(self, query: str, chunks: List[Dict]) -> str:
        stop = {"what","is","the","are","for","and","or","how","does","do","a","an",
                "in","of","to","please","tell","me","give","about","can","will","would","should"}
        q_terms = set(re.findall(r"\w+", query.lower())) - stop
        matched = []
        for chunk in chunks[:3]:
            for sent in re.split(r"(?<=[.!?])\s+", chunk["text"]):
                if sum(1 for t in q_terms if t in sent.lower()) >= min(2, len(q_terms)):
                    s = sent.strip()
                    if len(s) > 25 and s not in matched:
                        matched.append(s)
                if len(matched) >= 5:
                    break
        if matched:
            return "Based on the indexed policy documents:\n\n" + "\n\n".join(f"• {s}" for s in matched)
        top = chunks[0]["text"][:500].strip() if chunks else ""
        return f"Relevant policy excerpt:\n\n{top}\n\n(Add a Groq API key for AI-generated answers.)"

    # ── Citations — per-chunk, includes full excerpt for Evidence panel ────────

    @staticmethod
    def _citations(chunks: List[Dict]) -> List[Citation]:
        """
        Build one Citation per chunk (not per policy) so the Evidence panel
        can show each supporting passage independently.  Excerpt is the raw
        chunk text trimmed to 300 chars — enough for a readable snippet.
        """
        out = []
        for c in chunks:
            m   = c["metadata"]
            pid = m.get("policy_id", "UNKNOWN")
            raw_text = c.get("text", "")
            # Use stored excerpt if available, else derive from raw text
            excerpt_text = m.get("excerpt") or raw_text
            excerpt_trimmed = excerpt_text[:300].strip() if excerpt_text else None
            out.append(Citation(
                policy_id=pid,
                policy_name=m.get("policy_name", "Policy Document"),
                version=m.get("version", "1.0"),
                effective_date=m.get("effective_date", ""),
                page=m.get("page"),
                section=m.get("section"),
                excerpt=excerpt_trimmed,          # #15 Evidence panel
            ))
        return out