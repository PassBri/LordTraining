export const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

export const token = () => localStorage.getItem('train_token');

export const api = async (path, { method = 'GET', body, raw } = {}) => {
  const res = await fetch(`${API_URL}/api/recruiting${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token()}`, ...(body && !raw ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (raw ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || res.statusText); }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
};

export const photoUrl = (p) => p ? `${API_URL}/api/recruiting/files/${p}?auth=${token()}` : null;
export const scoreColor = (s) => s == null ? '#94a3b8' : s >= 80 ? '#10b981' : s >= 65 ? '#f59e0b' : '#ef4444';
export const verdictColor = (v) => v === 'RECRUIT' ? '#10b981' : v === 'MONITOR' ? '#f59e0b' : v === 'PASS' ? '#ef4444' : '#64748b';
