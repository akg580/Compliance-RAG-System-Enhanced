"""
FastAPI server - complete REST API for the RAG policy backend.
"""
import shutil
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime

from models import (
    QueryRequest, QueryResponse, DocumentUploadResponse, 
    HealthCheck, UserRole, RiskLevel
)
from services import VectorStore, DocumentProcessor, RAGService
from config import settings

# Initialize FastAPI
app = FastAPI(
    title="RAG Policy API",
    description="Compliance-first RAG backend for loan policy retrieval",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
print("Initializing services...")
vector_store = VectorStore()
doc_processor = DocumentProcessor()
rag_service = RAGService(vector_store)
print("Services initialized successfully!")

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/", response_model=HealthCheck)
def root():
    return HealthCheck(status="healthy", version="1.0.0")

@app.get("/health", response_model=HealthCheck)
def health():
    return HealthCheck(status="healthy", version="1.0.0")

@app.post("/api/query", response_model=QueryResponse)
async def query_policy(query_request: QueryRequest):
    """Query policy documents using RAG"""
    try:
        response = rag_service.process_query(query_request)
        return response
    except Exception as e:
        print(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload", response_model=DocumentUploadResponse)
async def upload_policy_document(
    file: UploadFile = File(...),
    policy_id: str = Form(None),
    name: str = Form(None),
    version: str = Form("1.0"),
    effective_date: str = Form(None),
    required_role: str = Form("Junior Officer"),
    risk_level: str = Form("Low")
):
    """Upload and process a policy PDF document"""
    try:
        print(f"\n{'='*60}")
        print(f"Uploading: {file.filename}")
        print(f"{'='*60}")
        
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files supported")
        
        if not policy_id:
            policy_id = f"POL-{uuid.uuid4().hex[:8].upper()}"
        
        if not name:
            name = file.filename.replace('.pdf', '').replace('_', ' ').title()
        
        if not effective_date:
            effective_date = datetime.now().strftime("%Y-%m-%d")
        
        # Save file
        file_path = UPLOAD_DIR / f"{policy_id}.pdf"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"File saved: {file_path}")
        
        # Metadata
        policy_metadata = {
            "policy_id": policy_id,
            "policy_name": name,
            "version": version,
            "effective_date": effective_date,
            "required_role": required_role,
            "risk_level": risk_level,
        }
        
        # Process
        chunks = doc_processor.chunk_document(str(file_path), policy_metadata)
        print(f"Created {len(chunks)} chunks")
        
        # Add to vector store
        num_chunks = vector_store.add_chunks(chunks)
        print(f"Added {num_chunks} chunks to vector store")
        
        return DocumentUploadResponse(
            success=True,
            message="Policy uploaded successfully",
            policy_id=policy_id,
            chunks_created=num_chunks
        )
    
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stats")
def get_stats():
    """Get system statistics"""
    stats = vector_store.get_collection_stats()
    return {"vector_store": stats}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)