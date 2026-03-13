"""
Persistent BM25 + TF-IDF Vector Store
No external dependencies — pure Python implementation.
Data persists in rag_cache/ across server restarts.
"""

import json
import math
import re
import time
import hashlib
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from models import UserRole

# ── Role hierarchy ────────────────────────────────────────────────────────────
ROLE_LEVEL: Dict[str, int] = {
    "Junior Officer":      1,
    "Senior Loan Officer": 2,
    "Credit Manager":      3,
    "Risk Officer":        4,
    "Senior Management":   5,
}

def _role_level(key: str) -> int:
    return ROLE_LEVEL.get(key, 1)

# ── BM25 parameters ───────────────────────────────────────────────────────────
BM25_K1 = 1.5
BM25_B  = 0.75

def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"\w+", text.lower()) if len(w) > 2]

def _calc_tf(words: List[str]) -> Dict[str, float]:
    counts: Dict[str, int] = defaultdict(int)
    for w in words:
        counts[w] += 1
    total = max(len(words), 1)
    return {w: c / total for w, c in counts.items()}

def _bm25_score(
    query_words: List[str],
    doc_tf: Dict[str, float],
    doc_len: int,
    avg_doc_len: float,
    idf: Dict[str, float],
) -> float:
    score = 0.0
    for w in query_words:
        if w not in doc_tf:
            continue
        tf_raw  = doc_tf[w] * doc_len
        tf_bm25 = (tf_raw * (BM25_K1 + 1)) / (
            tf_raw + BM25_K1 * (1 - BM25_B + BM25_B * doc_len / max(avg_doc_len, 1))
        )
        score += idf.get(w, 0.0) * tf_bm25
    return score

def _atomic_write(path: Path, data: Any) -> None:
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    tmp.replace(path)


