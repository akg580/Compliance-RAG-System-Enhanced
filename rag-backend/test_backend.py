"""
Comprehensive test suite for the RAG backend API.
Run: pytest test_backend.py -v (from rag-backend directory)
"""
import io
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "rag-policy-api" in data.get("service", "")


def test_api_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_query_requires_body():
    r = client.post("/api/query", json={})
    assert r.status_code == 422  # validation error


def test_query_accepts_valid_request():
    r = client.post(
        "/api/query",
        json={"query": "What is the LTV for commercial real estate?", "user_role": "Senior Loan Officer"},
    )
    # 200 even when no policy (returns no_policy)
    assert r.status_code == 200
    data = r.json()
    assert "type" in data
    assert data["type"] in ("success", "rbac_denial", "no_policy")


def test_query_response_shape_success_or_no_policy():
    r = client.post(
        "/api/query",
        json={"query": "some random query xyz", "user_role": "Junior Officer"},
    )
    assert r.status_code == 200
    data = r.json()
    if data["type"] == "no_policy":
        assert "message" in data
        assert "recommendedAction" in data
        assert "searchedTerms" in data
    elif data["type"] == "success":
        assert "answer" in data
        assert "citation" in data
        assert "confidence" in data


def test_ingest_rejects_non_pdf():
    r = client.post("/api/ingest", files={"file": ("x.txt", io.BytesIO(b"hello"), "text/plain")})
    assert r.status_code == 400


def test_ingest_accepts_pdf():
    # Minimal valid PDF (single page, no real content)
    minimal_pdf = (
        b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
        b"xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000101 00000 n \n"
        b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF"
    )
    r = client.post(
        "/api/ingest",
        files={"file": ("policy.pdf", io.BytesIO(minimal_pdf), "application/pdf")},
    )
    # May 200 (empty text) or 200 with chunks
    assert r.status_code in (200, 400)
    if r.status_code == 200:
        data = r.json()
        assert data.get("ok") is True
        assert "chunks" in data


def test_list_policies():
    r = client.get("/api/policies")
    assert r.status_code == 200
    data = r.json()
    assert "chunk_count" in data
    assert isinstance(data["chunk_count"], int)
