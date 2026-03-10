"""
Persistent Vector Store
-----------------------
TF-IDF based document store that survives server restarts.
All data is flushed to disk (rag_cache/) after every mutation.

Layout:
  rag_cache/
    index.json      - chunk documents + TF vectors
    registry.json   - policy metadata registry
    word_freq.json  - aggregate word-document frequency (IDF)
"""

import json, math, re, time, hashlib
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from models import UserRole


def _tokenize(text: str) -> List[str]:
    return [w for w in re.findall(r"\w+", text.lower()) if len(w) > 2]

def _calc_tf(words: List[str]) -> Dict[str, float]:
    counts: Dict[str, int] = defaultdict(int)
    for w in words:
        counts[w] += 1
    total = max(len(words), 1)
    return {w: c / total for w, c in counts.items()}

def _file_hash(path: str) -> str:
    """Fast SHA-256 fingerprint of first 64 KB for deduplication."""
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


class VectorStore:
    """
    Persistent TF-IDF store.

    On startup it reloads previously saved data so all documents indexed
    in earlier sessions are immediately available.  Every add/remove is
    flushed atomically to disk.
    """

    PERSIST_DIR = Path("./rag_cache")
    INDEX_FILE  = PERSIST_DIR / "index.json"
    REG_FILE    = PERSIST_DIR / "registry.json"
    FREQ_FILE   = PERSIST_DIR / "word_freq.json"

    def __init__(self) -> None:
        self.PERSIST_DIR.mkdir(parents=True, exist_ok=True)
        self._load()
        print(f"Vector store ready — {self.doc_count} chunks, "
              f"{len(self.registry)} policies")

    # ── persistence ──────────────────────────────────────────────────────

    def _load(self) -> None:
        def _read(p: Path, default):
            if p.exists():
                with open(p, "r", encoding="utf-8") as f:
                    return json.load(f)
            return default

        self.documents: List[Dict]       = _read(self.INDEX_FILE, [])
        self.registry:  Dict[str, Dict]  = _read(self.REG_FILE,   {})
        self.word_doc_freq: Dict[str, int] = _read(self.FREQ_FILE, {})
        self.doc_count = len(self.documents)

    def _save(self) -> None:
        _atomic_write(self.INDEX_FILE,  self.documents)
        _atomic_write(self.REG_FILE,    self.registry)
        _atomic_write(self.FREQ_FILE,   self.word_doc_freq)

    # ── public API ───────────────────────────────────────────────────────

    def is_policy_indexed(self, policy_id: str) -> bool:
        return policy_id in self.registry

    def find_indexed_file(self, file_path: str) -> Optional[str]:
        """Return policy_id if this exact file content was already indexed."""
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
            })

        self.doc_count = len(self.documents)

        # Update registry
        meta = chunks[0]["metadata"]
        pid  = meta.get("policy_id", "UNKNOWN")
        self.registry[pid] = {
            "policy_id":     pid,
            "policy_name":   meta.get("policy_name", ""),
            "version":       meta.get("version", "1.0"),
            "effective_date": meta.get("effective_date", ""),
            "required_role": meta.get("required_role", ""),
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
        self.documents = [
            d for d in self.documents
            if d["metadata"].get("policy_id") != policy_id
        ]
        removed = before - len(self.documents)

        # Rebuild word_doc_freq
        self.word_doc_freq = {}
        for doc in self.documents:
            for w in set(doc["words"]):
                self.word_doc_freq[w] = self.word_doc_freq.get(w, 0) + 1

        self.doc_count = len(self.documents)
        self.registry.pop(policy_id, None)
        self._save()
        print(f"Removed {removed} chunks for policy '{policy_id}'")
        return removed

    def search(self, query: str, user_role: UserRole, top_k: int = 5) -> List[Dict]:
        if not self.documents:
            return []

        q_words     = _tokenize(query)
        q_words_set = set(q_words)
        scores: List[Dict] = []

        for doc in self.documents:
            overlap       = len(q_words_set & set(doc["words"]))
            kw_score      = overlap / max(len(q_words_set), 1)

            tfidf = 0.0
            for w in q_words:
                if w in doc["tf"]:
                    freq = self.word_doc_freq.get(w, 0)
                    idf  = math.log(self.doc_count / freq) if freq > 0 else 0.0
                    tfidf += doc["tf"][w] * idf

            final = kw_score * 0.7 + tfidf * 0.3
            if final > 0:
                scores.append({
                    "chunk_id":        doc["id"],
                    "text":            doc["text"],
                    "metadata":        doc["metadata"],
                    "distance":        1 - final,
                    "relevance_score": final,
                })

        scores.sort(key=lambda x: x["relevance_score"], reverse=True)
        results = scores[:top_k]
        if results:
            print(f"Query hit — top score {results[0]['relevance_score']:.3f}")
        return results

    def get_collection_stats(self) -> Dict[str, Any]:
        return {
            "total_chunks":    self.doc_count,
            "unique_policies": len(self.registry),
            "collection_name": "persistent_tfidf",
            "cache_dir":       str(self.PERSIST_DIR.resolve()),
            "policies":        list(self.registry.values()),
        }
