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

async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
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
  updateWorkorder: (id, data) => put(`/workorders/${id}`, data),
  addPartToWorkorder: (id, data) => post(`/workorders/${id}/parts`, data),
  collaborateurs: () => get('/collaborateurs'),
  createCollaborateur: (data) => post('/collaborateurs', data),
  updateCollaborateur: (id, data) => put(`/collaborateurs/${id}`, data),
  deleteCollaborateur: (id) => del(`/collaborateurs/${id}`),
  // Articles
  articles: () => get('/articles'),
  createArticle: (data) => post('/articles', data),
  updateArticle: (ref, data) => put(`/articles/${ref}`, data),
  deleteArticle: (ref) => del(`/articles/${ref}`),
  articleMovements: (ref) => get(`/articles/${ref}/movements`),
  addArticleMovement: (ref, data) => post(`/articles/${ref}/movement`, data),
  // Matières premières
  matieres: () => get('/matieres'),
  createMatiere: (data) => post('/matieres', data),
  updateMatiere: (ref, data) => put(`/matieres/${ref}`, data),
  deleteMatiere: (ref) => del(`/matieres/${ref}`),
  matiereMovements: (ref) => get(`/matieres/${ref}/movements`),
  addMatiereMovement: (ref, data) => post(`/matieres/${ref}/movement`, data),
  // Productions
  productions: () => get('/productions'),
  createProduction: (data) => post('/productions', data),
  updateProduction: (id, data) => put(`/productions/${id}`, data),
  deleteProduction: (id) => del(`/productions/${id}`),
  createPart: (data) => post('/parts', data),
  updatePart: (ref, data) => put(`/parts/${ref}`, data),
  partMovements: (ref) => get(`/parts/${ref}/movements`),
  movements: () => get('/movements'),
  createMovement: (data) => post('/movements', data),
  movementsMeta: () => get('/movements-meta'),
};
