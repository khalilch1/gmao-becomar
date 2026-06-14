import { useState } from 'react';
import { Plus, X, Pencil, ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, useFetch, KpiSimple as KpiCard, FilterBar } from '../components/Common.jsx';

const CATEGORIES = ['Bois brut', 'Adhésifs', 'Consommables', 'Métaux', 'Emballages', 'Produits chimiques', 'Autre'];
const UNITES = ['kg', 'T', 'm³', 'm²', 'ml', 'L', 'rouleau', 'pc', 'sac', 'fût'];
const MOTIFS_ENTREE = ['Réception fournisseur', 'Retour production', 'Ajustement inventaire', 'Régularisation'];
const MOTIFS_SORTIE = ['Consommation atelier', 'Rebut', 'Ajustement inventaire'];

const EMPTY = { ref: '', designation: '', description: '', categorie: 'Bois brut', unite: 'm³', cout_unitaire: 0, stock_min: 0, photo: '' };

export default function MatieresPremieres() {
  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.matieres, [reload]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [mvMat, setMvMat] = useState(null);
  const [mvForm, setMvForm] = useState({ type: 'Entrée', qty: 1, motif: 'Réception fournisseur', reference: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [filters, setFilters] = useState({ q: '', categorie: 'Tous', lowStock: false });
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const refresh = () => setReload((r) => r + 1);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setE = (k) => (e) => setEditForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.ref.trim() || !form.designation.trim()) { setErr('Référence et désignation obligatoires'); return; }
    setSaving(true); setErr('');
    try { await api.createMatiere(form); setOpen(false); setForm(EMPTY); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const openEdit = (m) => { setEditing(m); setEditForm({ ...m }); setErr(''); };
  const submitEdit = async () => {
    setSaving(true); setErr('');
    try { await api.updateMatiere(editing.ref, editForm); setEditing(null); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const deleteMatiere = async (m) => {
    if (!confirm(`Supprimer "${m.designation}" (${m.ref}) ? Cette action est irréversible.`)) return;
    try { await api.deleteMatiere(m.ref); refresh(); }
    catch (e) { alert(e.message); }
  };

  const openMv = (m) => {
    setMvMat(m);
    setMvForm({ type: 'Entrée', qty: 1, motif: 'Réception fournisseur', reference: '' });
    setErr('');
  };
  const submitMv = async () => {
    const q = Number(mvForm.qty);
    if (!q || q <= 0) { setErr('Quantité invalide'); return; }
    setSaving(true); setErr('');
    try { await api.addMatiereMovement(mvMat.ref, mvForm); setMvMat(null); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  if (!data) return <Loading />;

  const totalStockVal = data.reduce((s, m) => s + m.stockValue, 0);
  const totalConsumed = data.reduce((s, m) => s + m.consumed, 0);
  const lowCount = data.filter((m) => m.lowStock).length;

  const filteredMatieres = data.filter((m) => {
    if (filters.lowStock && !m.lowStock) return false;
    if (filters.categorie !== 'Tous' && m.categorie !== filters.categorie) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return m.ref.toLowerCase().includes(q) || m.designation.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Gestion des <b style={{ color: 'var(--text)' }}>matières premières</b>. Le stock diminue automatiquement à chaque saisie de production.
        </p>
        <button className="btn btn-primary" onClick={() => { setOpen(true); setErr(''); }}>
          <Plus size={17} /> Nouvelle matière
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <KpiCard label="Valeur stock MP" value={dh(totalStockVal)} sub={`${data.length} références`} tone="orange" />
        <KpiCard label="Total consommé" value={num(+totalConsumed.toFixed(1))} sub="unités consommées en production" tone="teal" />
        <KpiCard label="Alertes stock bas" value={lowCount} sub={lowCount > 0 ? 'matières sous le minimum' : 'Tout est OK'} tone={lowCount > 0 ? 'bad' : 'good'} />
      </div>

      {/* Formulaire création */}
      {open && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <div className="card-head">
            <div className="card-title">Nouvelle matière première</div>
            <button className="btn" onClick={() => setOpen(false)} style={{ padding: '7px 10px' }}><X size={16} /></button>
          </div>
          {err && <div className="banner banner-error">{err}</div>}
          <div className="row-2">
            <div className="field"><label>Référence</label>
              <input className="input mono" value={form.ref} onChange={set('ref')} placeholder="MP-XXX-00" /></div>
            <div className="field"><label>Catégorie</label>
              <select className="select" value={form.categorie} onChange={set('categorie')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Désignation</label>
            <input className="input" value={form.designation} onChange={set('designation')} placeholder="Ex : Grumes de sapin" /></div>
          <div className="field"><label>Description</label>
            <input className="input" value={form.description} onChange={set('description')} placeholder="Détails, fournisseur, norme..." /></div>
          <div className="row-2">
            <div className="field"><label>Unité</label>
              <select className="select" value={form.unite} onChange={set('unite')}>
                {UNITES.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="field"><label>Coût unitaire (DH)</label>
              <input className="input mono" type="number" min="0" step="0.01" value={form.cout_unitaire} onChange={set('cout_unitaire')} /></div>
          </div>
          <div className="row-2">
            <div className="field"><label>Stock minimum</label>
              <input className="input mono" type="number" min="0" value={form.stock_min} onChange={set('stock_min')} /></div>
            <div className="field"><label>Photo (URL)</label>
              <input className="input" value={form.photo} onChange={set('photo')} placeholder="https://..." /></div>
          </div>
          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              <ArrowDownToLine size={16} /> {saving ? 'Enregistrement…' : 'Créer matière'}
            </button>
          </div>
        </div>
      )}

      {/* Modal modification */}
      {editing && (
        <div className="overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div className="card-title">Modifier — {editing.ref}</div>
              <button className="btn" onClick={() => setEditing(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
            </div>
            {err && <div className="banner banner-error" style={{ margin: '0 22px' }}>{err}</div>}
            <div style={{ padding: '16px 22px 22px' }}>
              <div className="row-2">
                <div className="field"><label>Désignation</label>
                  <input className="input" value={editForm.designation} onChange={setE('designation')} /></div>
                <div className="field"><label>Catégorie</label>
                  <select className="select" value={editForm.categorie} onChange={setE('categorie')}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Description</label>
                <input className="input" value={editForm.description || ''} onChange={setE('description')} /></div>
              <div className="row-2">
                <div className="field"><label>Unité</label>
                  <select className="select" value={editForm.unite} onChange={setE('unite')}>
                    {UNITES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field"><label>Coût unitaire (DH)</label>
                  <input className="input mono" type="number" min="0" step="0.01" value={editForm.cout_unitaire} onChange={setE('cout_unitaire')} /></div>
              </div>
              <div className="row-2">
                <div className="field"><label>Stock minimum</label>
                  <input className="input mono" type="number" min="0" value={editForm.stock_min} onChange={setE('stock_min')} /></div>
                <div className="field"><label>Photo (URL)</label>
                  <input className="input" value={editForm.photo || ''} onChange={setE('photo')} /></div>
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

      {/* Modal mouvement (réception / ajustement) */}
      {mvMat && (
        <div className="overlay" onClick={() => setMvMat(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <div className="card-title">Mouvement — {mvMat.designation}</div>
                <div className="muted" style={{ fontSize: 12 }}>Stock actuel : <b>{num(mvMat.stock)} {mvMat.unite}</b></div>
              </div>
              <button className="btn" onClick={() => setMvMat(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
            </div>
            {err && <div className="banner banner-error" style={{ margin: '0 22px' }}>{err}</div>}
            <div style={{ padding: '16px 22px 22px' }}>
              <div className="field"><label>Type de mouvement</label>
                <select className="select" value={mvForm.type}
                  onChange={(e) => setMvForm((f) => ({ ...f, type: e.target.value, motif: e.target.value === 'Entrée' ? MOTIFS_ENTREE[0] : MOTIFS_SORTIE[0] }))}>
                  <option>Entrée</option><option>Sortie</option>
                </select>
              </div>
              <div className="row-2">
                <div className="field"><label>Quantité ({mvMat.unite})</label>
                  <input className="input mono" type="number" min="0.01" step="0.01" value={mvForm.qty}
                    onChange={(e) => setMvForm((f) => ({ ...f, qty: e.target.value }))} /></div>
                <div className="field"><label>Motif</label>
                  <select className="select" value={mvForm.motif}
                    onChange={(e) => setMvForm((f) => ({ ...f, motif: e.target.value }))}>
                    {(mvForm.type === 'Entrée' ? MOTIFS_ENTREE : MOTIFS_SORTIE).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Référence (BL, BC, bon entrée…)</label>
                <input className="input" value={mvForm.reference}
                  onChange={(e) => setMvForm((f) => ({ ...f, reference: e.target.value }))} placeholder="BL-0000" /></div>
              <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn" onClick={() => setMvMat(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={submitMv} disabled={saving}>
                  {mvForm.type === 'Entrée' ? <ArrowDownToLine size={15} /> : <ArrowUpFromLine size={15} />}
                  {saving ? 'Enregistrement…' : `Enregistrer ${mvForm.type}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Stock matières premières</div>
          <span className="card-hint">{data.length} références</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (référence, désignation…)', type: 'text' },
            { key: 'categorie', label: 'Catégorie', type: 'select', options: ['Tous', ...CATEGORIES] },
            { key: 'lowStock', label: '⚠ Stock bas uniquement', type: 'toggle' },
          ]}
          values={filters} onChange={setF} total={data.length} shown={filteredMatieres.length}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th><th>Désignation</th><th>Catégorie</th>
                <th className="mono">Stock</th><th className="mono">P.U.</th>
                <th className="mono">Valeur stock</th><th className="mono">Consommé</th>
                <th className="mono">Reçu</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredMatieres.map((m) => (
                <tr key={m.ref}>
                  <td className="cell-code">{m.ref}</td>
                  <td>
                    <div className="cell-strong">{m.designation}</div>
                    {m.description && <div className="muted" style={{ fontSize: 11 }}>{m.description}</div>}
                  </td>
                  <td><Pill tone="teal">{m.categorie}</Pill></td>
                  <td className="mono">
                    <span style={{ color: m.lowStock ? '#fbbf24' : 'var(--text)', fontWeight: m.lowStock ? 700 : 400 }}>
                      {num(+m.stock.toFixed(2))}
                    </span>
                    <span className="muted" style={{ fontSize: 11 }}> {m.unite}</span>
                    {m.lowStock && <div className="muted" style={{ fontSize: 10, color: '#fbbf24' }}>⚠ Min: {m.stock_min}</div>}
                  </td>
                  <td className="mono muted">{m.cout_unitaire} DH/{m.unite}</td>
                  <td className="mono cell-strong">{dh(m.stockValue)}</td>
                  <td className="mono muted">{num(+m.consumed.toFixed(2))} {m.unite}</td>
                  <td className="mono muted">{num(+m.received.toFixed(2))} {m.unite}</td>
                  <td>
                    <div className="flex gap" style={{ gap: 5 }}>
                      <button className="btn" style={{ padding: '5px 8px' }} onClick={() => openEdit(m)} title="Modifier"><Pencil size={13} /></button>
                      <button className="btn" style={{ padding: '5px 8px', color: 'var(--teal)' }} onClick={() => openMv(m)} title="Réception / mouvement"><ArrowDownToLine size={13} /></button>
                      <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => deleteMatiere(m)} title="Supprimer"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
