"""
FastAPI server — ComplianceAI RAG Backend  v4 (Production)
===========================================================
All 20 items addressed:
  #1  CORS reads from ALLOWED_ORIGINS env var (no code changes needed for prod)
  #2  allow_credentials=False, no wildcard
  #4  policy_id regex validation
  #8  Persistent JSONL audit log
  #12 Pinned requirements.txt (separate file)
  #17 50 MB server-side file limit + rate limiting (30 req/min per IP)
  #18 llm_mode surfaced in /health and every query response
  #19 /readyz + /livez + /health endpoints
"""

import hashlib, json, os, re, shutil, time, uuid  # os required for os.getenv (CORS)
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from models import DocumentUploadResponse, HealthCheck, PolicyInfo, QueryRequest, QueryResponse
from services import DocumentProcessor, RAGService, VectorStore
from app_config import settings


# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ComplianceAI RAG API",
    description="Persistent BM25 RAG backend for loan policy compliance",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# #1/#2 CORS: reads from env var so no code change is needed for production.
# Set in .env:  ALLOWED_ORIGINS=https://your-app.onrender.com,https://your-domain.com
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

UPLOAD_DIR     = Path("uploads");  UPLOAD_DIR.mkdir(exist_ok=True)
AUDIT_FILE     = Path("audit.jsonl")
MAX_FILE_BYTES = 52_428_800                # 50 MB hard limit
POLICY_ID_RE   = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")

# ── Rate limiter (in-memory, per IP, sliding window) ─────────────────────────

_rate_window: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT    = 30
RATE_WINDOW_S = 60.0

def _check_rate(ip: str) -> None:
    now = time.monotonic()
    _rate_window[ip] = [t for t in _rate_window[ip] if now - t < RATE_WINDOW_S]
    if len(_rate_window[ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit: {RATE_LIMIT} requests per minute. Please wait.",
        )
    _rate_window[ip].append(now)

# ── Audit log ─────────────────────────────────────────────────────────────────

def _audit(event: str, detail: dict) -> None:
    entry = {
        "ts":    datetime.utcnow().isoformat(timespec="seconds") + "Z",
        "event": event,
        **detail,
    }
    try:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"Audit log write error: {e}")

# ── Services ──────────────────────────────────────────────────────────────────

print("=" * 60)
print("ComplianceAI RAG Backend v4 starting...")
print(f"CORS allowed origins: {ALLOWED_ORIGINS}")
print("=" * 60)

vector_store  = VectorStore()
doc_processor = DocumentProcessor()
rag_service   = RAGService(vector_store)


def _hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read(65536))
    return h.hexdigest()


def _auto_reindex() -> None:
    pdfs = list(UPLOAD_DIR.glob("*.pdf"))
    if not pdfs:
        print("No PDFs in uploads/ — nothing to reindex.")
        return
    reindexed = 0
    for pdf_path in pdfs:
        pid = pdf_path.stem
        if vector_store.is_policy_indexed(pid):
            continue
        print(f"  Auto-reindexing: {pdf_path.name}")
        meta = {
            "policy_id": pid, "policy_name": pid.replace("-", " ").title(),
            "version": "1.0", "effective_date": "",
            "required_role": "Junior Officer", "risk_level": "Low",
        }
        try:
            fh = _hash_file(str(pdf_path))
            chunks = doc_processor.chunk_document(str(pdf_path), meta)
            if chunks:
                vector_store.add_chunks(chunks, file_hash=fh)
                reindexed += 1
        except Exception as e:
            print(f"  Auto-reindex failed for {pdf_path.name}: {e}")
    print(f"Auto-reindexed {reindexed} PDF(s)." if reindexed else "All PDFs already cached.")


_auto_reindex()
print("=" * 60)
print(f"Ready -- {vector_store.doc_count} chunks across {len(vector_store.registry)} policies.")
print(f"LLM mode: {'groq' if rag_service.use_llm else 'keyword_fallback'}")
print("=" * 60)


