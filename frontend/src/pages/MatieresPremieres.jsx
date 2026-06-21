import { useState } from 'react';
import { Plus, X, Pencil, Eye, ArrowDownToLine, ArrowUpFromLine, Trash2, History, Settings } from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, useFetch, KpiSimple as KpiCard, FilterBar } from '../components/Common.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PhotoManager, { PhotoBadge } from '../components/PhotoManager.jsx';

const UNITES = ['kg', 'T', 'm³', 'm²', 'ml', 'L', 'rouleau', 'pc', 'sac', 'fût'];
const MOTIFS_ENTREE = ['Réception fournisseur', 'Retour production', 'Ajustement inventaire', 'Régularisation'];
const MOTIFS_SORTIE = ['Consommation atelier', 'Rebut', 'Ajustement inventaire'];

function ParamModal({ title, list, onSave, onClose }) {
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
              placeholder="Nouvelle catégorie…" onKeyDown={(e) => e.key === 'Enter' && add()} />
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

const EMPTY = { ref: '', designation: '', description: '', categorie: '', unite: 'm³', cout_unitaire: 0, stock_min: 0, photo: '' };

export default function MatieresPremieres() {
  const { canDo } = useAuth();
  const [reloadP, setReloadP] = useState(0);
  const { data: paramsData } = useFetch(api.params, [reloadP]);
  const categories = paramsData?.mp_categories ?? ['Bois brut', 'Adhésifs', 'Consommables', 'Métaux', 'Emballages', 'Produits chimiques', 'Autre'];

  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.matieres, [reload]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [mvMat, setMvMat] = useState(null);
  const [mvForm, setMvForm] = useState({ type: 'Entrée', qty: 1, motif: 'Réception fournisseur', reference: '' });
  const [histMat, setHistMat] = useState(null);
  const [histData, setHistData] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const [showParam, setShowParam] = useState(false);
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

  const openEdit = (m) => { setEditing(m); setEditForm({ ...m, photos: m.photos || [] }); setErr(''); };

  const uploadPhoto = async (file) => {
    const res = await api.uploadMatierePhoto(editing.ref, file);
    setEditForm((f) => ({ ...f, photos: res.photos || [] }));
    refresh();
  };
  const deletePhoto = async (filename) => {
    const res = await api.deleteMatierePhoto(editing.ref, filename);
    setEditForm((f) => ({ ...f, photos: res.photos || [] }));
    refresh();
  };
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

  const openHist = async (m) => {
    setHistMat(m); setHistData([]); setHistLoading(true);
    try { const mvs = await api.matiereMovements(m.ref); setHistData(mvs); }
    catch { setHistData([]); }
    finally { setHistLoading(false); }
  };

  const saveCategories = async (values) => {
    await api.updateParam('mp_categories', values);
    setReloadP((r) => r + 1);
    setFilters((f) => ({ ...f, categorie: 'Tous' }));
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
        <div className="flex gap" style={{ gap: 8 }}>
          {canDo('matieres', 'manage_categories') && (
            <button className="btn" onClick={() => setShowParam(true)}>
              <Settings size={15} /> Catégories
            </button>
          )}
          {canDo('matieres', 'create') && (
            <button className="btn btn-primary" onClick={() => { setOpen(true); setErr(''); setForm({ ...EMPTY, categorie: categories[0] || '' }); }}>
              <Plus size={17} /> Nouvelle matière
            </button>
          )}
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <KpiCard label="Valeur stock MP" value={dh(totalStockVal)} sub={`${data.length} références`} tone="orange" />
        <KpiCard label="Total consommé" value={num(+totalConsumed.toFixed(1))} sub="unités consommées en production" tone="teal" />
        <KpiCard label="Alertes stock bas" value={lowCount} sub={lowCount > 0 ? 'matières sous le minimum' : 'Tout est OK'} tone={lowCount > 0 ? 'bad' : 'good'} />
      </div>

      {showParam && (
        <ParamModal
          title="Catégories de matières premières"
          list={categories}
          onSave={saveCategories}
          onClose={() => setShowParam(false)}
        />
      )}

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div className="card-title">Nouvelle matière première</div>
              <button className="btn" onClick={() => setOpen(false)} style={{ padding: '7px 10px' }}><X size={16} /></button>
            </div>
            {err && <div className="banner banner-error" style={{ margin: '0 22px' }}>{err}</div>}
            <div style={{ padding: '16px 22px 22px' }}>
              <div className="row-2">
                <div className="field"><label>Référence</label>
                  <input className="input mono" value={form.ref} onChange={set('ref')} placeholder="MP-XXX-00" /></div>
                <div className="field"><label>Catégorie</label>
                  <select className="select" value={form.categorie} onChange={set('categorie')}>
                    {categories.map((c) => <option key={c}>{c}</option>)}
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
              <div className="field"><label>Stock minimum</label>
                <input className="input mono" type="number" min="0" value={form.stock_min} onChange={set('stock_min')} /></div>
              <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
                <button className="btn btn-primary" onClick={submit} disabled={saving}>
                  <ArrowDownToLine size={16} /> {saving ? 'Enregistrement…' : 'Créer matière'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (() => {
        const ro = !canDo('matieres', 'edit');
        return (
          <div className="overlay" onClick={() => setEditing(null)}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
              <div className="card-head">
                <div className="card-title">{ro ? 'Consulter' : 'Modifier'} — {editing.ref}</div>
                <button className="btn" onClick={() => setEditing(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
              </div>
              {err && <div className="banner banner-error" style={{ margin: '0 22px' }}>{err}</div>}
              <div style={{ padding: '16px 22px 22px' }}>
                <div className="row-2">
                  <div className="field"><label>Désignation</label>
                    <input className="input" value={editForm.designation} onChange={setE('designation')} disabled={ro} /></div>
                  <div className="field"><label>Catégorie</label>
                    <select className="select" value={editForm.categorie} onChange={setE('categorie')} disabled={ro}>
                      {categories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="field"><label>Description</label>
                  <input className="input" value={editForm.description || ''} onChange={setE('description')} disabled={ro} /></div>
                <div className="row-2">
                  <div className="field"><label>Unité</label>
                    <select className="select" value={editForm.unite} onChange={setE('unite')} disabled={ro}>
                      {UNITES.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Coût unitaire (DH)</label>
                    <input className="input mono" type="number" min="0" step="0.01" value={editForm.cout_unitaire} onChange={setE('cout_unitaire')} disabled={ro} /></div>
                </div>
                <div className="field"><label>Stock minimum</label>
                  <input className="input mono" type="number" min="0" value={editForm.stock_min} onChange={setE('stock_min')} disabled={ro} /></div>
                <div style={{ marginTop: 14 }}>
                  <PhotoManager
                    photos={editForm.photos || []}
                    onUpload={uploadPhoto}
                    onDelete={deletePhoto}
                    readOnly={ro}
                  />
                </div>
                <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="btn" onClick={() => setEditing(null)}>{ro ? 'Fermer' : 'Annuler'}</button>
                  {!ro && (
                    <button className="btn btn-primary" onClick={submitEdit} disabled={saving}>
                      {saving ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {mvMat && canDo('matieres', 'add_movement') && (
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

      {histMat && (
        <div className="overlay" onClick={() => setHistMat(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <div className="card-title">Historique — {histMat.designation}</div>
                <div className="muted" style={{ fontSize: 12 }}>{histMat.ref} · Stock actuel : <b>{num(+histMat.stock.toFixed(2))} {histMat.unite}</b></div>
              </div>
              <button className="btn" onClick={() => setHistMat(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
            </div>
            <div style={{ padding: '0 22px 22px' }}>
              {histLoading ? <div className="muted" style={{ padding: 24, textAlign: 'center' }}>Chargement…</div>
                : histData.length === 0 ? <div className="muted" style={{ padding: 24, textAlign: 'center' }}>Aucun mouvement.</div>
                : (
                  <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                    <table>
                      <thead><tr><th>Date</th><th>Type</th><th className="mono">Qté</th><th>Motif</th><th>Référence</th><th>Source</th></tr></thead>
                      <tbody>
                        {[...histData].reverse().map((mv, i) => (
                          <tr key={i}>
                            <td className="muted" style={{ fontSize: 12 }}>{mv.date ? new Date(mv.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: mv.type === 'Entrée' ? '#2DD4BF' : '#FB923C', fontWeight: 600, fontSize: 12 }}>
                              {mv.type === 'Entrée' ? <ArrowDownToLine size={13} /> : <ArrowUpFromLine size={13} />}{mv.type}
                            </span></td>
                            <td className="mono cell-strong" style={{ color: mv.type === 'Entrée' ? '#2DD4BF' : '#FB923C' }}>{mv.type === 'Entrée' ? '+' : '-'}{num(+mv.qty.toFixed(2))} {histMat.unite}</td>
                            <td className="muted" style={{ fontSize: 12 }}>{mv.motif || '—'}</td>
                            <td className="cell-code" style={{ fontSize: 12 }}>{mv.reference || '—'}</td>
                            <td className="muted" style={{ fontSize: 11 }}>{mv.source || 'Manuel'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              {histData.length > 0 && (
                <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13 }}>
                  <span style={{ color: '#2DD4BF' }}>↓ Entrées : <b>{num(+(histData.filter(m => m.type === 'Entrée').reduce((s, m) => s + m.qty, 0)).toFixed(2))} {histMat.unite}</b></span>
                  <span style={{ color: '#FB923C' }}>↑ Sorties : <b>{num(+(histData.filter(m => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0)).toFixed(2))} {histMat.unite}</b></span>
                  <span className="muted">{histData.length} mouvement{histData.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Stock matières premières</div>
          <span className="card-hint">{data.length} références</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (référence, désignation…)', type: 'text' },
            { key: 'categorie', label: 'Catégorie', type: 'select', options: ['Tous', ...categories] },
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
                    <span style={{ color: m.lowStock ? '#fbbf24' : 'var(--text)', fontWeight: m.lowStock ? 700 : 400 }}>{num(+m.stock.toFixed(2))}</span>
                    <span className="muted" style={{ fontSize: 11 }}> {m.unite}</span>
                    {m.lowStock && <div className="muted" style={{ fontSize: 10, color: '#fbbf24' }}>⚠ Min: {m.stock_min}</div>}
                  </td>
                  <td className="mono muted">{m.cout_unitaire} DH/{m.unite}</td>
                  <td className="mono cell-strong">{dh(m.stockValue)}</td>
                  <td className="mono muted">{num(+m.consumed.toFixed(2))} {m.unite}</td>
                  <td className="mono muted">{num(+m.received.toFixed(2))} {m.unite}</td>
                  <td>
                    <div className="flex gap" style={{ gap: 5, alignItems: 'center' }}>
                      <PhotoBadge photos={m.photos || []} onClick={() => openEdit(m)} />
                      <button className="btn" style={{ padding: '5px 8px' }} onClick={() => openEdit(m)} title={canDo('matieres', 'edit') ? 'Modifier' : 'Consulter'}>{canDo('matieres', 'edit') ? <Pencil size={13} /> : <Eye size={13} />}</button>
                      {canDo('matieres', 'add_movement') && <button className="btn" style={{ padding: '5px 8px', color: 'var(--teal)' }} onClick={() => openMv(m)} title="Réception / mouvement"><ArrowDownToLine size={13} /></button>}
                      {canDo('matieres', 'view_history') && <button className="btn" style={{ padding: '5px 8px', color: '#A78BFA' }} onClick={() => openHist(m)} title="Historique"><History size={13} /></button>}
                      {canDo('matieres', 'delete') && <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => deleteMatiere(m)} title="Supprimer"><Trash2 size={13} /></button>}
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
