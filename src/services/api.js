/**
 * API service layer — ComplianceAI  v2 (JWT Auth)
 * =================================================
 * All backend calls live here. Two layers:
 *   _request()  — raw fetch wrapper with error parsing
 *   _authReq()  — adds Authorization: Bearer <token> header
 *
 * Token storage:
 *   access_token  → sessionStorage  (cleared on tab close)
 *   refresh_token → localStorage    (persists across sessions)
 *
 * Auto-refresh: if a request gets 401, we try to refresh once and retry.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Token helpers ─────────────────────────────────────────────────────────────
export const auth = {
  setTokens(access, refresh) {
    sessionStorage.setItem('cai_access',  access);
    localStorage.setItem('cai_refresh', refresh);
  },
  getAccess()  { return sessionStorage.getItem('cai_access');  },
  getRefresh() { return localStorage.getItem('cai_refresh'); },
  setUser(user){ localStorage.setItem('cai_user', JSON.stringify(user)); },
  getUser()    {
    try { return JSON.parse(localStorage.getItem('cai_user')); }
    catch { return null; }
  },
  clear() {
    sessionStorage.removeItem('cai_access');
    localStorage.removeItem('cai_refresh');
    localStorage.removeItem('cai_user');
  },
  isLoggedIn() { return !!auth.getAccess() || !!auth.getRefresh(); },
};

// ── Error extraction ──────────────────────────────────────────────────────────
function _extractError(data, httpStatus) {
  if (!data) return `HTTP ${httpStatus}`;
  if (Array.isArray(data.detail))
    return data.detail.map(e => e.msg || JSON.stringify(e)).join('; ');
  if (typeof data.detail  === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  return `HTTP ${httpStatus}`;
}

// ── Raw fetch ─────────────────────────────────────────────────────────────────
async function _request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error(`Cannot reach backend at ${BASE} — is it running?`);
  }
  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch {}
    throw new Error(_extractError(data, res.status));
  }
  if (res.status === 204) return null;   // logout
  return res.json();
}

// ── Authenticated fetch (auto-refresh on 401) ─────────────────────────────────
let _refreshing = null;   // deduplicate concurrent refresh attempts

async function _authReq(url, options = {}) {
  const token = auth.getAccess();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach backend at ${BASE} — is it running?`);
  }

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshToken = auth.getRefresh();
    if (!refreshToken) {
      auth.clear();
      throw new Error('Session expired. Please log in again.');
    }
    // Only one refresh at a time
    if (!_refreshing) {
      _refreshing = _request(`${BASE}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: refreshToken }),
      }).then(data => {
        auth.setTokens(data.access_token, data.refresh_token);
        auth.setUser(data.user);
        _refreshing = null;
        return data.access_token;
      }).catch(err => {
        _refreshing = null;
        auth.clear();
        throw new Error('Session expired. Please log in again.');
      });
    }
    const newToken = await _refreshing;
    // Retry original request with new token
    const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
    res = await fetch(url, { ...options, headers: retryHeaders });
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch {}
      throw new Error(_extractError(data, res.status));
    }
    if (res.status === 204) return null;
    return res.json();
  }

  if (!res.ok) {
    let data = null;
    try { data = await res.json(); } catch {}
    throw new Error(_extractError(data, res.status));
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth endpoints (public) ───────────────────────────────────────────────────
export const signup = (fullName, email, password, role) =>
  _request(`${BASE}/auth/signup`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ full_name: fullName, email, password, role }),
  });

export const login = (email, password) =>
  _request(`${BASE}/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
  });

export const refreshTokens = (refreshToken) =>
  _request(`${BASE}/auth/refresh`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  });

export const logoutApi = (refreshToken) =>
  _request(`${BASE}/auth/logout`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ refresh_token: refreshToken }),
  });

export const getMe = () =>
  _authReq(`${BASE}/auth/me`);

// ── RAG endpoints (protected) ─────────────────────────────────────────────────
export const healthCheck  = () =>
  _request(`${BASE}/health`);

export const getStats     = () =>
  _authReq(`${BASE}/api/stats`);

export const listPolicies = () =>
  _authReq(`${BASE}/api/policies`);

export const deletePolicy = (policyId) =>
  _authReq(`${BASE}/api/policies/${encodeURIComponent(policyId)}`,
           { method: 'DELETE' });

export const queryPolicy  = (query, userRole, userId = null) =>
  _authReq(`${BASE}/api/query`, {
    method: 'POST',
    body:   JSON.stringify({ query, user_role: userRole, user_id: userId }),
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
  // Don't set Content-Type — browser sets multipart boundary automatically
  const token = auth.getAccess();
  return _request(`${BASE}/api/upload`, {
    method:  'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body:    fd,
  });
};

export default {
  auth, signup, login, refreshTokens, logoutApi, getMe,
  healthCheck, getStats, listPolicies, deletePolicy, queryPolicy, uploadPolicy,
};