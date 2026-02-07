/**
 * React API service for the RAG backend.
 * Point VITE_API_URL or REACT_APP_API_URL at http://localhost:8000 in development.
 */

const getBaseUrl = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return 'http://localhost:8000';
};

const API_PREFIX = '/api';

/**
 * Query the RAG backend. Returns the same shape as the current frontend expects:
 * { type: 'success' | 'rbac_denial' | 'no_policy', ... }
 * @param {string} query - Policy question
 * @param {string} userRole - Current user role for RBAC
 * @returns {Promise<object>} Response object
 */
export async function queryPolicy(query, userRole = 'Senior Loan Officer') {
  const base = getBaseUrl();
  const url = `${base}${API_PREFIX}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query.trim(),
      user_role: userRole,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RAG API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Ingest a PDF file into the RAG store.
 * @param {File} file - PDF file
 * @returns {Promise<{ ok: boolean, message: string, chunks: number }>}
 */
export async function ingestPdf(file) {
  const base = getBaseUrl();
  const url = `${base}${API_PREFIX}/ingest`;
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(url, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ingest API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Get policy store stats (chunk count).
 * @returns {Promise<{ chunk_count: number }>}
 */
export async function getPolicyStats() {
  const base = getBaseUrl();
  const url = `${base}${API_PREFIX}/policies`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

/**
 * Health check.
 * @returns {Promise<{ status: string }>}
 */
export async function healthCheck() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}
