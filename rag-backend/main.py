"""
FastAPI server — ComplianceAI RAG Backend  v5
All /api/* routes require Bearer JWT token.
Public routes: /health, /readyz, /livez, /docs, /auth/*
"""

import hashlib, json, os, re, time, uuid
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from models import QueryRequest, UserRole
from services import DocumentProcessor, RAGService, VectorStore
from app_config import settings
from jwt_auth import router as auth_router, require_user

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ComplianceAI RAG API",
    version="5.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS from env
_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
)
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Authorization"],
)

app.include_router(auth_router)

# ── Constants ─────────────────────────────────────────────────────────────────
UPLOAD_DIR     = Path("uploads"); UPLOAD_DIR.mkdir(exist_ok=True)
AUDIT_FILE     = Path("audit.jsonl")
MAX_FILE_BYTES = 52_428_800
POLICY_ID_RE   = re.compile(r"^[A-Za-z0-9_\-]{1,64}$")

# ── Rate limiter ──────────────────────────────────────────────────────────────
_rate: dict[str, list[float]] = defaultdict(list)

def _check_rate(ip: str) -> None:
    now = time.monotonic()
    _rate[ip] = [t for t in _rate[ip] if now - t < 60.0]
    if len(_rate[ip]) >= 30:
        raise HTTPException(429, "Rate limit: 30 req/min.")
    _rate[ip].append(now)

# ── Audit log ─────────────────────────────────────────────────────────────────
def _audit(event: str, detail: dict) -> None:
    entry = {"ts": datetime.utcnow().isoformat(timespec="seconds") + "Z",
             "event": event, **detail}
    try:
        with open(AUDIT_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"[AUDIT] {e}")

# ── Services ──────────────────────────────────────────────────────────────────
print("=" * 60)
print(f"ComplianceAI v5 | CORS: {ALLOWED_ORIGINS}")
print("=" * 60)

vector_store  = VectorStore()
doc_processor = DocumentProcessor()
rag_service   = RAGService(vector_store)


