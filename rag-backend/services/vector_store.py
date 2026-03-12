"""
Persistent BM25 + TF-IDF Vector Store  v2
==========================================
Improvements over v1:
  - BM25 scoring (Okapi BM25) replaces raw TF-IDF — handles term saturation,
    better for keyword-dense policy text; no external dependency needed
  - Server-side RBAC enforced in search() — filters by required_role using
    a role hierarchy (Junior Officer < Senior Loan Officer < Credit Manager
    < Risk Officer < Senior Management)
  - Citation excerpt included in search results (from chunk metadata)
  - All mutations still atomic-write to disk (unchanged)
"""

import json, math, re, time, hashlib
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from models import UserRole


# ── Role hierarchy (server-side RBAC) ────────────────────────────────────────
# Higher number = higher clearance. A user can see docs at their level or below.

ROLE_LEVEL: Dict[str, int] = {
    "Junior Officer":      1,
    "Senior Loan Officer": 2,
    "Credit Manager":      3,
    "Risk Officer":        4,
    "Senior Management":   5,
}

def _role_level(role_str: str) -> int:
    """Return numeric level for a role string (enum value or plain string)."""
    # UserRole enum has .value; plain strings work directly
    key = role_str.value if hasattr(role_str, "value") else str(role_str)
    return ROLE_LEVEL.get(key, 1)


# ── Tokenizer ─────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"\w+", text.lower()) if len(w) > 2]


# ── BM25 scorer (Okapi BM25, no external deps) ───────────────────────────────
# Parameters: k1=1.5 (term frequency saturation), b=0.75 (length normalisation)

BM25_K1 = 1.5
BM25_B  = 0.75

def _bm25_score(
    query_words: List[str],
    doc_words:   List[str],
    doc_tf:      Dict[str, float],      # raw term freq (count / total)
    doc_len:     int,
    avg_doc_len: float,
    word_doc_freq: Dict[str, int],
    num_docs:    int,
) -> float:
    score = 0.0
    for w in query_words:
        if w not in doc_tf:
            continue
        # IDF (smooth, no zero division)
        df  = word_doc_freq.get(w, 0)
        idf = math.log((num_docs - df + 0.5) / (df + 0.5) + 1)
        # TF with saturation + length normalisation
        tf_raw = doc_tf[w] * doc_len          # recover raw count from ratio
        tf_bm25 = (tf_raw * (BM25_K1 + 1)) / (
            tf_raw + BM25_K1 * (1 - BM25_B + BM25_B * doc_len / max(avg_doc_len, 1))
        )
        score += idf * tf_bm25
    return score


def _calc_tf(words: List[str]) -> Dict[str, float]:
    counts: Dict[str, int] = defaultdict(int)
    for w in words:
        counts[w] += 1
    total = max(len(words), 1)
    return {w: c / total for w, c in counts.items()}


def _file_hash(path: str) -> str:
    h = hashlib.sha256()
    try:
        with open(path, "rb") as f:
            h.update(f.read(65536))
    except OSError:
        pass
    return h.hexdigest()


def _atomic_write(path: Path, data: Any) -> None:
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    tmp.replace(path)


# ── VectorStore ───────────────────────────────────────────────────────────────

