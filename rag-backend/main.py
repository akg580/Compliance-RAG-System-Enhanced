import shutil
import time
import uuid
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    QueryRequest, QueryResponse, DocumentUploadResponse,
    HealthCheck, UserRole, RiskLevel,
)
from services import VectorStore, DocumentProcessor, RAGService
from app_config import settings

app = FastAPI(
    title="ComplianceAI RAG API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time"] = f"{round((time.perf_counter()-start)*1000,2)}ms"
    return response

print("Initialising services...")
vector_store  = VectorStore()
doc_processor = DocumentProcessor()
rag_service   = RAGService(vector_store)
print("Services ready.")

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/", response_model=HealthCheck, tags=["System"])
@app.get("/health", response_model=HealthCheck, tags=["System"])
def health():
    return HealthCheck(status="healthy", version="2.0.0")

@app.post("/api/query", tags=["RAG"])
async def query_policy(query_request: QueryRequest):
    start = time.perf_counter()
    try:
        response = rag_service.process_query(query_request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    data = response.model_dump()
    data["response_time_ms"] = round((time.perf_counter()-start)*1000, 2)
    return JSONResponse(content=data)

@app.post("/api/upload", response_model=DocumentUploadResponse, tags=["Documents"])
async def upload_policy_document(
    file:           UploadFile = File(...),
    policy_id:      str = Form(None),
    name:           str = Form(None),
    version:        str = Form("1.0"),
    effective_date: str = Form(None),
    required_role:  str = Form("Junior Officer"),
    risk_level:     str = Form("Low"),
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    if not policy_id:
        policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
    if not name:
        name = file.filename.replace(".pdf", "").replace("_", " ").title()
    if not effective_date:
        effective_date = datetime.now().strftime("%Y-%m-%d")
    file_path = UPLOAD_DIR / f"{policy_id}.pdf"
    with open(file_path, "wb") as buf:
        shutil.copyfileobj(file.file, buf)
    policy_metadata = {
        "policy_id": policy_id, "policy_name": name,
        "version": version, "effective_date": effective_date,
        "required_role": required_role, "risk_level": risk_level,
    }
    chunks     = doc_processor.chunk_document(str(file_path), policy_metadata)
    num_chunks = vector_store.add_chunks(chunks)
    return DocumentUploadResponse(
        success=True,
        message="Policy uploaded and indexed successfully.",
        policy_id=policy_id,
        chunks_created=num_chunks,
    )

@app.get("/api/stats", tags=["System"])
def get_stats():
    return {"vector_store": vector_store.get_collection_stats()}
