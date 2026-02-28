// src/services/api.js
// Thin, typed wrapper around the FastAPI backend.
// All network calls live here — components never use `fetch` directly.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Internal helper ──────────────────────────────────────────────────────────

/**
 * Generic fetch wrapper with error normalisation.
 * @template T
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new Error(detail);
  }

  return response.json();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Ping the backend health endpoint.
 * @returns {Promise<{ status: string; version: string }>}
 */
export async function healthCheck() {
  return request('/health');
}

/**
 * Query the policy RAG pipeline.
 *
 * @param {string} query
 * @param {string} userRole
 * @param {string|null} [userId]
 * @returns {Promise<import('../types').QueryResponse>}
 */
export async function queryPolicy(query, userRole, userId = null) {
  return request('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, user_role: userRole, user_id: userId }),
  });
}

/**
 * Upload a PDF policy document with metadata.
 *
 * @param {File} file
 * @param {{ policy_id?: string; name?: string; version?: string; effective_date?: string; required_role?: string; risk_level?: string }} [metadata]
 * @returns {Promise<import('../types').UploadResponse>}
 */
export async function uploadPolicy(file, metadata = {}) {
  const formData = new FormData();
  formData.append('file', file);

  const fields = ['policy_id', 'name', 'version', 'effective_date', 'required_role', 'risk_level'];
  fields.forEach((key) => {
    if (metadata[key] !== undefined && metadata[key] !== '') {
      formData.append(key, metadata[key]);
    }
  });

  return request('/api/upload', { method: 'POST', body: formData });
}

/**
 * Retrieve system statistics from the vector store.
 * @returns {Promise<{ vector_store: { total_chunks: number; unique_policies: number } }>}
 */
export async function getStats() {
  return request('/api/stats');
}
