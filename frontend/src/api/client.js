// In dev, Vite proxies /api to the local backend (see vite.config.js).
// In production, set VITE_API_URL to your deployed backend's URL, e.g.
// https://sls-erp-api.onrender.com/api — leave unset if the frontend is
// served from the same origin as the backend.
const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, isBlob = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // A 401 only means "your session expired" if we actually sent a token.
  // A 401 with no token (e.g. wrong password on the login form itself)
  // is just a normal failed request — let it fall through below so the
  // real backend message ("Invalid credentials") reaches the user
  // instead of being replaced with a generic "Unauthorized".
  if (res.status === 401 && token) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Your session expired — please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  if (isBlob) return res.blob();
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  getBlob: (path) => request(path, { isBlob: true }),
};

export function pdfUrl(path) {
  // Used for opening the PDF directly in a new tab with the auth token
  // appended isn't possible for GET links, so pages fetch the blob instead.
  return `${BASE}${path}`;
}