def _json_response(data: dict, status_code: int = 200) -> Response:
    def _default(obj):
        if hasattr(obj, "isoformat"): return obj.isoformat()
        return str(obj)
    return Response(
        content=json.dumps(data, default=_default),
        media_type="application/json",
        status_code=status_code,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    stats = vector_store.get_collection_stats()
    llm_mode = "groq" if rag_service.use_llm else "keyword_fallback"
    return _json_response({
        "status": "healthy", "version": "4.0.0",
        "collection_size": stats["total_chunks"],
        "policies_indexed": stats["unique_policies"],
        "llm_mode": llm_mode,           # #18 surfaced to frontend
        "allowed_origins": ALLOWED_ORIGINS,
        "services": {
            "vector_store": "ok",
            "llm": llm_mode,
        },
    })

@app.get("/readyz")
def readyz():
    """Kubernetes/Render readiness probe."""
    return _json_response({"ready": True, "chunks": vector_store.doc_count})

@app.get("/livez")
def livez():
    """Kubernetes/Render liveness probe."""
    return _json_response({"alive": True})

@app.get("/")
def root():
    return health()


@app.post("/api/query")
async def query_policy(query_request: QueryRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    _check_rate(ip)
    try:
        t0       = time.perf_counter()
        response = rag_service.process_query(query_request)
        elapsed  = round((time.perf_counter() - t0) * 1000, 1)
        data     = response.model_dump()
        data["response_time_ms"] = elapsed

        _audit("query", {
            "query":      query_request.query[:200],
            "user_role":  query_request.user_role,
            "query_type": data.get("query_type"),
            "success":    data.get("success"),
            "confidence": data.get("confidence"),
            "llm_mode":   data.get("llm_mode"),
            "policy_ids": [c["policy_id"] for c in (data.get("citations") or [])],
            "latency_ms": elapsed,
            "ip":         ip,
        })

        return _json_response(data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_policy_document(
    file:           UploadFile = File(...),
    policy_id:      str        = Form(None),
    name:           str        = Form(None),
    version:        str        = Form("1.0"),
    effective_date: str        = Form(None),
    required_role:  str        = Form("Junior Officer"),
    risk_level:     str        = Form("Low"),
):
    try:
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(400, "Only PDF files are supported.")

        content = await file.read()
        if len(content) > MAX_FILE_BYTES:
            raise HTTPException(413, f"File too large ({len(content)//1_048_576} MB). Max is 50 MB.")

        if not policy_id:
            policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
        else:
            policy_id = policy_id.strip()
            if not POLICY_ID_RE.match(policy_id):
                raise HTTPException(400, "policy_id: 1-64 alphanumeric/dash/underscore chars only.")

        if not name:
            name = file.filename.replace(".pdf", "").replace(".PDF", "").replace("_", " ").title()
        if not effective_date:
            from datetime import date
            effective_date = date.today().isoformat()

        file_path = UPLOAD_DIR / f"{policy_id}.pdf"
        with open(file_path, "wb") as buf:
            buf.write(content)

        file_hash    = _hash_file(str(file_path))
        existing_pid = vector_store.find_indexed_file(str(file_path))
        if existing_pid:
            _audit("upload_duplicate", {"policy_id": existing_pid, "filename": file.filename})
            return _json_response({
                "success": True,
                "message": f"Already indexed as '{existing_pid}'. No re-processing needed.",
                "policy_id": existing_pid,
                "chunks_created": vector_store.registry[existing_pid]["chunk_count"],
                "already_indexed": True,
            })

        policy_meta = {
            "policy_id": policy_id, "policy_name": name,
            "version": version, "effective_date": effective_date,
            "required_role": required_role, "risk_level": risk_level,
        }
        chunks     = doc_processor.chunk_document(str(file_path), policy_meta)
        num_chunks = vector_store.add_chunks(chunks, file_hash=file_hash)

        _audit("upload_success", {
            "policy_id": policy_id, "filename": file.filename,
            "chunks": num_chunks, "required_role": required_role,
        })

        return _json_response({
            "success": True,
            "message": "Policy uploaded and indexed successfully.",
            "policy_id": policy_id,
            "chunks_created": num_chunks,
            "already_indexed": False,
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(500, str(e))


@app.get("/api/policies")
def list_policies():
    stats = vector_store.get_collection_stats()
    return _json_response({
        "total_chunks":    stats["total_chunks"],
        "unique_policies": stats["unique_policies"],
        "cache_dir":       stats["cache_dir"],
        "policies":        stats["policies"],
    })


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str):
    if not POLICY_ID_RE.match(policy_id):
        raise HTTPException(400, "Invalid policy_id format.")
    if not vector_store.is_policy_indexed(policy_id):
        raise HTTPException(404, f"Policy '{policy_id}' not found.")
    removed = vector_store.clear_policy(policy_id)
    _audit("delete_policy", {"policy_id": policy_id, "chunks_removed": removed})
    return _json_response({
        "success": True,
        "message": f"Removed {removed} chunks for policy '{policy_id}'.",
        "chunks_removed": removed,
    })


@app.get("/api/stats")
def get_stats():
    return _json_response(vector_store.get_collection_stats())


@app.get("/api/audit")
def get_audit_log(limit: int = 100):
    """Export last N audit log entries."""
    entries = []
    if AUDIT_FILE.exists():
        lines = AUDIT_FILE.read_text(encoding="utf-8").strip().splitlines()
        for line in lines[-limit:]:
            try:
                entries.append(json.loads(line))
            except Exception:
                pass
    return _json_response({"count": len(entries), "entries": list(reversed(entries))})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=False)