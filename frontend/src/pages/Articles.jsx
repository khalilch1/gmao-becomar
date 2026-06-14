import { useState } from 'react';
import { Plus, X, Pencil, Package, ArrowUpFromLine, ArrowDownToLine, Trash2, History, Settings } from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, useFetch, KpiSimple as KpiCard, FilterBar } from '../components/Common.jsx';

const UNITES = ['ml', 'm²', 'm³', 'pc', 'kg', 'T', 'palette'];
const MOTIFS_SORTIE = ['Expédition client', 'Rebut', 'Ajustement inventaire', 'Don / Échantillon'];
const MOTIFS_ENTREE = ['Retour client', 'Ajustement inventaire', 'Autre'];

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

const EMPTY = { ref: '', designation: '', description: '', categorie: '', unite: 'ml', cout_unitaire: 0, stock_min: 0, photo: '' };

export default function Articles() {
  const [reloadP, setReloadP] = useState(0);
  const { data: paramsData } = useFetch(api.params, [reloadP]);
  const categories = paramsData?.art_categories ?? ['Planches', 'Panneaux', 'Charpente', 'Ossature', 'Finition', 'Autre'];

  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.articles, [reload]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [mvArt, setMvArt] = useState(null);
  const [mvForm, setMvForm] = useState({ type: 'Sortie', qty: 1, motif: 'Expédition client', reference: '' });
  const [histArt, setHistArt] = useState(null);
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
    try { await api.createArticle(form); setOpen(false); setForm(EMPTY); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const openEdit = (a) => { setEditing(a); setEditForm({ ...a }); setErr(''); };
  const submitEdit = async () => {
    setSaving(true); setErr('');
    try { await api.updateArticle(editing.ref, editForm); setEditing(null); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const deleteArticle = async (a) => {
    if (!confirm(`Supprimer "${a.designation}" (${a.ref}) ? Cette action est irréversible.`)) return;
    try { await api.deleteArticle(a.ref); refresh(); }
    catch (e) { alert(e.message); }
  };

  const openMv = (a) => {
    setMvArt(a);
    setMvForm({ type: 'Sortie', qty: 1, motif: 'Expédition client', reference: '' });
    setErr('');
  };
  const submitMv = async () => {
    const q = Number(mvForm.qty);
    if (!q || q <= 0) { setErr('Quantité invalide'); return; }
    setSaving(true); setErr('');
    try { await api.addArticleMovement(mvArt.ref, mvForm); setMvArt(null); refresh(); }
    catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const openHist = async (a) => {
    setHistArt(a); setHistData([]); setHistLoading(true);
    try { const mvs = await api.articleMovements(a.ref); setHistData(mvs); }
    catch { setHistData([]); }
    finally { setHistLoading(false); }
  };

  const saveCategories = async (values) => {
    await api.updateParam('art_categories', values);
    setReloadP((r) => r + 1);
    setFilters((f) => ({ ...f, categorie: 'Tous' }));
  };

  if (!data) return <Loading />;

  const totalStock = data.reduce((s, a) => s + a.stockValue, 0);
  const totalProduced = data.reduce((s, a) => s + a.produced, 0);
  const lowCount = data.filter((a) => a.lowStock).length;

  const filteredArticles = data.filter((a) => {
    if (filters.lowStock && !a.lowStock) return false;
    if (filters.categorie !== 'Tous' && a.categorie !== filters.categorie) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return a.ref.toLowerCase().includes(q) || a.designation.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5 }}>
          Catalogue des <b style={{ color: 'var(--text)' }}>produits finis</b>. Le stock est mis à jour automatiquement à chaque production.
        </p>
        <div className="flex gap" style={{ gap: 8 }}>
          <button className="btn" onClick={() => setShowParam(true)}>
            <Settings size={15} /> Catégories
          </button>
          <button className="btn btn-primary" onClick={() => { setOpen(true); setErr(''); setForm({ ...EMPTY, categorie: categories[0] || '' }); }}>
            <Plus size={17} /> Nouvel article
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <KpiCard label="Valeur stock articles" value={dh(totalStock)} sub={`${data.length} références`} tone="orange" />
        <KpiCard label="Total produit" value={num(totalProduced)} sub="unités produites (cumulé)" tone="teal" />
        <KpiCard label="Alertes stock bas" value={lowCount} sub={lowCount > 0 ? 'articles sous le minimum' : 'Tout est OK'} tone={lowCount > 0 ? 'bad' : 'good'} />
      </div>

      {showParam && (
        <ParamModal
          title="Catégories d'articles"
          list={categories}
          onSave={saveCategories}
          onClose={() => setShowParam(false)}
        />
      )}

      {open && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <div className="card-head">
            <div className="card-title">Nouvel article</div>
            <button className="btn" onClick={() => setOpen(false)} style={{ padding: '7px 10px' }}><X size={16} /></button>
          </div>
          {err && <div className="banner banner-error">{err}</div>}
          <div className="row-2">
            <div className="field"><label>Référence</label>
              <input className="input mono" value={form.ref} onChange={set('ref')} placeholder="ART-XXX-00" /></div>
            <div className="field"><label>Catégorie</label>
              <select className="select" value={form.categorie} onChange={set('categorie')}>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Désignation</label>
            <input className="input" value={form.designation} onChange={set('designation')} placeholder="Ex : Planche rabotée 22mm" /></div>
          <div className="field"><label>Description</label>
            <input className="input" value={form.description} onChange={set('description')} placeholder="Détails techniques..." /></div>
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
              <Package size={16} /> {saving ? 'Enregistrement…' : 'Créer article'}
            </button>
          </div>
        </div>
      )}

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
                    {categories.map((c) => <option key={c}>{c}</option>)}
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

      {mvArt && (
        <div className="overlay" onClick={() => setMvArt(null)}>
          <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <div className="card-title">Mouvement — {mvArt.designation}</div>
                <div className="muted" style={{ fontSize: 12 }}>Stock actuel : <b>{num(mvArt.stock)} {mvArt.unite}</b></div>
              </div>
              <button className="btn" onClick={() => setMvArt(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
            </div>
            {err && <div className="banner banner-error" style={{ margin: '0 22px' }}>{err}</div>}
            <div style={{ padding: '16px 22px 22px' }}>
              <div className="field"><label>Type de mouvement</label>
                <select className="select" value={mvForm.type}
                  onChange={(e) => setMvForm((f) => ({ ...f, type: e.target.value, motif: e.target.value === 'Sortie' ? MOTIFS_SORTIE[0] : MOTIFS_ENTREE[0] }))}>
                  <option>Sortie</option><option>Entrée</option>
                </select>
              </div>
              <div className="row-2">
                <div className="field"><label>Quantité ({mvArt.unite})</label>
                  <input className="input mono" type="number" min="1" value={mvForm.qty}
                    onChange={(e) => setMvForm((f) => ({ ...f, qty: e.target.value }))} /></div>
                <div className="field"><label>Motif</label>
                  <select className="select" value={mvForm.motif}
                    onChange={(e) => setMvForm((f) => ({ ...f, motif: e.target.value }))}>
                    {(mvForm.type === 'Sortie' ? MOTIFS_SORTIE : MOTIFS_ENTREE).map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Référence (BL, BC…)</label>
                <input className="input" value={mvForm.reference}
                  onChange={(e) => setMvForm((f) => ({ ...f, reference: e.target.value }))} placeholder="BC-1000" /></div>
              <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
                <button className="btn" onClick={() => setMvArt(null)}>Annuler</button>
                <button className="btn btn-primary" onClick={submitMv} disabled={saving}>
                  {mvForm.type === 'Sortie' ? <ArrowUpFromLine size={15} /> : <ArrowDownToLine size={15} />}
                  {saving ? 'Enregistrement…' : `Enregistrer ${mvForm.type}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {histArt && (
        <div className="overlay" onClick={() => setHistArt(null)}>
          <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div>
                <div className="card-title">Historique — {histArt.designation}</div>
                <div className="muted" style={{ fontSize: 12 }}>{histArt.ref} · Stock actuel : <b>{num(histArt.stock)} {histArt.unite}</b></div>
              </div>
              <button className="btn" onClick={() => setHistArt(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
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
                            <td className="mono cell-strong" style={{ color: mv.type === 'Entrée' ? '#2DD4BF' : '#FB923C' }}>{mv.type === 'Entrée' ? '+' : '-'}{num(mv.qty)} {histArt.unite}</td>
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
                  <span style={{ color: '#2DD4BF' }}>↓ Entrées : <b>{num(histData.filter(m => m.type === 'Entrée').reduce((s, m) => s + m.qty, 0))} {histArt.unite}</b></span>
                  <span style={{ color: '#FB923C' }}>↑ Sorties : <b>{num(histData.filter(m => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0))} {histArt.unite}</b></span>
                  <span className="muted">{histData.length} mouvement{histData.length > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Catalogue articles</div>
          <span className="card-hint">{data.length} articles</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (référence, désignation…)', type: 'text' },
            { key: 'categorie', label: 'Catégorie', type: 'select', options: ['Tous', ...categories] },
            { key: 'lowStock', label: '⚠ Stock bas uniquement', type: 'toggle' },
          ]}
          values={filters} onChange={setF} total={data.length} shown={filteredArticles.length}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th><th>Désignation</th><th>Catégorie</th>
                <th className="mono">Stock</th><th className="mono">P.U.</th>
                <th className="mono">Valeur stock</th><th className="mono">Produit</th>
                <th className="mono">Expédié</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((a) => (
                <tr key={a.ref}>
                  <td className="cell-code">{a.ref}</td>
                  <td>
                    <div className="cell-strong">{a.designation}</div>
                    {a.description && <div className="muted" style={{ fontSize: 11 }}>{a.description}</div>}
                  </td>
                  <td><Pill tone="violet">{a.categorie}</Pill></td>
                  <td className="mono">
                    <span style={{ color: a.lowStock ? '#fbbf24' : 'var(--text)', fontWeight: a.lowStock ? 700 : 400 }}>{num(a.stock)}</span>
                    <span className="muted" style={{ fontSize: 11 }}> {a.unite}</span>
                    {a.lowStock && <div className="muted" style={{ fontSize: 10, color: '#fbbf24' }}>⚠ Min: {a.stock_min}</div>}
                  </td>
                  <td className="mono muted">{a.cout_unitaire} DH</td>
                  <td className="mono cell-strong">{dh(a.stockValue)}</td>
                  <td className="mono muted">{num(a.produced)} {a.unite}</td>
                  <td className="mono muted">{num(a.shipped)} {a.unite}</td>
                  <td>
                    <div className="flex gap" style={{ gap: 5 }}>
                      <button className="btn" style={{ padding: '5px 8px' }} onClick={() => openEdit(a)} title="Modifier"><Pencil size={13} /></button>
                      <button className="btn" style={{ padding: '5px 8px', color: 'var(--teal)' }} onClick={() => openMv(a)} title="Mouvement stock"><ArrowUpFromLine size={13} /></button>
                      <button className="btn" style={{ padding: '5px 8px', color: '#A78BFA' }} onClick={() => openHist(a)} title="Historique"><History size={13} /></button>
                      <button className="btn" style={{ padding: '5px 8px', color: '#ef4444' }} onClick={() => deleteArticle(a)} title="Supprimer"><Trash2 size={13} /></button>
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
