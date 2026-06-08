// Client API. En dev : proxy Vite. En prod : VITE_API_URL pointe vers le backend Render.
const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Erreur ${res.status} sur ${path}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Erreur ${res.status} sur ${path}`);
  }
  return res.json();
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `Erreur ${res.status} sur ${path}`);
  }
  return res.json();
}

export const api = {
  dashboard: () => get('/dashboard'),
  kpis: () => get('/kpis'),
  machines: () => get('/machines'),
  parts: () => get('/parts'),
  workorders: () => get('/workorders'),
  createWorkorder: (data) => post('/workorders', data),
  createPart: (data) => post('/parts', data),
  updatePart: (ref, data) => put(`/parts/${ref}`, data),
  partMovements: (ref) => get(`/parts/${ref}/movements`),
  movements: () => get('/movements'),
  createMovement: (data) => post('/movements', data),
  movementsMeta: () => get('/movements-meta'),
};
