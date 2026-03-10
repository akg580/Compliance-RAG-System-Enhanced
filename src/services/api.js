/**
 * API service layer — all backend calls live here, nowhere else.
 *
 * Error handling: FastAPI 422 returns { detail: [{loc,msg,type},...] }
 * We extract a readable string from whatever shape comes back.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function _extractError(data, httpStatus) {
  if (!data) return `HTTP ${httpStatus}`;
  // Pydantic 422 — detail is an array
  if (Array.isArray(data.detail)) {
    return data.detail.map(e => e.msg || JSON.stringify(e)).join('; ');
  }
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  return `HTTP ${httpStatus}`;
}

async function _request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (networkErr) {
    throw new Error(`Cannot reach backend at ${BASE} — is it running on port 8000?`);
  }
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch {}
    throw new Error(_extractError(data, res.status));
  }
  return res.json();
}

export const healthCheck  = ()           => _request(`${BASE}/health`);
export const getStats     = ()           => _request(`${BASE}/api/stats`);
export const listPolicies = ()           => _request(`${BASE}/api/policies`);

export const deletePolicy = (policyId)  =>
  _request(`${BASE}/api/policies/${encodeURIComponent(policyId)}`, { method: 'DELETE' });

export const queryPolicy  = (query, userRole, userId = null) =>
  _request(`${BASE}/api/query`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query, user_role: userRole, user_id: userId }),
  });

export const uploadPolicy = (file, meta = {}) => {
  const fd = new FormData();
  fd.append('file', file);
  if (meta.policy_id)      fd.append('policy_id',      meta.policy_id);
  if (meta.name)           fd.append('name',            meta.name);
  if (meta.version)        fd.append('version',         meta.version);
  if (meta.effective_date) fd.append('effective_date',  meta.effective_date);
  if (meta.required_role)  fd.append('required_role',   meta.required_role);
  if (meta.risk_level)     fd.append('risk_level',      meta.risk_level);
  return _request(`${BASE}/api/upload`, { method: 'POST', body: fd });
};

export default { healthCheck, getStats, listPolicies, deletePolicy, queryPolicy, uploadPolicy };