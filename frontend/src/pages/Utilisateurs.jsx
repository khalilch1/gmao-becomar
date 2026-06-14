import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Users, Shield, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading, useFetch } from '../components/Common.jsx';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const tok = () => localStorage.getItem('gmao_token');
const authFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) } });

const MODULES = [
  { key: 'dashboard',      label: 'Tableau de bord' },
  { key: 'workorders',     label: 'Ordres de travail' },
  { key: 'machines',       label: 'Machines & Coûts' },
  { key: 'parts',          label: 'Pièces de rechange' },
  { key: 'movements',      label: 'Mouvements de stock' },
  { key: 'analytics',      label: 'KPI & Performance' },
  { key: 'timetracking',   label: 'Pointage RH' },
  { key: 'production',     label: 'Production & TRS' },
  { key: 'collaborateurs', label: 'Collaborateurs' },
  { key: 'articles',       label: 'Articles (Produits finis)' },
  { key: 'matieres',       label: 'Matières premières' },
  { key: 'users',          label: 'Gestion utilisateurs' },
];

const PERM_COLORS = { none: '#6B7280', read: '#FBBF24', write: '#2DD4BF' };
const PERM_LABELS = { none: 'Aucun', read: 'Lecture', write: 'Écriture' };

function PermBadge({ value }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${PERM_COLORS[value]}22`, color: PERM_COLORS[value], border: `1px solid ${PERM_COLORS[value]}55` }}>
      {PERM_LABELS[value] || value}
    </span>
  );
}

function PermToggle({ value, onChange }) {
  const levels = ['none', 'read', 'write'];
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {levels.map((l) => (
        <button key={l} onClick={() => onChange(l)} style={{
          padding: '3px 10px', borderRadius: 6, border: `1px solid ${value === l ? PERM_COLORS[l] : 'var(--border)'}`,
          background: value === l ? `${PERM_COLORS[l]}22` : 'var(--bg)',
          color: value === l ? PERM_COLORS[l] : 'var(--text-muted)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        }}>{PERM_LABELS[l]}</button>
      ))}
    </div>
  );
}

// ---- GROUPES ----
function GroupeForm({ initial, onSave, onClose }) {
  const defaultPerms = Object.fromEntries(MODULES.map((m) => [m.key, initial?.permissions?.[m.key] || 'none']));
  const [nom, setNom] = useState(initial?.nom || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [perms, setPerms] = useState(defaultPerms);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const setAll = (level) => setPerms(Object.fromEntries(MODULES.map((m) => [m.key, m.key === 'users' && level === 'write' ? 'write' : level])));

  const save = async () => {
    if (!nom.trim()) { setErr('Nom obligatoire'); return; }
    setSaving(true); setErr('');
    try {
      const url = initial ? `${BASE}/groupes/${initial.id}` : `${BASE}/groupes`;
      const res = await authFetch(url, { method: initial ? 'PUT' : 'POST', body: JSON.stringify({ nom, description: desc, permissions: perms }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-title">{initial ? 'Modifier le groupe' : 'Nouveau groupe'}</div>
          <button className="btn" onClick={onClose} style={{ padding: '7px 10px' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '0 22px 22px' }}>
          {err && <div className="banner banner-error" style={{ marginBottom: 14 }}>{err}</div>}
          <div className="row-2" style={{ marginBottom: 14 }}>
            <div className="field"><label>Nom du groupe</label>
              <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Responsable Qualité" /></div>
            <div className="field"><label>Description</label>
              <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description optionnelle" /></div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Permissions par module</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setAll('none')}>Aucun</button>
              <button className="btn" style={{ fontSize: 11, padding: '3px 10px', color: '#FBBF24' }} onClick={() => setAll('read')}>Tout lecture</button>
              <button className="btn" style={{ fontSize: 11, padding: '3px 10px', color: '#2DD4BF' }} onClick={() => setAll('write')}>Tout écriture</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto', marginBottom: 18 }}>
            {MODULES.map((m) => (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.label}</span>
                <PermToggle value={perms[m.key]} onChange={(v) => setPerms((p) => ({ ...p, [m.key]: v }))} />
              </div>
            ))}
          </div>

          <div className="flex gap" style={{ justifyContent: 'flex-end' }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- UTILISATEURS ----
function UserForm({ initial, groupes, onSave, onClose }) {
  const [form, setForm] = useState({ username: initial?.username || '', prenom: initial?.prenom || '', nom: initial?.nom || '', email: initial?.email || '', groupe_id: initial?.groupe_id || groupes[0]?.id || '', password: '', actif: initial?.actif !== false });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async () => {
    if (!form.username.trim()) { setErr("Nom d'utilisateur obligatoire"); return; }
    if (!initial && !form.password.trim()) { setErr('Mot de passe obligatoire'); return; }
    setSaving(true); setErr('');
    try {
      const url = initial ? `${BASE}/users/${initial.id}` : `${BASE}/users`;
      const body = { ...form };
      if (!body.password) delete body.password;
      const res = await authFetch(url, { method: initial ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-title">{initial ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</div>
          <button className="btn" onClick={onClose} style={{ padding: '7px 10px' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '0 22px 22px' }}>
          {err && <div className="banner banner-error" style={{ marginBottom: 14 }}>{err}</div>}
          <div className="row-2">
            <div className="field"><label>Prénom</label><input className="input" value={form.prenom} onChange={set('prenom')} placeholder="Ahmed" /></div>
            <div className="field"><label>Nom</label><input className="input" value={form.nom} onChange={set('nom')} placeholder="Bennani" /></div>
          </div>
          <div className="row-2">
            <div className="field"><label>Identifiant (login)</label><input className="input mono" value={form.username} onChange={set('username')} placeholder="a.bennani" /></div>
            <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="a.bennani@becomar.ma" /></div>
          </div>
          <div className="row-2">
            <div className="field"><label>{initial ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe'}</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="field"><label>Groupe / Rôle</label>
              <select className="select" value={form.groupe_id} onChange={set('groupe_id')}>
                {groupes.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 6 }}>
            <input type="checkbox" checked={form.actif} onChange={set('actif')} style={{ accentColor: 'var(--teal)', width: 15, height: 15 }} />
            <span style={{ color: form.actif ? 'var(--teal)' : 'var(--text-muted)' }}>Compte actif</span>
          </label>
          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- PAGE PRINCIPALE ----
export default function Utilisateurs() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('users');
  const [reload, setReload] = useState(0);

  const { data: usersData, error: usersErr } = useFetch(() => authFetch(`${BASE}/users`).then((r) => r.json()), [reload]);
  const { data: groupesData, error: groupesErr } = useFetch(() => authFetch(`${BASE}/groupes`).then((r) => r.json()), [reload]);
  const refresh = () => setReload((r) => r + 1);

  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState(false);
  const [editGroupe, setEditGroupe] = useState(null);
  const [newGroupe, setNewGroupe] = useState(false);

  const deleteUser = async (u) => {
    if (!confirm(`Supprimer l'utilisateur "${u.username}" ?`)) return;
    await authFetch(`${BASE}/users/${u.id}`, { method: 'DELETE' });
    refresh();
  };
  const deleteGroupe = async (g) => {
    if (!confirm(`Supprimer le groupe "${g.nom}" ?`)) return;
    const res = await authFetch(`${BASE}/groupes/${g.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    refresh();
  };

  if (!usersData || !groupesData) return <Loading />;

  const tabStyle = (t) => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'var(--surface-2)',
    color: tab === t ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  });

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Gérez les <b style={{ color: 'var(--text)' }}>utilisateurs</b> et leurs <b style={{ color: 'var(--text)' }}>droits d'accès</b> par module.
        </p>
        <button className="btn btn-primary" onClick={() => tab === 'users' ? setNewUser(true) : setNewGroupe(true)}>
          <Plus size={17} /> {tab === 'users' ? 'Nouvel utilisateur' : 'Nouveau groupe'}
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Utilisateurs actifs', value: usersData.filter((u) => u.actif).length, color: '#2DD4BF' },
          { label: 'Utilisateurs inactifs', value: usersData.filter((u) => !u.actif).length, color: '#6B7280' },
          { label: 'Groupes configurés', value: groupesData.length, color: '#A78BFA' },
        ].map((k) => (
          <div key={k.label} className="kpi" style={{ minWidth: 160 }}>
            <div className="kpi-glow" style={{ background: k.color }} />
            <div className="kpi-label" style={{ marginTop: 12 }}>{k.label}</div>
            <div className="kpi-value" style={{ color: k.color, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={tabStyle('users')} onClick={() => setTab('users')}><Users size={14} style={{ display: 'inline', marginRight: 6 }} />Utilisateurs ({usersData.length})</button>
        <button style={tabStyle('groupes')} onClick={() => setTab('groupes')}><Shield size={14} style={{ display: 'inline', marginRight: 6 }} />Groupes & Droits ({groupesData.length})</button>
      </div>

      {/* ---- TAB UTILISATEURS ---- */}
      {tab === 'users' && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Identifiant</th><th>Nom complet</th><th>Email</th><th>Groupe</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                {usersData.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-code">{u.username}</td>
                    <td className="cell-strong">{u.prenom} {u.nom}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{u.email || '—'}</td>
                    <td><span className="pill pill-violet">{u.groupe_nom}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: u.actif ? '#2DD4BF' : '#6B7280' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: u.actif ? '#2DD4BF' : '#6B7280', display: 'inline-block' }} />
                        {u.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap" style={{ gap: 5 }}>
                        <button className="btn" style={{ padding: '5px 8px' }} onClick={() => setEditUser(u)} title="Modifier"><Pencil size={13} /></button>
                        {u.id !== me?.id && (
                          <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => deleteUser(u)} title="Supprimer"><Trash2 size={13} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- TAB GROUPES ---- */}
      {tab === 'groupes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupesData.map((g) => (
            <div key={g.id} className="card">
              <div className="card-head">
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Shield size={16} style={{ color: '#A78BFA' }} />{g.nom}
                  </div>
                  {g.description && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{g.description}</div>}
                </div>
                <div className="flex gap" style={{ gap: 5 }}>
                  <button className="btn" style={{ padding: '5px 8px' }} onClick={() => setEditGroupe(g)} title="Modifier"><Pencil size={13} /></button>
                  <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => deleteGroupe(g)} title="Supprimer"><Trash2 size={13} /></button>
                </div>
              </div>
              <div style={{ padding: '0 22px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {MODULES.map((m) => (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                    <PermBadge value={g.permissions[m.key] || 'none'} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {newUser && <UserForm groupes={groupesData} onSave={() => { setNewUser(false); refresh(); }} onClose={() => setNewUser(false)} />}
      {editUser && <UserForm initial={editUser} groupes={groupesData} onSave={() => { setEditUser(null); refresh(); }} onClose={() => setEditUser(null)} />}
      {newGroupe && <GroupeForm onSave={() => { setNewGroupe(false); refresh(); }} onClose={() => setNewGroupe(false)} />}
      {editGroupe && <GroupeForm initial={editGroupe} onSave={() => { setEditGroupe(null); refresh(); }} onClose={() => setEditGroupe(null)} />}
    </div>
  );
}
