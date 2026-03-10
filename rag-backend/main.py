"""
FastAPI server — RAG Policy Backend
------------------------------------
Key improvements over original:
  1. Auto-reindex: on startup, scans uploads/ and indexes any PDF
     not already in the persistent cache — so data survives restarts.
  2. Deduplication: upload endpoint checks SHA-256 fingerprint before
     processing; returns 200 with already_indexed=True if duplicate.
  3. Robust error handling: all exceptions caught and returned as
     clean JSON with helpful messages.
  4. New endpoints:
       GET  /api/policies          – list all indexed policies
       DELETE /api/policies/{id}   – remove a policy from the index
  5. Response timing added to every query response.
  6. No datetime in JSON responses (was causing serialization errors).
"""

import json
import shutil
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from models import (
    DocumentUploadResponse, HealthCheck,
    PolicyInfo, QueryRequest, QueryResponse,
)
from services import DocumentProcessor, RAGService, VectorStore
from app_config import settings


# ── app setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ComplianceAI RAG API",
    description="Persistent RAG backend for loan policy compliance",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# ── service initialisation ───────────────────────────────────────────────────

print("=" * 60)
print("ComplianceAI RAG Backend starting…")
print("=" * 60)

vector_store   = VectorStore()
doc_processor  = DocumentProcessor()
rag_service    = RAGService(vector_store)


def _auto_reindex() -> None:
    """
    On startup, scan uploads/ for any PDF whose policy_id is NOT yet
    in the persistent cache and index it automatically.
    This recovers from situations where the server was killed mid-upload
    or where the cache was accidentally deleted.
    """
    pdfs = list(UPLOAD_DIR.glob("*.pdf"))
    if not pdfs:
        print("No PDFs in uploads/ — nothing to reindex.")
        return

    reindexed = 0
    for pdf_path in pdfs:
        # policy_id = filename stem (e.g. "POL-ABC123")
        pid = pdf_path.stem

        if vector_store.is_policy_indexed(pid):
            continue            # already in cache

        # Infer metadata (best-effort from registry or filename)
        print(f"  Auto-reindexing: {pdf_path.name}")
        meta = {
            "policy_id":     pid,
            "policy_name":   pid.replace("-", " ").replace("_", " ").title(),
            "version":       "1.0",
            "effective_date": "",
            "required_role": "Junior Officer",
            "risk_level":    "Low",
        }
        try:
            fh     = _hash_file(str(pdf_path))
            chunks = doc_processor.chunk_document(str(pdf_path), meta)
            if chunks:
                vector_store.add_chunks(chunks, file_hash=fh)
                reindexed += 1
        except Exception as e:
            print(f"  Auto-reindex failed for {pdf_path.name}: {e}")

    if reindexed:
        print(f"Auto-reindexed {reindexed} PDF(s).")
    else:
        print("All existing PDFs already in cache — no reindexing needed.")


def _hash_file(path: str) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as f:
        h.update(f.read(65536))
    return h.hexdigest()


_auto_reindex()
print("=" * 60)
print(f"Ready — {vector_store.doc_count} chunks across "
      f"{len(vector_store.registry)} policies.")
print("=" * 60)


# ── helpers ──────────────────────────────────────────────────────────────────

def _json_response(data: dict, status_code: int = 200) -> Response:
    """Serialize dict to JSON safely, handling any non-serializable types."""
    def _default(obj):
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        return str(obj)
    return Response(
        content=json.dumps(data, default=_default),
        media_type="application/json",
        status_code=status_code,
    )


# ── routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    stats = vector_store.get_collection_stats()
    return _json_response({
        "status":           "healthy",
        "version":          "2.0.0",
        "collection_size":  stats["total_chunks"],
        "policies_indexed": stats["unique_policies"],
        "services": {
            "vector_store": "ok",
            "llm":          "groq" if rag_service.use_llm else "keyword_fallback",
        },
    })


@app.get("/")
def root():
    return health()


@app.post("/api/query")
async def query_policy(query_request: QueryRequest):
    try:
        t0       = time.perf_counter()
        response = rag_service.process_query(query_request)
        elapsed  = round((time.perf_counter() - t0) * 1000, 1)
        data     = response.model_dump()
        data["response_time_ms"] = elapsed
        return _json_response(data)
    except Exception as e:
        print(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_policy_document(
    file:          UploadFile = File(...),
    policy_id:     str        = Form(None),
    name:          str        = Form(None),
    version:       str        = Form("1.0"),
    effective_date: str       = Form(None),
    required_role: str        = Form("Junior Officer"),
    risk_level:    str        = Form("Low"),
):
    try:
        # ── validate ────────────────────────────────────────────────────
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        if not policy_id:
            policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
        if not name:
            name = (
                file.filename.replace(".pdf", "")
                             .replace(".PDF", "")
                             .replace("_", " ")
                             .title()
            )
        if not effective_date:
            from datetime import date
            effective_date = date.today().isoformat()

        # ── save to disk ─────────────────────────────────────────────────
        file_path = UPLOAD_DIR / f"{policy_id}.pdf"
        with open(file_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)

        file_hash = _hash_file(str(file_path))

        # ── deduplication check ──────────────────────────────────────────
        existing_pid = vector_store.find_indexed_file(str(file_path))
        if existing_pid:
            return _json_response({
                "success":         True,
                "message":         (
                    f"This document is already indexed as '{existing_pid}'. "
                    "No re-processing needed."
                ),
                "policy_id":       existing_pid,
                "chunks_created":  vector_store.registry[existing_pid]["chunk_count"],
                "already_indexed": True,
            })

        # ── chunk + index ────────────────────────────────────────────────
        policy_meta = {
            "policy_id":     policy_id,
            "policy_name":   name,
            "version":       version,
            "effective_date": effective_date,
            "required_role": required_role,
            "risk_level":    risk_level,
        }

        chunks     = doc_processor.chunk_document(str(file_path), policy_meta)
        num_chunks = vector_store.add_chunks(chunks, file_hash=file_hash)

        return _json_response({
            "success":         True,
            "message":         "Policy uploaded and indexed successfully.",
            "policy_id":       policy_id,
            "chunks_created":  num_chunks,
            "already_indexed": False,
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/policies")
def list_policies():
    """List all indexed policies with their metadata."""
    stats = vector_store.get_collection_stats()
    return _json_response({
        "total_chunks":    stats["total_chunks"],
        "unique_policies": stats["unique_policies"],
        "cache_dir":       stats["cache_dir"],
        "policies":        stats["policies"],
    })


@app.delete("/api/policies/{policy_id}")
def delete_policy(policy_id: str):
    """Remove a policy and all its chunks from the index."""
    if not vector_store.is_policy_indexed(policy_id):
        raise HTTPException(status_code=404, detail=f"Policy '{policy_id}' not found.")
    removed = vector_store.clear_policy(policy_id)
    return _json_response({
        "success":        True,
        "message":        f"Removed {removed} chunks for policy '{policy_id}'.",
        "chunks_removed": removed,
    })


@app.get("/api/stats")
def get_stats():
    return _json_response(vector_store.get_collection_stats())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=False)
