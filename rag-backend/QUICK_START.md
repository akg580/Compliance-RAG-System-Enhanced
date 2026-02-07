# RAG Backend – Quick Start Guide

Step-by-step setup to run the RAG backend and connect the frontend.

---

## 1. Prerequisites

- **Python 3.10+** – [python.org/downloads](https://www.python.org/downloads/) or Microsoft Store. During install, check **"Add Python to PATH"**.
- **Node.js 18+** (for the React frontend)

**If `pip` is not recognized:** use `python -m pip` instead of `pip` (e.g. `python -m pip install -r requirements.txt`). On Windows you can also try `py -m pip install -r requirements.txt`.

---

## 2. Backend setup

### 2.1 Create and activate virtual environment

**Windows (PowerShell or Command Prompt):**

```bash
cd rag-backend
python -m venv .venv
.venv\Scripts\activate
```

**Linux / macOS:**

```bash
cd rag-backend
python3 -m venv .venv
source .venv/bin/activate
```

### 2.2 Install dependencies

```bash
# Use python -m pip if "pip" is not recognized (common on Windows)
python -m pip install -r requirements.txt
```

First run may take a few minutes (downloads the embedding model).

### 2.3 Environment configuration

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Edit `.env` if needed:

- `PORT=8000` – API port
- `CHROMA_PERSIST_DIR=./chroma_data` – where ChromaDB stores data
- `CORS_ORIGINS=http://localhost:5173` – allow your Vite dev server

### 2.4 Start the API server

```bash
python -m python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:

- API: http://localhost:8000  
- Swagger UI: http://localhost:8000/docs  

---

## 3. Ingest policy documents (optional)

With the server running:

1. Open http://localhost:8000/docs  
2. Use **POST /api/ingest**  
3. Choose a PDF file and execute  

Or with curl:

```bash
curl -X POST http://localhost:8000/api/ingest -F "file=@path/to/your/policy.pdf"
```

If the store is empty, **POST /api/query** will return `no_policy` until you ingest at least one document.

---

## 4. Frontend setup (React + Vite)

### 4.1 Point frontend to the backend

In the **project root** (where the Vite app lives), create or edit `.env`:

```env
VITE_API_URL=http://localhost:8000
```

### 4.2 Use the backend API in the app

**Option A – Use the provided API module**

1. Copy `rag-backend/frontend_integration/api.js` to `src/services/ragApi.js` (or keep path and adjust imports).
2. In your search handler, replace the local `processQuery` call with:

```javascript
import { queryPolicy } from './services/ragApi';

// Inside your search handler:
const result = await queryPolicy(query, userRole);
setResponse(result);
```

**Option B – Use the updated App**

1. Copy `rag-backend/frontend_integration/App_Updated.jsx` to `src/App.jsx` (back up your current `App.jsx` first), or  
2. Merge the `searchPolicy` logic from `App_Updated.jsx` into your existing `App.jsx` so it calls `queryPolicy(query, userRole)` and sets the same response state.

### 4.3 Start the frontend

From the **project root** (not `rag-backend`):

```bash
npm run dev
```

Open http://localhost:5173 and run a policy query. The app will call the RAG backend at http://localhost:8000.

---

## 5. Verify

1. **Backend health:**  
   http://localhost:8000/health → `{"status":"ok","service":"rag-policy-api"}`

2. **Query from terminal:**

   ```bash
   curl -X POST http://localhost:8000/api/query \
     -H "Content-Type: application/json" \
     -d "{\"query\": \"What is the LTV for commercial real estate?\", \"user_role\": \"Senior Loan Officer\"}"
   ```

   You should get JSON with `type` equal to `success`, `rbac_denial`, or `no_policy`.

3. **Frontend:**  
   Enter a question and click “Search Policies”. If the backend is running and CORS is set correctly, you should see the RAG response (or “Backend unavailable” if the server is down).

---

## 6. Run tests

From the `rag-backend` directory with the virtualenv activated:

```bash
pytest test_backend.py -v
```

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| CORS errors in browser | Ensure `CORS_ORIGINS` in `.env` includes your frontend URL (e.g. `http://localhost:5173`). |
| “No definitive policy found” for every query | Ingest at least one PDF via **POST /api/ingest** or add seed data to the vector store. |
| Slow first request | The embedding model loads on first use; subsequent requests are faster. |
| `ModuleNotFoundError` when running `main.py` | Run commands from the `rag-backend` directory and use `uvicorn main:app` so that `config`, `models`, and `services` resolve correctly. |

For more detail, see **README.md** in `rag-backend`.
