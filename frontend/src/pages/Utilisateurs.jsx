import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Users, Shield, Eye, EyeOff, Check, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Loading, useFetch } from '../components/Common.jsx';

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';
const tok = () => localStorage.getItem('gmao_token');
const authFetch = (url, opts = {}) =>
  fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}`, ...(opts.headers || {}) } });

// ---- Définition des modules et actions ----
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

const ACTION_LABELS = {
  view: 'Voir', create: 'Créer', edit: 'Modifier', delete: 'Supprimer',
  add_parts: 'Pièces OT', add_movement: 'Mouvement', view_history: 'Historique',
  manage_categories: 'Catégories', manage_params: 'Paramètres',
  create_user: 'Créer', edit_user: 'Modifier', delete_user: 'Supprimer', manage_groups: 'Groupes',
};

const ACTION_COLORS = {
  view: '#60A5FA', create: '#34D399', edit: '#FBBF24', delete: '#F87171',
  add_parts: '#A78BFA', add_movement: '#2DD4BF', view_history: '#FB923C',
  manage_categories: '#F472B6', manage_params: '#94A3B8',
  create_user: '#34D399', edit_user: '#FBBF24', delete_user: '#F87171', manage_groups: '#A78BFA',
};

// Modules actions définition (doit correspondre au backend)
const MODULES_ACTIONS = {
  dashboard:      ['view'],
  workorders:     ['view', 'create', 'edit', 'delete', 'add_parts'],
  machines:       ['view'],
  parts:          ['view', 'create', 'edit', 'add_movement'],
  movements:      ['view', 'create'],
  analytics:      ['view'],
  timetracking:   ['view', 'create', 'edit'],
  production:     ['view', 'create', 'edit', 'delete'],
  collaborateurs: ['view', 'create', 'edit', 'delete', 'manage_params'],
  articles:       ['view', 'create', 'edit', 'delete', 'add_movement', 'view_history', 'manage_categories'],
  matieres:       ['view', 'create', 'edit', 'delete', 'add_movement', 'view_history', 'manage_categories'],
  users:          ['view', 'create_user', 'edit_user', 'delete_user', 'manage_groups'],
};

// ---- Composant matrice permissions pour groupes ----
function PermMatrix({ permissions, onChange, readOnly = false }) {
  const toggle = (mod, action) => {
    if (readOnly) return;
    const cur = permissions[mod]?.[action] || false;
    onChange({ ...permissions, [mod]: { ...(permissions[mod] || {}), [action]: !cur } });
  };

  const setAllModule = (mod, value) => {
    if (readOnly) return;
    const newMod = Object.fromEntries(MODULES_ACTIONS[mod].map((a) => [a, value]));
    onChange({ ...permissions, [mod]: newMod });
  };

  const setAll = (value) => {
    if (readOnly) return;
    const all = {};
    for (const mod of Object.keys(MODULES_ACTIONS)) {
      all[mod] = Object.fromEntries(MODULES_ACTIONS[mod].map((a) => [a, value]));
    }
    onChange(all);
  };

  return (
    <div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button type="button" className="btn" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setAll(false)}>Tout refuser</button>
          <button type="button" className="btn" style={{ fontSize: 11, padding: '3px 10px', color: '#34D399' }} onClick={() => setAll(true)}>Tout autoriser</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 400, overflowY: 'auto', paddingRight: 2 }}>
        {MODULES.map((m) => {
          const actions = MODULES_ACTIONS[m.key] || [];
          const allTrue = actions.every((a) => permissions[m.key]?.[a]);
          const anyTrue = actions.some((a) => permissions[m.key]?.[a]);
          return (
            <div key={m.key} style={{ background: 'var(--surface-2)', border: `1px solid ${anyTrue ? 'var(--border)' : 'var(--border)'}`, borderRadius: 8 }}>
              {/* Ligne module */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', gap: 8, borderBottom: anyTrue ? '1px solid var(--border)' : 'none' }}>
                {!readOnly && (
                  <button type="button" onClick={() => setAllModule(m.key, !allTrue)} style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer', padding: 0,
                    border: `2px solid ${anyTrue ? '#2DD4BF' : 'var(--border)'}`,
                    background: allTrue ? '#2DD4BF' : anyTrue ? 'rgba(45,212,191,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {allTrue && <Check size={10} color="#fff" strokeWidth={3} />}
                    {anyTrue && !allTrue && <span style={{ width: 8, height: 2, background: '#2DD4BF', borderRadius: 1, display: 'block' }} />}
                  </button>
                )}
                <span style={{ fontSize: 13, fontWeight: 600, color: anyTrue ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>{m.label}</span>
                {!anyTrue && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.04em' }}>Accès refusé</span>}
              </div>
              {/* Actions — toujours visibles pour permettre la sélection individuelle */}
              <div style={{ padding: '6px 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {actions.map((action) => {
                  const val = permissions[m.key]?.[action] === true;
                  const color = ACTION_COLORS[action] || '#94A3B8';
                  return (
                    <button key={action} type="button" onClick={() => !readOnly && toggle(m.key, action)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      cursor: readOnly ? 'default' : 'pointer',
                      padding: '3px 9px', borderRadius: 6, border: 'none', outline: 'none',
                      background: val ? `${color}25` : 'rgba(255,255,255,0.04)',
                      boxShadow: `inset 0 0 0 1px ${val ? color : 'rgba(255,255,255,0.12)'}`,
                      color: val ? color : 'rgba(255,255,255,0.4)',
                      fontSize: 12, fontWeight: 500, lineHeight: '20px',
                      opacity: !val && readOnly ? 0.3 : 1,
                      transition: 'all 0.12s',
                    }}>
                      {!readOnly && (
                        <span style={{
                          width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                          background: val ? color : 'transparent',
                          boxShadow: `inset 0 0 0 1.5px ${val ? color : 'rgba(255,255,255,0.25)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {val && <Check size={8} color="#000" strokeWidth={3} />}
                        </span>
                      )}
                      {val && readOnly && <Check size={10} />}
                      {ACTION_LABELS[action] || action}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Matrice surcharges utilisateur ----