class VectorStore:

    PERSIST_DIR = Path("./rag_cache")
    INDEX_FILE  = PERSIST_DIR / "index.json"
    REG_FILE    = PERSIST_DIR / "registry.json"
    FREQ_FILE   = PERSIST_DIR / "word_freq.json"

    def __init__(self) -> None:
        self.PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        self._load()
        print(f"Vector store ready — {self.doc_count} chunks, "
              f"{len(self.registry)} policies (BM25 scoring + RBAC)")

    # ── Persistence ──────────────────────────────────────────────────────────

    def _load(self) -> None:
        def _r(p, d):
            return json.loads(p.read_text(encoding="utf-8")) if p.exists() else d
        self.documents:    List[Dict]       = _r(self.INDEX_FILE, [])
        self.registry:     Dict[str, Dict]  = _r(self.REG_FILE,   {})
        self.word_doc_freq: Dict[str, int]  = _r(self.FREQ_FILE,  {})
        self.doc_count = len(self.documents)
        self._avg_doc_len = (
            sum(len(d.get("words", [])) for d in self.documents) / max(self.doc_count, 1)
        )

    def _save(self) -> None:
        _atomic_write(self.INDEX_FILE,  self.documents)
        _atomic_write(self.REG_FILE,    self.registry)
        _atomic_write(self.FREQ_FILE,   self.word_doc_freq)

    def _recompute_avg_len(self) -> None:
        self._avg_doc_len = (
            sum(len(d.get("words", [])) for d in self.documents) / max(len(self.documents), 1)
        )

    # ── Public API ───────────────────────────────────────────────────────────

    def is_policy_indexed(self, policy_id: str) -> bool:
        return policy_id in self.registry

    def find_indexed_file(self, file_path: str) -> Optional[str]:
        fh = _file_hash(file_path)
        for pid, info in self.registry.items():
            if info.get("file_hash") == fh:
                return pid
        return None

    def add_chunks(self, chunks: List[Dict], file_hash: str = "") -> int:
        if not chunks:
            return 0
        for chunk in chunks:
            words = _tokenize(chunk["text"])
            tf    = _calc_tf(words)
            for w in set(words):
                self.word_doc_freq[w] = self.word_doc_freq.get(w, 0) + 1
            self.documents.append({
                "id":       chunk["id"],
                "text":     chunk["text"],
                "metadata": chunk["metadata"],
                "words":    words,
                "tf":       tf,
                "doc_len":  len(words),
            })

        self.doc_count = len(self.documents)
        self._recompute_avg_len()

        meta = chunks[0]["metadata"]
        pid  = meta.get("policy_id", "UNKNOWN")
        self.registry[pid] = {
            "policy_id":     pid,
            "policy_name":   meta.get("policy_name", ""),
            "version":       meta.get("version", "1.0"),
            "effective_date": meta.get("effective_date", ""),
            "required_role": meta.get("required_role", "Junior Officer"),
            "risk_level":    meta.get("risk_level", "Low"),
            "chunk_count":   len(chunks),
            "indexed_at":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "file_hash":     file_hash,
        }
        self._save()
        print(f"Indexed {len(chunks)} chunks for '{pid}' — total {self.doc_count}")
        return len(chunks)

    def clear_policy(self, policy_id: str) -> int:
        before = len(self.documents)
        self.documents = [d for d in self.documents if d["metadata"].get("policy_id") != policy_id]
        removed = before - len(self.documents)
        # Rebuild word frequencies
        self.word_doc_freq = {}
        for doc in self.documents:
            for w in set(doc.get("words", [])):
                self.word_doc_freq[w] = self.word_doc_freq.get(w, 0) + 1
        self.doc_count = len(self.documents)
        self._recompute_avg_len()
        self.registry.pop(policy_id, None)
        self._save()
        print(f"Removed {removed} chunks for policy '{policy_id}'")
        return removed

    def search(self, query: str, user_role: UserRole, top_k: int = 5) -> List[Dict]:
        """
        BM25 search with server-side RBAC filtering.

        Only returns chunks whose policy required_role level ≤ user's role level.
        This enforces access control server-side, not just in the UI.
        """
        if not self.documents:
            return []

        q_words   = _tokenize(query)
        user_lvl  = _role_level(user_role)
        scores: List[Dict] = []

        for doc in self.documents:
            # ── RBAC gate (server-side) ───────────────────────────────────
            doc_required_role = doc["metadata"].get("required_role", "Junior Officer")
            doc_lvl = _role_level(doc_required_role)
            if user_lvl < doc_lvl:
                continue    # user lacks clearance for this document

            # ── BM25 score ────────────────────────────────────────────────
            bm25 = _bm25_score(
                q_words,
                doc.get("words", []),
                doc.get("tf", {}),
                doc.get("doc_len", 1),
                self._avg_doc_len,
                self.word_doc_freq,
                max(self.doc_count, 1),
            )

            if bm25 > 0:
                scores.append({
                    "chunk_id":       doc["id"],
                    "text":           doc["text"],
                    "metadata":       doc["metadata"],
                    "relevance_score": bm25,
                    # Include excerpt for Evidence panel in UI
                    "excerpt":        doc["metadata"].get("excerpt", doc["text"][:200]),
                })

        # Normalise BM25 scores to 0–1 range for consistent threshold comparison
        if scores:
            max_score = max(s["relevance_score"] for s in scores)
            if max_score > 0:
                for s in scores:
                    s["relevance_score"] = s["relevance_score"] / max_score

        scores.sort(key=lambda x: x["relevance_score"], reverse=True)
        results = scores[:top_k]
        if results:
            print(f"Query hit — top BM25 score {results[0]['relevance_score']:.3f} "
                  f"(role={user_role}, filtered by RBAC)")
        return results

    def get_collection_stats(self) -> Dict[str, Any]:
        return {
            "total_chunks":    self.doc_count,
            "unique_policies": len(self.registry),
            "collection_name": "persistent_bm25",
            "cache_dir":       str(self.PERSIST_DIR.resolve()),
            "policies":        list(self.registry.values()),
            "avg_doc_len_words": round(self._avg_doc_len, 1),
        }