def _file_hash(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def _auto_reindex() -> None:
    for pdf in UPLOAD_DIR.glob("*.pdf"):
        pid = pdf.stem
        if vector_store.is_policy_indexed(pid):
            continue
        print(f"  Auto-reindex: {pdf.name}")
        meta = {
            "policy_id": pid,
            "policy_name": pid.replace("-", " ").title(),
            "version": "1.0", "effective_date": "",
            "required_role": "Junior Officer", "risk_level": "Low",
        }
        try:
            chunks = doc_processor.chunk_document(str(pdf), meta)
            if chunks:
                vector_store.add_chunks(chunks, file_hash=_file_hash(str(pdf)))
        except Exception as e:
            print(f"  Failed {pdf.name}: {e}")


_auto_reindex()
print(f"Ready — {vector_store.doc_count} chunks | "
      f"{len(vector_store.registry)} policies | "
      f"LLM: {'groq' if rag_service.use_llm else 'keyword_fallback'}")
print("=" * 60)


def _json(data: dict, status: int = 200) -> Response:
    def _default(o):
        if hasattr(o, "isoformat"): return o.isoformat()
        return str(o)
    return Response(content=json.dumps(data, default=_default),
                    media_type="application/json", status_code=status)


# ── Public routes ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    stats = vector_store.get_collection_stats()
    return _json({
        "status":           "healthy",
        "version":          "5.0.0",
        "collection_size":  stats["total_chunks"],
        "policies_indexed": stats["unique_policies"],
        "llm_mode":         "groq" if rag_service.use_llm else "keyword_fallback",
        "auth":             "jwt",
    })

@app.get("/readyz")
def readyz():
    return _json({"ready": True, "chunks": vector_store.doc_count})

@app.get("/livez")
def livez():
    return _json({"alive": True})

@app.get("/")
def root():
    return health()


# ── Protected routes ──────────────────────────────────────────────────────────
@app.post("/api/query")
async def query_policy(
    query_request: QueryRequest,
    request:       Request,
    current_user:  dict = Depends(require_user),
):
    ip = request.client.host if request.client else "unknown"
    _check_rate(ip)
    try:
        query_request.user_role = UserRole(current_user["role"])
    except ValueError:
        query_request.user_role = UserRole.JUNIOR_OFFICER

    try:
        t0       = time.perf_counter()
        response = rag_service.process_query(query_request)
        elapsed  = round((time.perf_counter() - t0) * 1000, 1)
        data     = response.model_dump()
        data["response_time_ms"] = elapsed
        _audit("query", {
            "query":      query_request.query[:200],
            "user_id":    current_user["id"],
            "user_email": current_user["email"],
            "role":       current_user["role"],
            "query_type": data.get("query_type"),
            "success":    data.get("success"),
            "confidence": data.get("confidence"),
            "llm_mode":   data.get("llm_mode"),
            "latency_ms": elapsed,
            "ip":         ip,
        })
        return _json(data)
    except HTTPException:
        raise
    except Exception as e:
        print(f"[QUERY ERROR] {e}")
        raise HTTPException(500, str(e))


@app.post("/api/upload")
async def upload_policy(
    file:           UploadFile = File(...),
    policy_id:      str        = Form(None),
    name:           str        = Form(None),
    version:        str        = Form("1.0"),
    effective_date: str        = Form(None),
    required_role:  str        = Form("Junior Officer"),
    risk_level:     str        = Form("Low"),
    current_user:   dict       = Depends(require_user),
):
    if current_user["role"] not in {"Credit Manager", "Risk Officer", "Senior Management"}:
        raise HTTPException(403, "Upload requires Credit Manager role or above.")
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted.")
    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(413, f"File too large. Max 50 MB.")
    if not policy_id:
        policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
    else:
        policy_id = policy_id.strip()
        if not POLICY_ID_RE.match(policy_id):
            raise HTTPException(400, "policy_id: alphanumeric/dash/underscore, max 64 chars.")
    if not name:
        name = (file.filename or "policy").removesuffix(".pdf").removesuffix(".PDF")\
                   .replace("_", " ").title()
    if not effective_date:
        effective_date = date.today().isoformat()

    file_path = UPLOAD_DIR / f"{policy_id}.pdf"
    with open(file_path, "wb") as buf:
        buf.write(content)

    file_hash    = _file_hash(str(file_path))
    existing_pid = vector_store.find_indexed_file(str(file_path))
    if existing_pid:
        _audit("upload_duplicate", {"policy_id": existing_pid, "uploader": current_user["email"]})
        return _json({
            "success": True, "message": f"Already indexed as '{existing_pid}'.",
            "policy_id": existing_pid,
            "chunks_created": vector_store.registry[existing_pid]["chunk_count"],
            "already_indexed": True,
        })

    meta   = {"policy_id": policy_id, "policy_name": name, "version": version,
              "effective_date": effective_date, "required_role": required_role, "risk_level": risk_level}
    chunks = doc_processor.chunk_document(str(file_path), meta)
    n      = vector_store.add_chunks(chunks, file_hash=file_hash)

    _audit("upload_success", {"policy_id": policy_id, "chunks": n, "uploader": current_user["email"]})
    return _json({"success": True, "message": "Policy uploaded and indexed.",
                  "policy_id": policy_id, "chunks_created": n, "already_indexed": False})


@app.get("/api/policies")
def list_policies(current_user: dict = Depends(require_user)):
    stats = vector_store.get_collection_stats()
    return _json({"total_chunks": stats["total_chunks"],
                  "unique_policies": stats["unique_policies"],
                  "cache_dir": stats["cache_dir"],
                  "policies": stats["policies"]})


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str, current_user: dict = Depends(require_user)):
    if current_user["role"] not in {"Risk Officer", "Senior Management"}:
        raise HTTPException(403, "Delete requires Risk Officer role or above.")
    if not POLICY_ID_RE.match(policy_id):
        raise HTTPException(400, "Invalid policy_id format.")
    if not vector_store.is_policy_indexed(policy_id):
        raise HTTPException(404, f"Policy '{policy_id}' not found.")
    removed = vector_store.clear_policy(policy_id)
    _audit("delete_policy", {"policy_id": policy_id, "deleted_by": current_user["email"]})
    return _json({"success": True, "message": f"Removed {removed} chunks.", "chunks_removed": removed})


@app.get("/api/stats")
def get_stats(current_user: dict = Depends(require_user)):
    return _json(vector_store.get_collection_stats())


@app.get("/api/audit")
def get_audit(limit: int = 100, current_user: dict = Depends(require_user)):
    if current_user["role"] not in {"Risk Officer", "Senior Management"}:
        raise HTTPException(403, "Audit log requires Risk Officer role or above.")
    entries = []
    if AUDIT_FILE.exists():
        lines = AUDIT_FILE.read_text("utf-8").strip().splitlines()
        for line in lines[-limit:]:
            try:
                entries.append(json.loads(line))
            except Exception:
                pass
    return _json({"count": len(entries), "entries": list(reversed(entries))})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=False)