// Affiche les perms effectives en colorant les surcharges
function UserOverrideMatrix({ groupPerms, overrides, onChange }) {
  // Compute effective
  const effective = {};
  for (const mod of Object.keys(MODULES_ACTIONS)) {
    effective[mod] = { ...(groupPerms[mod] || {}), ...(overrides[mod] || {}) };
  }

  const toggle = (mod, action) => {
    const groupVal = groupPerms[mod]?.[action] || false;
    const curEffective = effective[mod]?.[action] || false;
    const newVal = !curEffective;
    const newOverrides = JSON.parse(JSON.stringify(overrides));
    if (newVal !== groupVal) {
      if (!newOverrides[mod]) newOverrides[mod] = {};
      newOverrides[mod][action] = newVal;
    } else {
      if (newOverrides[mod]) {
        delete newOverrides[mod][action];
        if (Object.keys(newOverrides[mod]).length === 0) delete newOverrides[mod];
      }
    }
    onChange(newOverrides);
  };

  const resetAll = () => onChange({});

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Les surcharges (en orange) remplacent les droits du groupe pour cet utilisateur.
        </span>
        {hasOverrides && (
          <button className="btn" style={{ fontSize: 11, padding: '3px 10px', color: '#FB923C', gap: 4 }} onClick={resetAll}>
            <RotateCcw size={11} /> Réinitialiser
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 340, overflowY: 'auto', paddingRight: 2 }}>
        {MODULES.map((m) => {
          const actions = MODULES_ACTIONS[m.key] || [];
          const anyEffective = actions.some((a) => effective[m.key]?.[a]);
          const hasModuleOverride = !!overrides[m.key];
          return (
            <div key={m.key} style={{ background: 'var(--surface-2)', border: `1px solid ${hasModuleOverride ? 'rgba(251,146,60,0.4)' : 'var(--border)'}`, borderRadius: 8 }}>
              <div style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: anyEffective ? 'var(--text)' : 'var(--text-muted)', flex: 1 }}>{m.label}</span>
                {hasModuleOverride && <span style={{ fontSize: 10, color: '#FB923C', fontWeight: 600 }}>surcharge active</span>}
                {!anyEffective && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Accès refusé</span>}
              </div>
              <div style={{ padding: '6px 10px 8px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {actions.map((action) => {
                  const eff = effective[m.key]?.[action] === true;
                  const grpVal = groupPerms[m.key]?.[action] === true;
                  const isOverride = overrides[m.key]?.[action] !== undefined;
                  const color = isOverride ? '#FB923C' : (eff ? ACTION_COLORS[action] || '#94A3B8' : '#4B5563');
                  return (
                    <button key={action} type="button" onClick={() => toggle(m.key, action)}
                      title={isOverride ? `Surcharge (groupe: ${grpVal ? 'autorisé' : 'refusé'})` : 'Hérité du groupe'}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        cursor: 'pointer', padding: '3px 9px', borderRadius: 6, border: 'none', outline: 'none',
                        background: eff ? `${color}25` : 'rgba(255,255,255,0.04)',
                        boxShadow: `inset 0 0 0 1px ${isOverride ? '#FB923C' : (eff ? color : 'rgba(255,255,255,0.1)')}`,
                        color: eff ? color : 'rgba(255,255,255,0.3)',
                        fontSize: 12, fontWeight: 500, lineHeight: '20px',
                        opacity: !eff ? 0.6 : 1,
                        transition: 'all 0.12s',
                      }}>
                      <span style={{
                        width: 12, height: 12, borderRadius: 3, flexShrink: 0,
                        background: eff ? color : 'transparent',
                        boxShadow: `inset 0 0 0 1.5px ${eff ? color : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {eff && <Check size={8} color="#000" strokeWidth={3} />}
                      </span>
                      {ACTION_LABELS[action] || action}
                      {isOverride && <span style={{ fontSize: 9, color: '#FB923C', fontWeight: 700, marginLeft: 1 }}>↑</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- GROUPES ----
function GroupeForm({ initial, onSave, onClose }) {
  const initPerms = initial?.permissions || {};
  const [nom, setNom] = useState(initial?.nom || '');
  const [desc, setDesc] = useState(initial?.description || '');
  const [perms, setPerms] = useState(initPerms);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

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
      <div className="modal" style={{ maxWidth: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        {/* Header fixe */}
        <div style={{ padding: '18px 22px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="card-title"><Shield size={16} style={{ color: '#A78BFA' }} /> {initial ? 'Modifier le groupe' : 'Nouveau groupe'}</div>
            <button className="btn" onClick={onClose} style={{ padding: '7px 10px' }}><X size={16} /></button>
          </div>
          {err && <div className="banner banner-error" style={{ marginTop: 10 }}>{err}</div>}
          <div className="row-2" style={{ marginTop: 14 }}>
            <div className="field"><label>Nom du groupe</label>
              <input className="input" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Responsable Qualité" /></div>
            <div className="field"><label>Description</label>
              <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description optionnelle" /></div>
          </div>
        </div>
        {/* Matrice scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Permissions par module et action
          </div>
          <PermMatrix permissions={perms} onChange={setPerms} />
        </div>
        {/* Footer fixe */}
        <div style={{ padding: '12px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}

// ---- UTILISATEURS ----
function UserForm({ initial, groupes, onSave, onClose }) {
  const selGroupe = groupes.find((g) => g.id === (initial?.groupe_id || groupes[0]?.id));
  const [form, setForm] = useState({
    username: initial?.username || '', prenom: initial?.prenom || '',
    nom: initial?.nom || '', email: initial?.email || '',
    groupe_id: initial?.groupe_id || groupes[0]?.id || '',
    password: '', actif: initial?.actif !== false,
  });
  const [overrides, setOverrides] = useState(initial?.overrides || {});
  const [showPw, setShowPw] = useState(false);
  const [tab, setTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const curGroupe = groupes.find((g) => g.id === form.groupe_id);

  const save = async () => {
    if (!form.username.trim()) { setErr("Nom d'utilisateur obligatoire"); return; }
    if (!initial && !form.password.trim()) { setErr('Mot de passe obligatoire'); return; }
    setSaving(true); setErr('');
    try {
      const url = initial ? `${BASE}/users/${initial.id}` : `${BASE}/users`;
      const body = { ...form, overrides };
      if (!body.password) delete body.password;
      const res = await authFetch(url, { method: initial ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSave(data);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const tabStyle = (t) => ({
    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
    background: tab === t ? 'var(--accent)' : 'var(--surface-2)',
    color: tab === t ? '#fff' : 'var(--text-muted)',
  });

  const overrideCount = Object.values(overrides).reduce((n, m) => n + Object.keys(m).length, 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 22px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title"><Users size={16} style={{ color: '#60A5FA' }} /> {initial ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</div>
          <button className="btn" onClick={onClose} style={{ padding: '7px 10px' }}><X size={16} /></button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 22px' }}>
          {err && <div className="banner banner-error" style={{ marginBottom: 14 }}>{err}</div>}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            <button style={tabStyle('info')} onClick={() => setTab('info')}>Informations</button>
            <button style={tabStyle('droits')} onClick={() => setTab('droits')}>
              Droits spécifiques {overrideCount > 0 && <span style={{ background: '#FB923C', color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10, marginLeft: 4 }}>{overrideCount}</span>}
            </button>
          </div>

          {tab === 'info' && (
            <>
              <div className="row-2">
                <div className="field"><label>Prénom</label><input className="input" value={form.prenom} onChange={set('prenom')} placeholder="Ahmed" /></div>
                <div className="field"><label>Nom</label><input className="input" value={form.nom} onChange={set('nom')} placeholder="Bennani" /></div>
              </div>
              <div className="row-2">
                <div className="field"><label>Identifiant (login)</label><input className="input mono" value={form.username} onChange={set('username')} placeholder="a.bennani" /></div>
                <div className="field"><label>Email</label><input className="input" type="email" value={form.email} onChange={set('email')} placeholder="a.bennani@becomar.ma" /></div>
              </div>
              <div className="row-2">
                <div className="field"><label>{initial ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe'}</label>
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
                <input type="checkbox" checked={form.actif} onChange={set('actif')} style={{ accentColor: 'var(--teal)', width: 15, height: 15 }} />
                <span style={{ color: form.actif ? 'var(--teal)' : 'var(--text-muted)' }}>Compte actif</span>
              </label>
            </>
          )}

          {tab === 'droits' && (
            <UserOverrideMatrix
              groupPerms={curGroupe?.permissions || {}}
              overrides={overrides}
              onChange={setOverrides}
            />
          )}

          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Résumé permissions d'un groupe (compact) ----
function GroupPermSummary({ permissions }) {
  return (
    <div style={{ padding: '4px 22px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {MODULES.map((m) => {
        const actions = MODULES_ACTIONS[m.key] || [];
        const allowed = actions.filter((a) => permissions[m.key]?.[a]);
        if (allowed.length === 0) return null;
        return (
          <div key={m.key} style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', minWidth: 140 }}>{m.label}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {allowed.map((a) => (
                <span key={a} style={{
                  fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 4,
                  background: `${ACTION_COLORS[a] || '#94A3B8'}22`,
                  color: ACTION_COLORS[a] || '#94A3B8',
                  border: `1px solid ${ACTION_COLORS[a] || '#94A3B8'}55`,
                }}>{ACTION_LABELS[a] || a}</span>
              ))}
            </div>
          </div>
        );
      }).filter(Boolean)}
    </div>
  );
}

// ---- PAGE PRINCIPALE ----
export default function Utilisateurs() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('users');
  const [reload, setReload] = useState(0);

  const { data: usersData } = useFetch(() => authFetch(`${BASE}/users`).then((r) => r.json()), [reload]);
  const { data: groupesData } = useFetch(() => authFetch(`${BASE}/groupes`).then((r) => r.json()), [reload]);
  const refresh = () => setReload((r) => r + 1);

  const [editUser, setEditUser] = useState(null);
  const [newUser, setNewUser] = useState(false);
  const [editGroupe, setEditGroupe] = useState(null);
  const [newGroupe, setNewGroupe] = useState(false);
  const [expandedGroupe, setExpandedGroupe] = useState(null);

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
          Gérez les <b style={{ color: 'var(--text)' }}>utilisateurs</b> et leurs <b style={{ color: 'var(--text)' }}>droits par fonctionnalité</b> — par groupe ou individuellement.
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
          { label: 'Utilisateurs avec surcharges', value: usersData.filter((u) => u.overrides && Object.keys(u.overrides).length > 0).length, color: '#FB923C' },
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
                <tr><th>Identifiant</th><th>Nom complet</th><th>Email</th><th>Groupe</th><th>Surcharges</th><th>Statut</th><th></th></tr>
              </thead>
              <tbody>
                {usersData.map((u) => {
                  const overrideCount = u.overrides ? Object.values(u.overrides).reduce((n, m) => n + Object.keys(m).length, 0) : 0;
                  return (
                    <tr key={u.id}>
                      <td className="cell-code">{u.username}</td>
                      <td className="cell-strong">{u.prenom} {u.nom}</td>
                      <td className="muted" style={{ fontSize: 12 }}>{u.email || '—'}</td>
                      <td><span className="pill pill-violet">{u.groupe_nom}</span></td>
                      <td>
                        {overrideCount > 0 ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#FB923C', background: 'rgba(251,146,60,0.12)', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(251,146,60,0.3)' }}>
                            {overrideCount} surcharge{overrideCount > 1 ? 's' : ''}
                          </span>
                        ) : <span className="muted" style={{ fontSize: 11 }}>—</span>}
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- TAB GROUPES ---- */}
      {tab === 'groupes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groupesData.map((g) => {
            const expanded = expandedGroupe === g.id;
            const memberCount = usersData.filter((u) => u.groupe_id === g.id).length;
            return (
              <div key={g.id} className="card">
                <div className="card-head" style={{ cursor: 'pointer' }} onClick={() => setExpandedGroupe(expanded ? null : g.id)}>
                  <div>
                    <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shield size={16} style={{ color: '#A78BFA' }} />{g.nom}
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 10, border: '1px solid var(--border)' }}>
                        {memberCount} utilisateur{memberCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {g.description && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{g.description}</div>}
                  </div>
                  <div className="flex gap" style={{ gap: 5 }}>
                    <button className="btn" style={{ padding: '5px 8px' }} onClick={(e) => { e.stopPropagation(); setEditGroupe(g); }} title="Modifier"><Pencil size={13} /></button>
                    <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); deleteGroupe(g); }} title="Supprimer"><Trash2 size={13} /></button>
                  </div>
                </div>
                {expanded && <GroupPermSummary permissions={g.permissions} />}
                {!expanded && (
                  <div style={{ padding: '4px 22px 12px' }}>
                    <button className="btn" style={{ fontSize: 11, padding: '3px 10px', color: 'var(--text-muted)' }} onClick={() => setExpandedGroupe(g.id)}>
                      Voir les permissions détaillées
                    </button>
                  </div>
                )}
              </div>
            );
          })}
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
