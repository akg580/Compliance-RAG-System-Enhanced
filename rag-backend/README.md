# RAG Backend

FastAPI-based RAG (Retrieval-Augmented Generation) backend for the Compliance Policy / Loan Policy Verifier. It provides a complete REST API for document ingestion (PDF → chunks), vector storage (ChromaDB), and semantic query with RBAC-style responses compatible with the React frontend.

## Features

- **REST API**: `/api/query`, `/api/ingest`, `/api/policies`, `/health`
- **Document processing**: PDF → text chunks with metadata (source, page, chunk_index)
- **Vector store**: ChromaDB with configurable persist directory and collection name
- **Embeddings**: sentence-transformers (default: `all-MiniLM-L6-v2`)
- **RAG pipeline**: Query → embed → similarity search → format response (success / rbac_denial / no_policy)
- **Frontend compatibility**: Response shapes match the existing React app (citation, preconditions, exceptions, confidence, riskLevel)

## Project structure

```
rag-backend/
├── main.py                 # FastAPI server (REST API)
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
├── test_backend.py         # Pytest test suite
├── config/
│   └── config.py           # Centralized configuration (pydantic-settings)
├── models/
│   └── models.py           # Pydantic request/response models
├── services/
│   ├── document_processor.py  # PDF → chunks
│   ├── vector_store.py        # ChromaDB integration
│   └── rag_service.py         # RAG pipeline + RBAC
├── frontend_integration/
│   ├── api.js               # React API client (query, ingest, stats)
│   └── App_Updated.jsx       # App component wired to backend API
├── RAG_Backend_Colab.ipynb   # Colab notebook version
├── README.md                 # This file
└── QUICK_START.md            # Step-by-step setup
```

## Quick start

1. **Create virtualenv and install dependencies**

   ```bash
   cd rag-backend
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   # source .venv/bin/activate   # Linux/macOS
   python -m pip install -r requirements.txt
   ```

2. **Configure environment**

   ```bash
   copy .env.example .env
   # Edit .env if needed (HOST, PORT, CHROMA_PERSIST_DIR, CORS_ORIGINS)
   ```

3. **Run the server**

   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   API docs: http://localhost:8000/docs

4. **Ingest a PDF (optional)**

   ```bash
   curl -X POST http://localhost:8000/api/ingest -F "file=@/path/to/policy.pdf"
   ```

5. **Query**

   ```bash
   curl -X POST http://localhost:8000/api/query \
     -H "Content-Type: application/json" \
     -d "{\"query\": \"What is the LTV for commercial real estate?\", \"user_role\": \"Senior Loan Officer\"}"
   ```

## Frontend integration

- Copy `frontend_integration/api.js` into your React app (e.g. `src/services/api.js`).
- Set `VITE_API_URL=http://localhost:8000` in your frontend `.env`.
- Use `queryPolicy(query, userRole)` in place of the local `processQuery`; response shape is unchanged (success / rbac_denial / no_policy).
- Optionally replace your `App.jsx` with the logic in `frontend_integration/App_Updated.jsx` (or merge the `searchPolicy` callback that calls `queryPolicy`).

## Tests

From the `rag-backend` directory:

```bash
pytest test_backend.py -v
```

## Colab

Open `RAG_Backend_Colab.ipynb` in Google Colab. Run cells to install dependencies, create the vector store, optionally ingest a PDF, and run RAG queries.

## License

MIT
