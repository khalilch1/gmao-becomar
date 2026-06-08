import { useState, useEffect } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Plus, X, AlertCircle, CheckCircle2,
  History, Boxes, TrendingUp, TrendingDown,
} from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, KpiCard, useFetch } from '../components/Common.jsx';

const MOTIFS = {
  Entrée: ['Réception fournisseur', 'Retour atelier', 'Ajustement inventaire', 'Régularisation'],
  Sortie: ['Consommation OT', 'Sortie atelier', 'Rebut', 'Ajustement inventaire'],
};

const today = () => new Date().toISOString().slice(0, 10);

export default function StockMovements() {
  const { data: parts } = useFetch(api.parts);
  const [movements, setMovements] = useState(null);
  const [showNewMove, setShowNewMove] = useState(false);
  const [filterRef, setFilterRef] = useState('');

  const load = () => api.movements().then(setMovements);

  useEffect(() => {
    load();
  }, []);

  if (!parts || !movements) return <Loading />;

  const totalIn = movements.filter((m) => m.type === 'Entrée').reduce((s, m) => s + m.qty, 0);
  const totalOut = movements.filter((m) => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0);
  const filtered = filterRef
    ? movements.filter((m) => m.ref === filterRef)
    : movements.slice(0, 50);

  return (
    <div className="page">
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard
          icon={ArrowDownToLine}
          label="Total entrées"
          value={num(totalIn)}
          unit="unités"
          color="#10b981"
          delta="Mouvements cumulés"
          deltaDir="up"
        />
        <KpiCard
          icon={ArrowUpFromLine}
          label="Total sorties"
          value={num(totalOut)}
          unit="unités"
          color="#ef4444"
          delta="Mouvements cumulés"
          deltaDir="down"
        />
        <KpiCard
          icon={Boxes}
          label="Pièces en nomenclature"
          value={parts.length}
          color="#3b82f6"
          delta="Références actives"
          deltaDir="up"
        />
      </div>

      <div className="card">
        <div className="card-head">
          <div>
            <div className="card-title">Créer un mouvement de stock</div>
            <span className="card-hint">Enregistrer une entrée ou sortie de pièces</span>
          </div>
          <button className="btn btn-primary" style={{ gap: 8 }} onClick={() => setShowNewMove(true)}>
            <Plus size={16} /> Nouveau mouvement
          </button>
        </div>

        {showNewMove && (
          <NewMovementForm
            parts={parts}
            onClose={() => setShowNewMove(false)}
            onSaved={() => {
              setShowNewMove(false);
              load();
            }}
          />
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Historique des mouvements</div>
          <span className="card-hint">{movements.length} mouvements enregistrés</span>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Filtrer par pièce</label>
            <select
              className="select"
              value={filterRef}
              onChange={(e) => setFilterRef(e.target.value)}
            >
              <option value="">Toutes les pièces</option>
              {parts.map((p) => (
                <option key={p.ref} value={p.ref}>
                  {p.ref} · {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Pièce</th>
                <th>Type</th>
                <th>Motif</th>
                <th className="mono">Quantité</th>
                <th className="mono">Stock après</th>
                <th>Référence</th>
                <th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="muted" style={{ textAlign: 'center', padding: 20 }}>
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const part = parts.find((p) => p.ref === m.ref);
                  const isIn = m.type === 'Entrée';
                  return (
                    <tr key={m.id}>
                      <td className="muted mono" style={{ fontSize: 12 }}>
                        {m.date}
                      </td>
                      <td className="cell-strong">{part ? part.name : m.ref}</td>
                      <td>
                        <Pill tone={isIn ? 'good' : 'orange'}>
                          {isIn ? (
                            <ArrowDownToLine size={12} />
                          ) : (
                            <ArrowUpFromLine size={12} />
                          )}
                          {' '}
                          {m.type}
                        </Pill>
                      </td>
                      <td>{m.motif}</td>
                      <td
                        className="mono cell-strong"
                        style={{ color: isIn ? 'var(--good)' : 'var(--accent)' }}
                      >
                        {isIn ? '+' : '−'}
                        {m.qty}
                        {part ? ` ${part.unit}` : ''}
                      </td>
                      <td className="mono">{m.stockAfter}</td>
                      <td className="cell-code">{m.reference || '—'}</td>
                      <td className="muted" style={{ fontSize: 12.5 }}>
                        {m.user}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Formulaire création mouvement ---------- */
function NewMovementForm({ parts, onClose, onSaved }) {
  const [type, setType] = useState('Entrée');
  const [lines, setLines] = useState([
    { ref: parts.length > 0 ? parts[0].ref : '', qty: 1 },
  ]);
  const [common, setCommon] = useState({
    motif: 'Réception fournisseur',
    reference: '',
    date: today(),
    user: 'Magasin',
  });
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const switchType = (t) => {
    setType(t);
    setCommon((s) => ({ ...s, motif: MOTIFS[t][0] }));
    setErr(null);
  };

  const addLine = () => {
    setLines((l) => [...l, { ref: parts.length > 0 ? parts[0].ref : '', qty: 1 }]);
  };

  const removeLine = (idx) => {
    if (lines.length > 1) {
      setLines((l) => l.filter((_, i) => i !== idx));
    }
  };

  const updateLine = (idx, key, value) => {
    setLines((l) => {
      const copy = [...l];
      copy[idx] = { ...copy[idx], [key]: value };
      return copy;
    });
  };

  const setCommonField = (k) => (e) => setCommon((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    setErr(null);

    // Validation
    const validLines = lines.filter((l) => l.ref && l.qty > 0);
    if (validLines.length === 0) {
      setErr('Ajoutez au moins une pièce avec une quantité > 0');
      return;
    }
    if (validLines.length !== lines.length) {
      setErr('Vérifiez que toutes les lignes ont une pièce et une quantité');
      return;
    }

    setSaving(true);
    try {
      // Créer tous les mouvements en parallèle
      await Promise.all(
        validLines.map((line) =>
          api.createMovement({
            ref: line.ref,
            type,
            qty: Number(line.qty),
            ...common,
          })
        )
      );
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 20, backgroundColor: '#f9fafb', borderLeft: '4px solid #3b82f6' }}>
      <div className="card-title" style={{ fontSize: 14, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Nouveau mouvement de stock</span>
        <button className="icon-btn" onClick={onClose} style={{ padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {err && (
        <div className="err-banner" style={{ marginBottom: 14 }}>
          <AlertCircle size={14} style={{ marginRight: 8 }} />
          {err}
        </div>
      )}

      {/* Type selector */}
      <div className="seg" style={{ marginBottom: 14 }}>
        <button
          className={`seg-btn ${type === 'Entrée' ? 'on-in' : ''}`}
          onClick={() => switchType('Entrée')}
        >
          <ArrowDownToLine size={16} /> Entrée
        </button>
        <button
          className={`seg-btn ${type === 'Sortie' ? 'on-out' : ''}`}
          onClick={() => switchType('Sortie')}
        >
          <ArrowUpFromLine size={16} /> Sortie
        </button>
      </div>

      {/* Pièces - Multiple lines */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ marginBottom: 0 }}>Pièces de rechange</label>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: 12, gap: 4 }}
            onClick={addLine}
          >
            <Plus size={14} /> Ajouter une pièce
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lines.map((line, idx) => {
            const part = parts.find((p) => p.ref === line.ref);
            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px auto',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: 10,
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                }}
              >
                <div>
                  <select
                    className="select"
                    value={line.ref}
                    onChange={(e) => updateLine(idx, 'ref', e.target.value)}
                    style={{ marginBottom: 6 }}
                  >
                    {parts.map((p) => (
                      <option key={p.ref} value={p.ref}>
                        {p.ref} · {p.name}
                      </option>
                    ))}
                  </select>
                  {part && (
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      Stock: <b>{part.stock} {part.unit}</b> · Seuil: {part.stockMin} {part.unit}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    className="input mono"
                    type="number"
                    min="1"
                    value={line.qty}
                    onChange={(e) => updateLine(idx, 'qty', Number(e.target.value))}
                    placeholder="Qté"
                    style={{ marginBottom: 6 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                    {part ? part.unit : 'unités'}
                  </div>
                </div>

                <button
                  className="icon-btn"
                  onClick={() => removeLine(idx)}
                  disabled={lines.length === 1}
                  style={{ padding: 6, opacity: lines.length === 1 ? 0.5 : 1, cursor: lines.length === 1 ? 'not-allowed' : 'pointer' }}
                  title={lines.length === 1 ? 'Vous devez avoir au moins une pièce' : 'Supprimer cette pièce'}
                >
                  <X size={16} color="var(--bad)" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Motif, Date, Référence, Auteur */}
      <div style={{ marginBottom: 12 }}>
        <div className="field" style={{ marginBottom: 12 }}>
          <label>Motif</label>
          <select className="select" value={common.motif} onChange={setCommonField('motif')}>
            {MOTIFS[type].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="row-2" style={{ marginBottom: 12 }}>
          <div className="field">
            <label>Date</label>
            <input
              className="input mono"
              type="date"
              value={common.date}
              onChange={setCommonField('date')}
            />
          </div>
          <div className="field">
            <label>Référence (BL, OT…)</label>
            <input
              className="input"
              value={common.reference}
              onChange={setCommonField('reference')}
              placeholder="Ex : BL-3500"
            />
          </div>
        </div>

        <div className="field">
          <label>Auteur</label>
          <input className="input" value={common.user} onChange={setCommonField('user')} />
        </div>
      </div>

      {/* Action buttons */}
      <div className="row-2">
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Enregistrement…' : `Enregistrer ${lines.length} ligne(s)`}
        </button>
      </div>
    </div>
  );
}
