// Minimal API helper for frontend pages
// Usage: import this file via a <script src="api-client.js"></script>
// Requires user to be signed in with Firebase Auth

async function getIdToken() {
  try {
    const auth = window.auth || (window.Auth && window.Auth.firebaseAuth && window.Auth.firebaseAuth());
    if (auth && auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
  } catch (_) {}
  return null;
}

async function apiFetch(path, options = {}) {
  const token = await getIdToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const base = window.API_BASE_URL || 'http://localhost:4000';
  const res = await fetch(base + path, Object.assign({}, options, { headers }));
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

window.API = {
  baseUrl: () => window.API_BASE_URL || 'http://localhost:4000',
  setBaseUrl: (url) => (window.API_BASE_URL = url),
  fetch: apiFetch,
  me: () => apiFetch('/api/me'),
  plans: () => apiFetch('/api/plans'),
  submitKyc: (payload) => apiFetch('/api/kyc/submit', { method: 'POST', body: JSON.stringify(payload) })
};