class VectorStore:
    PERSIST_DIR   = Path("./rag_cache")
    INDEX_FILE    = PERSIST_DIR / "index.json"
    REG_FILE      = PERSIST_DIR / "registry.json"
    WFREQ_FILE    = PERSIST_DIR / "word_freq.json"

    def __init__(self):
        self.PERSIST_DIR.mkdir(exist_ok=True)
        self.docs:     List[Dict]        = []
        self.registry: Dict[str, Any]    = {}
        self.word_doc_freq: Dict[str, int] = defaultdict(int)
        self._load()

    # ── Persistence ───────────────────────────────────────────────────────────
    def _load(self) -> None:
        if self.INDEX_FILE.exists():
            try:
                self.docs = json.loads(self.INDEX_FILE.read_text("utf-8"))
            except Exception:
                self.docs = []
        if self.REG_FILE.exists():
            try:
                self.registry = json.loads(self.REG_FILE.read_text("utf-8"))
            except Exception:
                self.registry = {}
        if self.WFREQ_FILE.exists():
            try:
                self.word_doc_freq = defaultdict(int, json.loads(self.WFREQ_FILE.read_text("utf-8")))
            except Exception:
                self.word_doc_freq = defaultdict(int)

        # Backfill older cache entries missing computed fields
        changed = False
        for doc in self.docs:
            if "doc_len" not in doc or "tf" not in doc:
                words = _tokenize(doc.get("text", ""))
                doc["doc_len"] = len(words)
                doc["tf"] = _calc_tf(words)
                changed = True
        if changed:
            self._flush()

    def _flush(self) -> None:
        _atomic_write(self.INDEX_FILE, self.docs)
        _atomic_write(self.REG_FILE, self.registry)
        _atomic_write(self.WFREQ_FILE, dict(self.word_doc_freq))

    # ── Properties ────────────────────────────────────────────────────────────
    @property
    def doc_count(self) -> int:
        return len(self.docs)

    # ── Indexing ──────────────────────────────────────────────────────────────
    def add_chunks(self, chunks: List[Dict], file_hash: str = "") -> int:
        if not chunks:
            return 0
        pid   = chunks[0]["metadata"]["policy_id"]
        pname = chunks[0]["metadata"].get("policy_name", pid)

        # Remove old version of this policy if re-uploading
        self.clear_policy(pid, flush=False)

        new_docs = []
        for chunk in chunks:
            words = _tokenize(chunk["text"])
            tf    = _calc_tf(words)
            doc   = {
                "id":       chunk["id"],
                "text":     chunk["text"],
                "metadata": chunk["metadata"],
                "tf":       tf,
                "doc_len":  len(words),
            }
            new_docs.append(doc)
            for w in set(words):
                self.word_doc_freq[w] += 1

        self.docs.extend(new_docs)

        self.registry[pid] = {
            "policy_id":      pid,
            "policy_name":    pname,
            "version":        chunks[0]["metadata"].get("version", "1.0"),
            "effective_date": chunks[0]["metadata"].get("effective_date", ""),
            "required_role":  chunks[0]["metadata"].get("required_role", "Junior Officer"),
            "risk_level":     chunks[0]["metadata"].get("risk_level", "Low"),
            "chunk_count":    len(new_docs),
            "indexed_at":     str(int(time.time())),
            "file_hash":      file_hash,
        }
        self._flush()
        return len(new_docs)

    def clear_policy(self, pid: str, flush: bool = True) -> int:
        before = len(self.docs)
        removed_words: Dict[str, int] = defaultdict(int)
        kept = []
        for doc in self.docs:
            if doc["metadata"]["policy_id"] == pid:
                for w in doc.get("tf", {}).keys():
                    removed_words[w] += 1
            else:
                kept.append(doc)
        self.docs = kept
        for w, cnt in removed_words.items():
            self.word_doc_freq[w] = max(0, self.word_doc_freq.get(w, 0) - cnt)
        self.registry.pop(pid, None)
        if flush:
            self._flush()
        return before - len(self.docs)

    # ── Search ────────────────────────────────────────────────────────────────
    def search(self, query: str, user_role: UserRole, top_k: int = 5) -> List[Dict]:
        if not self.docs:
            return []
        q_words    = _tokenize(query)
        n_docs     = len(self.docs)
        avg_dl     = sum(d.get("doc_len", 1) for d in self.docs) / n_docs

        # IDF for query words
        idf: Dict[str, float] = {}
        for w in q_words:
            df     = self.word_doc_freq.get(w, 0)
            idf[w] = math.log((n_docs - df + 0.5) / (df + 0.5) + 1)

        user_lvl = _role_level(str(user_role.value if hasattr(user_role, "value") else user_role))
        results  = []
        for doc in self.docs:
            doc_required = doc["metadata"].get("required_role", "Junior Officer")
            doc_lvl      = _role_level(doc_required)
            if user_lvl < doc_lvl:
                continue   # RBAC filter
            score = _bm25_score(q_words, doc.get("tf", {}), doc.get("doc_len", 1), avg_dl, idf)
            if score > 0:
                results.append({**doc, "score": score})

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    # ── Lookups ───────────────────────────────────────────────────────────────
    def is_policy_indexed(self, pid: str) -> bool:
        return pid in self.registry

    def find_indexed_file(self, path: str) -> Optional[str]:
        """Return policy_id if this file (by hash) is already indexed."""
        try:
            h = hashlib.sha256()
            with open(path, "rb") as f:
                h.update(f.read(65536))
            fhash = h.hexdigest()
        except OSError:
            return None
        for pid, meta in self.registry.items():
            if meta.get("file_hash") == fhash:
                return pid
        return None

    def get_collection_stats(self) -> Dict:
        policies = []
        for pid, meta in self.registry.items():
            policies.append({
                "policy_id":      pid,
                "policy_name":    meta.get("policy_name", pid),
                "version":        meta.get("version", "1.0"),
                "effective_date": meta.get("effective_date", ""),
                "required_role":  meta.get("required_role", "Junior Officer"),
                "risk_level":     meta.get("risk_level", "Low"),
                "chunk_count":    meta.get("chunk_count", 0),
                "indexed_at":     meta.get("indexed_at", ""),
            })
        return {
            "total_chunks":    len(self.docs),
            "unique_policies": len(self.registry),
            "cache_dir":       str(self.PERSIST_DIR),
            "policies":        policies,
        }
