import os
import sys
from pathlib import Path

RAG_BACKEND_DIR = Path(__file__).resolve().parent
os.environ["PYTHONPATH"] = str(RAG_BACKEND_DIR)
sys.path.insert(0, str(RAG_BACKEND_DIR))
os.chdir(RAG_BACKEND_DIR)

print(f"[run.py] dir = {RAG_BACKEND_DIR}")

print("[run.py] Testing imports...")
try:
    from app_config import settings
    print(f"  OK app_config — port={settings.port}")
except Exception as e:
    print(f"  FAILED app_config: {e}"); sys.exit(1)

try:
    from models import QueryRequest
    print("  OK models")
except Exception as e:
    print(f"  FAILED models: {e}"); sys.exit(1)

try:
    from services import VectorStore
    print("  OK services")
except Exception as e:
    print(f"  FAILED services: {e}"); sys.exit(1)

print("[run.py] All imports OK. Starting uvicorn...\n")

import uvicorn
uvicorn.run(
    "main:app",
    host="0.0.0.0",
    port=8000,
    reload=True,
    reload_dirs=[str(RAG_BACKEND_DIR)],
)
