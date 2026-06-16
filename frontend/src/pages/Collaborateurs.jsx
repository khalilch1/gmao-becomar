import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Users, Settings } from 'lucide-react';
import { api } from '../App.jsx';
import { Loading, useFetch, FilterBar } from '../components/Common.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function ParamModal({ title, list, placeholder, onSave, onClose }) {
  const [items, setItems] = useState([...list]);
  const [newVal, setNewVal] = useState('');
  const [saving, setSaving] = useState(false);
  const add = () => {
    const v = newVal.trim();
    if (!v || items.includes(v)) return;
    setItems([...items, v]); setNewVal('');
  };
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));
  const save = async () => {
    setSaving(true);
    await onSave(items);
    setSaving(false);
    onClose();
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="card-head">
          <div className="card-title">{title}</div>
          <button className="btn" onClick={onClose} style={{ padding: '7px 10px' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '12px 22px 22px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input className="input" style={{ flex: 1 }} value={newVal} onChange={(e) => setNewVal(e.target.value)}
              placeholder={placeholder} onKeyDown={(e) => e.key === 'Enter' && add()} />
            <button className="btn btn-primary" onClick={add} style={{ padding: '0 16px' }}><Plus size={15} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                <span style={{ fontSize: 14 }}>{item}</span>
                <button className="btn" style={{ padding: '3px 7px', color: '#ef4444' }} onClick={() => remove(i)}><X size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Collaborateurs() {
  const { canDo } = useAuth();
  const [reloadP, setReloadP] = useState(0);
  const { data: paramsData } = useFetch(api.params, [reloadP]);
  const departements = paramsData?.departements ?? ['Direction', 'Administration', 'Production', 'Maintenance', 'Qualité', 'Logistique', 'Achats', 'Ressources Humaines', 'Finance'];
  const fonctions = paramsData?.fonctions ?? ["Technicien maintenance", "Chef d'équipe", 'Électricien', 'Mécanicien', 'Magasinier', 'Responsable maintenance'];

  const [showParamDep, setShowParamDep] = useState(false);
  const [showParamFon, setShowParamFon] = useState(false);

  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.collaborateurs, [reload]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: '', prenom: '', matricule: '', departement: '', fonction: '' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ q: '', departement: 'Tous' });
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const refresh = () => setReload((r) => r + 1);
  const refreshParams = () => setReloadP((r) => r + 1);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setE = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setForm({ nom: '', prenom: '', matricule: '', departement: departements[0] || '', fonction: fonctions[0] || '' });
    setOpen(true); setErr('');
  };

  const submit = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) { setErr('Nom et prénom obligatoires'); return; }
    setSaving(true); setErr('');
    try { await api.createCollaborateur(form); setOpen(false); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const openEdit = (col) => { setEditing(col); setEditForm({ ...col }); setErr(''); };
  const submitEdit = async () => {
    if (!editForm.nom.trim() || !editForm.prenom.trim()) { setErr('Nom et prénom obligatoires'); return; }
    setSaving(true); setErr('');
    try { await api.updateCollaborateur(editing.id, editForm); setEditing(null); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (col) => {
    if (!confirm(`Supprimer ${col.prenom} ${col.nom} ?`)) return;
    await api.deleteCollaborateur(col.id);
    refresh();
  };

  if (!data) return <Loading />;

  const filteredCollabs = data.filter((c) => {
    if (filters.departement !== 'Tous' && c.departement !== filters.departement) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return `${c.prenom} ${c.nom}`.toLowerCase().includes(q)
        || c.matricule?.toLowerCase().includes(q)
        || c.fonction?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Gérez ici la liste du <b style={{ color: 'var(--text)' }}>personnel</b> pouvant être affecté aux ordres de travail et productions.
        </p>
        <div className="flex gap" style={{ gap: 8 }}>
          {canDo('collaborateurs', 'manage_params') && (
            <>
              <button className="btn" onClick={() => setShowParamDep(true)}>
                <Settings size={15} /> Départements
              </button>
              <button className="btn" onClick={() => setShowParamFon(true)}>
                <Settings size={15} /> Fonctions
              </button>
            </>
          )}
          {canDo('collaborateurs', 'create') && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={17} /> Nouveau collaborateur
            </button>
          )}
        </div>
      </div>

      {showParamDep && (
        <ParamModal
          title="Gérer les départements"
          list={departements}
          placeholder="Nouveau département…"
          onSave={async (values) => { await api.updateParam('departements', values); refreshParams(); setFilters((f) => ({ ...f, departement: 'Tous' })); }}
          onClose={() => setShowParamDep(false)}
        />
      )}
      {showParamFon && (
        <ParamModal
          title="Gérer les fonctions"
          list={fonctions}
          placeholder="Nouvelle fonction…"
          onSave={async (values) => { await api.updateParam('fonctions', values); refreshParams(); }}
          onClose={() => setShowParamFon(false)}
        />
      )}

      {open && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <div className="card-head">
            <div className="card-title">Ajouter un collaborateur</div>
            <button className="btn" onClick={() => setOpen(false)} style={{ padding: '7px 10px' }}><X size={16} /></button>
          </div>
          {err && <div className="banner banner-error">{err}</div>}
          <div className="row-2">
            <div className="field"><label>Prénom</label>
              <input className="input" value={form.prenom} onChange={set('prenom')} placeholder="Ahmed" /></div>
            <div className="field"><label>Nom</label>
              <input className="input" value={form.nom} onChange={set('nom')} placeholder="Bennani" /></div>
          </div>
          <div className="row-2">
            <div className="field"><label>Matricule</label>
              <input className="input mono" value={form.matricule} onChange={set('matricule')} placeholder="MTR-0001" /></div>
            <div className="field"><label>Département</label>
              <select className="select" value={form.departement} onChange={set('departement')}>
                {departements.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ maxWidth: '50%' }}><label>Fonction</label>
            <select className="select" value={form.fonction} onChange={set('fonction')}>
              {fonctions.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              <Users size={16} /> {saving ? 'Enregistrement…' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div className="card-title">Modifier — {editing.prenom} {editing.nom}</div>
              <button className="btn" onClick={() => setEditing(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
            </div>
            {err && <div className="banner banner-error" style={{ margin: '0 22px' }}>{err}</div>}
            <div style={{ padding: '16px 22px' }}>
              <div className="row-2">
                <div className="field"><label>Prénom</label>
                  <input className="input" value={editForm.prenom} onChange={setE('prenom')} /></div>
                <div className="field"><label>Nom</label>
                  <input className="input" value={editForm.nom} onChange={setE('nom')} /></div>
              </div>
              <div className="row-2">
                <div className="field"><label>Matricule</label>
                  <input className="input mono" value={editForm.matricule || ''} onChange={setE('matricule')} /></div>
                <div className="field"><label>Département</label>
                  <select className="select" value={editForm.departement || ''} onChange={setE('departement')}>
                    {departements.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="field" style={{ maxWidth: '50%' }}><label>Fonction</label>
                <select className="select" value={editForm.fonction || ''} onChange={setE('fonction')}>
                  {fonctions.map((f) => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn" onClick={() => setEditing(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={submitEdit} disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Personnel</div>
          <span className="card-hint">{data.length} collaborateur{data.length > 1 ? 's' : ''}</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (nom, matricule, fonction…)', type: 'text' },
            { key: 'departement', label: 'Département', type: 'select', options: ['Tous', ...departements] },
          ]}
          values={filters} onChange={setF} total={data.length} shown={filteredCollabs.length}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom complet</th><th>Matricule</th>
                <th>Département</th><th>Fonction</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredCollabs.map((c) => (
                <tr key={c.id}>
                  <td className="cell-code">{c.id}</td>
                  <td className="cell-strong">{c.prenom} {c.nom}</td>
                  <td className="mono muted">{c.matricule || '—'}</td>
                  <td><span className="pill pill-violet">{c.departement || '—'}</span></td>
                  <td>{c.fonction || '—'}</td>
                  <td>
                    <div className="flex gap" style={{ gap: 6 }}>
                      {canDo('collaborateurs', 'edit') && <button className="btn" style={{ padding: '5px 8px' }} onClick={() => openEdit(c)} title="Modifier"><Pencil size={14} /></button>}
                      {canDo('collaborateurs', 'delete') && <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => remove(c)} title="Supprimer"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  Aucun collaborateur. Cliquez sur "Nouveau collaborateur" pour commencer.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
