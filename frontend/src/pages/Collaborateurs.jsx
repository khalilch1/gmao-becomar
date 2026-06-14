import { useState } from 'react';
import { Plus, X, Pencil, Trash2, Users } from 'lucide-react';
import { api } from '../App.jsx';
import { Loading, useFetch, FilterBar } from '../components/Common.jsx';

const EQUIPES = ['Équipe A', 'Équipe B', 'Équipe C'];
const FONCTIONS = [
  'Technicien maintenance', 'Chef d\'équipe', 'Électricien',
  'Mécanicien', 'Magasinier', 'Responsable maintenance',
];
const DEPARTEMENTS = [
  'Direction', 'Administration', 'Production', 'Maintenance',
  'Qualité', 'Logistique', 'Achats', 'Ressources Humaines', 'Finance',
];

const EMPTY = { nom: '', prenom: '', matricule: '', departement: 'Maintenance', fonction: 'Technicien maintenance', equipe: 'Équipe A' };

export default function Collaborateurs() {
  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.collaborateurs, [reload]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ q: '', departement: 'Tous', equipe: 'Tous' });
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const refresh = () => setReload((r) => r + 1);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setE = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.nom.trim() || !form.prenom.trim()) { setErr('Nom et prénom obligatoires'); return; }
    setSaving(true); setErr('');
    try {
      await api.createCollaborateur(form);
      setOpen(false); setForm(EMPTY); refresh();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const openEdit = (col) => { setEditing(col); setEditForm({ ...col }); };

  const submitEdit = async () => {
    if (!editForm.nom.trim() || !editForm.prenom.trim()) { setErr('Nom et prénom obligatoires'); return; }
    setSaving(true); setErr('');
    try {
      await api.updateCollaborateur(editing.id, editForm);
      setEditing(null); refresh();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (col) => {
    if (!confirm(`Supprimer ${col.prenom} ${col.nom} ?`)) return;
    await api.deleteCollaborateur(col.id);
    refresh();
  };

  if (!data) return <Loading />;

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Gérez ici la liste du <b style={{ color: 'var(--text)' }}>personnel maintenance</b> qui peut être affecté aux ordres de travail.
        </p>
        <button className="btn btn-primary" onClick={() => { setOpen(true); setErr(''); }}>
          <Plus size={17} /> Nouveau collaborateur
        </button>
      </div>

      {/* Formulaire création */}
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
                {DEPARTEMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="row-2">
            <div className="field"><label>Fonction</label>
              <select className="select" value={form.fonction} onChange={set('fonction')}>
                {FONCTIONS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="field"><label>Équipe</label>
              <select className="select" value={form.equipe} onChange={set('equipe')}>
                {EQUIPES.map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              <Users size={16} /> {saving ? 'Enregistrement…' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Modal modification */}
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
                  <input className="input mono" value={editForm.matricule} onChange={setE('matricule')} /></div>
                <div className="field"><label>Département</label>
                  <select className="select" value={editForm.departement || 'Maintenance'} onChange={setE('departement')}>
                    {DEPARTEMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="row-2">
                <div className="field"><label>Fonction</label>
                  <select className="select" value={editForm.fonction} onChange={setE('fonction')}>
                    {FONCTIONS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="field"><label>Équipe</label>
                  <select className="select" value={editForm.equipe} onChange={setE('equipe')}>
                    {EQUIPES.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </div>
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
          <div className="card-title">Personnel maintenance</div>
          <span className="card-hint">{data.length} collaborateur{data.length > 1 ? 's' : ''}</span>
        </div>
        {(() => {
          const filteredCollabs = data.filter((c) => {
            if (filters.departement !== 'Tous' && c.departement !== filters.departement) return false;
            if (filters.equipe !== 'Tous' && c.equipe !== filters.equipe) return false;
            if (filters.q) {
              const q = filters.q.toLowerCase();
              return `${c.prenom} ${c.nom}`.toLowerCase().includes(q) || c.matricule?.toLowerCase().includes(q) || c.fonction?.toLowerCase().includes(q);
            }
            return true;
          });
          return (
            <>
              <FilterBar
                filters={[
                  { key: 'q', label: 'Rechercher (nom, matricule, fonction…)', type: 'text' },
                  { key: 'departement', label: 'Département', type: 'select', options: ['Tous', ...DEPARTEMENTS] },
                  { key: 'equipe', label: 'Équipe', type: 'select', options: ['Tous', ...EQUIPES] },
                ]}
                values={filters} onChange={setF} total={data.length} shown={filteredCollabs.length}
              />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Nom complet</th><th>Matricule</th>
                <th>Département</th><th>Fonction</th><th>Équipe</th><th></th>
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
                  <td><span className="pill pill-teal">{c.equipe || '—'}</span></td>
                  <td>
                    <div className="flex gap" style={{ gap: 6 }}>
                      <button className="btn" style={{ padding: '5px 8px' }} onClick={() => { openEdit(c); setErr(''); }} title="Modifier">
                        <Pencil size={14} />
                      </button>
                      <button className="btn" style={{ padding: '5px 8px', color: 'var(--danger, #ef4444)' }} onClick={() => remove(c)} title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 32 }}>
                  Aucun collaborateur. Cliquez sur "Nouveau collaborateur" pour commencer.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
