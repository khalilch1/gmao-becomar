import { useState, useEffect } from 'react';
import {
  AlertCircle, PackageCheck, Boxes, Wallet, TriangleAlert, History,
  Pencil, Lock, X, ArrowDownToLine, ArrowUpFromLine, Plus, ArrowRightLeft,
} from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, KpiCard } from '../components/Common.jsx';

const MOTIFS = {
  Entrée: ['Réception fournisseur', 'Retour atelier', 'Ajustement inventaire', 'Régularisation'],
  Sortie: ['Consommation OT', 'Sortie atelier', 'Rebut', 'Ajustement inventaire'],
};
const today = () => new Date().toISOString().slice(0, 10);

export default function Parts() {
  const [parts, setParts] = useState(null);
  const [recent, setRecent] = useState([]);
  const [editing, setEditing] = useState(null);   // pièce en cours de modif
  const [creating, setCreating] = useState(false); // modal création
  const [stockFor, setStockFor] = useState(null); // pièce en cours de gestion stock

  const load = () => {
    api.parts().then(setParts);
    api.movements().then((m) => setRecent(m.slice(0, 8)));
  };
  useEffect(load, []);

  if (!parts) return <Loading />;

  const stockValue = parts.reduce((s, p) => s + p.stockValue, 0);
  const lowCount = parts.filter((p) => p.lowStock).length;

  return (
    <div className="page">
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard icon={Boxes} label="Références en nomenclature" value={parts.length} color="#2dd4bf"
          delta="Articles + prix + stock" deltaDir="up" />
        <KpiCard icon={Wallet} label="Valeur du stock" value={num(stockValue)} unit="DH" color="#a78bfa"
          delta="Immobilisation pièces" deltaDir="up" />
        <KpiCard icon={TriangleAlert} label="Alertes stock bas" value={lowCount} color="#fb7185"
          delta="Sous le seuil minimum" deltaDir="down" />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Nomenclature des pièces de rechange</div>
            <span className="card-hint">Stock géré uniquement par mouvements (entrées / sorties)</span>
          </div>
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setCreating(true)}>
            <Plus size={16} /> Créer une pièce
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Référence</th><th>Désignation</th><th>Catégorie</th>
                <th className="mono">Prix unit.</th><th className="mono">Stock</th>
                <th className="mono">Seuil min.</th><th className="mono">Valeur</th>
                <th>État</th><th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.ref}>
                  <td className="cell-code">{p.ref}</td>
                  <td className="cell-strong">{p.name}</td>
                  <td><Pill tone="violet">{p.category}</Pill></td>
                  <td className="mono">{dh(p.price)}</td>
                  <td className="mono cell-strong">{p.stock} {p.unit}</td>
                  <td className="mono muted">{p.stockMin} {p.unit}</td>
                  <td className="mono">{dh(p.stockValue)}</td>
                  <td>
                    {p.lowStock ? (
                      <Pill tone="bad"><AlertCircle size={13} /> À réappro.</Pill>
                    ) : (
                      <Pill tone="good"><PackageCheck size={13} /> OK</Pill>
                    )}
                  </td>
                  <td>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="link-btn" onClick={() => setStockFor(p)}>
                        <ArrowRightLeft size={15} /> Mouvements
                      </button>
                      <button className="icon-btn" title="Modifier la fiche" onClick={() => setEditing(p)}>
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Derniers mouvements de stock</div>
          <span className="card-hint">Historique entrées / sorties</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mvt</th><th>Date</th><th>Pièce</th><th>Type</th>
                <th>Motif</th><th>Réf.</th><th className="mono">Qté</th>
                <th className="mono">Stock après</th><th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => {
                const part = parts.find((p) => p.ref === m.ref);
                const isIn = m.type === 'Entrée';
                return (
                  <tr key={m.id}>
                    <td className="cell-code">{m.id}</td>
                    <td className="muted mono" style={{ fontSize: 12 }}>{m.date}</td>
                    <td className="cell-strong">{part ? part.name : m.ref}</td>
                    <td>
                      <Pill tone={isIn ? 'good' : 'orange'}>
                        {isIn ? <ArrowDownToLine size={12} /> : <ArrowUpFromLine size={12} />} {m.type}
                      </Pill>
                    </td>
                    <td>{m.motif}</td>
                    <td className="cell-code">{m.reference || '—'}</td>
                    <td className="mono cell-strong" style={{ color: isIn ? 'var(--good)' : 'var(--accent)' }}>
                      {isIn ? '+' : '−'}{m.qty}
                    </td>
                    <td className="mono">{m.stockAfter}</td>
                    <td className="muted" style={{ fontSize: 12.5 }}>{m.user}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <CreatePartModal onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); load(); }} />
      )}
      {editing && (
        <EditPartModal part={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }} />
      )}
      {stockFor && (
        <StockDrawer part={stockFor} onClose={() => setStockFor(null)} onChanged={load} />
      )}
    </div>
  );
}

/* ---------- Modal création pièce ---------- */
function CreatePartModal({ onClose, onSaved }) {
  const [f, setF] = useState({
    ref: '', name: '', category: 'Mécanique', price: 0,
    unit: 'pc', stockMin: 0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setErr(null);
    if (!f.ref.trim()) {
      setErr('La référence est obligatoire');
      return;
    }
    if (!f.name.trim()) {
      setErr('La désignation est obligatoire');
      return;
    }
    setSaving(true);
    try {
      await api.createPart({
        ref: f.ref.toUpperCase(),
        name: f.name,
        category: f.category,
        price: Number(f.price) || 0,
        unit: f.unit,
        stockMin: Number(f.stockMin) || 0,
      });
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>Créer une nouvelle pièce</h3>
            <div className="sub">Ajouter à la nomenclature</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          {err && <div className="err-banner">{err}</div>}
          <div className="field">
            <label>Référence (code unique)</label>
            <input className="input" placeholder="EX: MEC-001" value={f.ref} onChange={set('ref')} />
          </div>
          <div className="field">
            <label>Désignation</label>
            <input className="input" placeholder="Ex: Roulement 6204" value={f.name} onChange={set('name')} />
          </div>
          <div className="row-2">
            <div className="field">
              <label>Catégorie</label>
              <select className="select" value={f.category} onChange={set('category')}>
                {['Mécanique', 'Transmission', 'Outillage', 'Consommable', 'Lubrifiant',
                  'Hydraulique', 'Électrique', 'Instrumentation'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Unité</label>
              <select className="select" value={f.unit} onChange={set('unit')}>
                {['pc', 'kit', 'L', 'kg', 'm'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Prix unitaire (DH)</label>
              <input className="input mono" type="number" min="0" step="0.01" value={f.price} onChange={set('price')} />
            </div>
            <div className="field">
              <label>Seuil minimum ({f.unit})</label>
              <input className="input mono" type="number" min="0" value={f.stockMin} onChange={set('stockMin')} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Création…' : 'Créer la pièce'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Modal modification fiche (SANS champ stock) ---------- */
function EditPartModal({ part, onClose, onSaved }) {
  const [f, setF] = useState({
    name: part.name, category: part.category, price: part.price,
    unit: part.unit, stockMin: part.stockMin,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updatePart(part.ref, f);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>Modifier la fiche pièce</h3>
            <div className="sub">{part.ref}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Désignation</label>
            <input className="input" value={f.name} onChange={set('name')} />
          </div>
          <div className="row-2">
            <div className="field">
              <label>Catégorie</label>
              <select className="select" value={f.category} onChange={set('category')}>
                {['Mécanique', 'Transmission', 'Outillage', 'Consommable', 'Lubrifiant',
                  'Hydraulique', 'Électrique', 'Instrumentation'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Unité</label>
              <select className="select" value={f.unit} onChange={set('unit')}>
                {['pc', 'kit', 'L', 'kg', 'm'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Prix unitaire (DH)</label>
              <input className="input mono" type="number" min="0" value={f.price} onChange={set('price')} />
            </div>
            <div className="field">
              <label>Seuil minimum ({f.unit})</label>
              <input className="input mono" type="number" min="0" value={f.stockMin} onChange={set('stockMin')} />
            </div>
          </div>

          {/* Stock NON modifiable ici */}
          <label style={{ fontSize: 12.5, color: 'var(--text-dim)', display: 'block', marginBottom: 7, fontWeight: 500 }}>
            Stock courant
          </label>
          <div className="locked-field">
            <span className="lv">{part.stock} {part.unit}</span>
            <Lock size={15} color="var(--text-muted)" />
          </div>
          <div className="lock-note">
            <Lock size={13} />
            Le stock ne se modifie pas ici — utilisez « Mouvements » (entrée / sortie) pour le faire évoluer de façon tracée.
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Panneau gestion du stock + historique ---------- */
function StockDrawer({ part, onClose, onChanged }) {
  const [moves, setMoves] = useState(null);
  const [cur, setCur] = useState(part.stock);
  const [type, setType] = useState('Entrée');
  const [f, setF] = useState({ qty: 1, motif: 'Réception fournisseur', reference: '', date: today(), user: 'Magasin' });
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => api.partMovements(part.ref).then(setMoves);
  useEffect(refresh, [part.ref]);

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const switchType = (t) => {
    setType(t);
    setF((s) => ({ ...s, motif: MOTIFS[t][0] }));
    setErr(null);
  };

  const submit = async () => {
    setErr(null);
    setSaving(true);
    try {
      const res = await api.createMovement({ ref: part.ref, type, ...f, qty: Number(f.qty) });
      setCur(res.part.stock);
      setF((s) => ({ ...s, qty: 1, reference: '' }));
      await refresh();
      onChanged();
    } catch (e) {
      setErr(e.message);
    } finally { setSaving(false); }
  };

  const totalIn = (moves || []).filter((m) => m.type === 'Entrée').reduce((s, m) => s + m.qty, 0);
  const totalOut = (moves || []).filter((m) => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head">
          <div>
            <h3>Mouvements de stock</h3>
            <div className="sub">{part.ref} · {part.name}</div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="drawer-body">
          <div className="mv-stat" style={{ marginTop: 18 }}>
            <div className="box">
              <div className="l">Stock courant</div>
              <div className="v" style={{ color: cur < part.stockMin ? 'var(--bad)' : 'var(--text)' }}>
                {cur} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{part.unit}</span>
              </div>
            </div>
            <div className="box">
              <div className="l">Total entrées</div>
              <div className="v" style={{ color: 'var(--good)' }}>+{totalIn}</div>
            </div>
            <div className="box">
              <div className="l">Total sorties</div>
              <div className="v" style={{ color: 'var(--accent)' }}>−{totalOut}</div>
            </div>
          </div>

          {/* Formulaire nouveau mouvement */}
          <div className="card" style={{ padding: 16, marginBottom: 20 }}>
            <div className="card-title" style={{ fontSize: 14, marginBottom: 14 }}>Nouveau mouvement</div>
            {err && <div className="err-banner">{err}</div>}
            <div className="seg" style={{ marginBottom: 14 }}>
              <button className={`seg-btn ${type === 'Entrée' ? 'on-in' : ''}`} onClick={() => switchType('Entrée')}>
                <ArrowDownToLine size={16} /> Entrée
              </button>
              <button className={`seg-btn ${type === 'Sortie' ? 'on-out' : ''}`} onClick={() => switchType('Sortie')}>
                <ArrowUpFromLine size={16} /> Sortie
              </button>
            </div>
            <div className="row-2">
              <div className="field">
                <label>Quantité ({part.unit})</label>
                <input className="input mono" type="number" min="1" value={f.qty} onChange={set('qty')} />
              </div>
              <div className="field">
                <label>Date</label>
                <input className="input mono" type="date" value={f.date} onChange={set('date')} />
              </div>
            </div>
            <div className="field">
              <label>Motif</label>
              <select className="select" value={f.motif} onChange={set('motif')}>
                {MOTIFS[type].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="row-2">
              <div className="field">
                <label>Référence (BL, OT…)</label>
                <input className="input" value={f.reference} onChange={set('reference')} placeholder="Ex : BL-3500" />
              </div>
              <div className="field">
                <label>Auteur</label>
                <input className="input" value={f.user} onChange={set('user')} />
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
              onClick={submit} disabled={saving}>
              <Plus size={16} /> {saving ? 'Enregistrement…' : `Valider ${type.toLowerCase()}`}
            </button>
          </div>

          {/* Historique */}
          <div className="flex between" style={{ marginBottom: 6 }}>
            <div className="card-title" style={{ fontSize: 14 }}>
              <History size={15} style={{ verticalAlign: -2, marginRight: 6 }} />
              Historique
            </div>
            <span className="card-hint">{moves ? moves.length : 0} mouvements</span>
          </div>
          {!moves ? (
            <div className="muted mono" style={{ padding: 14, fontSize: 13 }}>Chargement…</div>
          ) : (
            moves.map((m) => {
              const isIn = m.type === 'Entrée';
              return (
                <div className="mv-row" key={m.id}>
                  <div className={`mv-ic ${isIn ? 'in' : 'out'}`}>
                    {isIn ? <ArrowDownToLine size={17} /> : <ArrowUpFromLine size={17} />}
                  </div>
                  <div className="mv-main">
                    <div className="mv-motif">{m.motif}</div>
                    <div className="mv-meta">{m.date} · {m.id}{m.reference ? ` · ${m.reference}` : ''} · {m.user}</div>
                  </div>
                  <div className="mv-qty" style={{ color: isIn ? 'var(--good)' : 'var(--accent)' }}>
                    {isIn ? '+' : '−'}{m.qty} {part.unit}
                    <span className="after">stock : {m.stockAfter}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
