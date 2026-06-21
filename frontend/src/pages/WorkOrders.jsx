import { useState, useEffect } from 'react';
import { Plus, X, Calculator, Pencil, Eye, Package, Users } from 'lucide-react';
import { api, dh } from '../App.jsx';
import {
  Loading, Pill, useFetch, statusTone, typeTone, priorityTone, FilterBar,
} from '../components/Common.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const MACHINES = [
  'DEB-SCI-01', 'DEB-SCI-02', 'PRE-HOT-01', 'PRE-COL-01',
  'FIN-PON-01', 'FIN-DEC-01', 'ENE-CHA-01', 'ENE-CMP-01',
];

const EMPTY_FORM = {
  machine: 'DEB-SCI-01', type: 'Corrective', priority: 'Normale',
  status: 'Planifié', desc: '', laborHours: 2, downtimeHours: 1,
  collaborateurs: [],
};

// Multi-select collaborateurs
function CollabSelect({ collaborateurs, value, onChange }) {
  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };
  return (
    <div className="field">
      <label>Personnel affecté</label>
      <div style={{
        border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        background: 'var(--surface-2)', padding: '8px 10px', display: 'flex',
        flexWrap: 'wrap', gap: 6, minHeight: 42,
      }}>
        {collaborateurs.length === 0 && (
          <span className="muted" style={{ fontSize: 12 }}>Aucun collaborateur paramétré</span>
        )}
        {collaborateurs.map((c) => {
          const sel = value.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 12, cursor: 'pointer',
                border: sel ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: sel ? 'var(--accent-soft)' : 'var(--surface-3)',
                color: sel ? 'var(--accent)' : 'var(--text-muted)',
                fontWeight: sel ? 600 : 400,
              }}
            >
              {c.prenom} {c.nom}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
          {value.length} collaborateur{value.length > 1 ? 's' : ''} sélectionné{value.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default function WorkOrders() {
  const { canDo } = useAuth();
  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.workorders, [reload]);
  const [collabs, setCollabs] = useState([]);
  const [parts, setParts] = useState([]);

  useEffect(() => {
    api.collaborateurs().then(setCollabs).catch(() => setCollabs([]));
    api.parts().then(setParts).catch(() => setParts([]));
  }, []);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Edition OT
  const [editOt, setEditOt] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  // Ajout pièces magasinier — sélection multiple
  const [partsOt, setPartsOt] = useState(null);   // OT cible
  const [partQtys, setPartQtys] = useState({});   // { ref: qty } pour chaque pièce saisie
  const [partSaving, setPartSaving] = useState(false);
  const [partErr, setPartErr] = useState('');

  const refresh = () => setReload((r) => r + 1);

  const submit = async () => {
    setSaving(true);
    try {
      await api.createWorkorder({ ...form, status: 'Planifié', parts: [] });
      setOpen(false);
      refresh();
      setForm((f) => ({ ...f, desc: '', collaborateurs: [] }));
    } finally { setSaving(false); }
  };

  const openEdit = (ot) => {
    setEditOt(ot);
    setEditForm({
      machine: ot.machine, type: ot.type, priority: ot.priority,
      status: ot.status, desc: ot.desc, laborHours: ot.laborHours,
      downtimeHours: ot.downtimeHours,
      collaborateurs: Array.isArray(ot.collaborateurs) ? [...ot.collaborateurs] : [],
    });
  };

  const submitEdit = async () => {
    setEditSaving(true);
    try {
      await api.updateWorkorder(editOt.id, { ...editForm, parts: editOt.parts || [] });
      setEditOt(null);
      refresh();
    } finally { setEditSaving(false); }
  };

  const openParts = (ot) => {
    setPartsOt(ot);
    setPartQtys({});
    setPartErr('');
  };

  const submitParts = async () => {
    const selected = Object.entries(partQtys).filter(([, q]) => Number(q) > 0);
    if (selected.length === 0) { setPartErr('Saisissez une quantité pour au moins une pièce'); return; }
    setPartSaving(true); setPartErr('');
    try {
      for (const [ref, qty] of selected) {
        await api.addPartToWorkorder(partsOt.id, { ref, qty: Number(qty) });
      }
      setPartsOt(null);
      refresh();
    } catch (e) { setPartErr(e.message); }
    finally { setPartSaving(false); }
  };

  const [filters, setFilters] = useState({ q: '', type: 'Tous', status: 'Tous', priority: 'Tous' });
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  if (!data) return <Loading />;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const filtered = data.filter((o) => {
    if (filters.type !== 'Tous' && o.type !== filters.type) return false;
    if (filters.status !== 'Tous' && o.status !== filters.status) return false;
    if (filters.priority !== 'Tous' && o.priority !== filters.priority) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return o.id.toLowerCase().includes(q) || o.machineName?.toLowerCase().includes(q) || o.desc?.toLowerCase().includes(q);
    }
    return true;
  });
  const setE = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const colName = (id) => {
    const c = collabs.find((x) => x.id === id);
    return c ? `${c.prenom} ${c.nom}` : id;
  };

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5, maxWidth: 620 }}>
          Chaque ordre de travail est <b style={{ color: 'var(--text)' }}>valorisé automatiquement</b> :
          main d'œuvre (heures × taux) + pièces (nomenclature) + coût d'arrêt (heures × coût horaire machine).
        </p>
        {canDo('workorders', 'create') && (
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={17} /> Nouvel OT
          </button>
        )}
      </div>

      {/* Formulaire création */}
      {open && canDo('workorders', 'create') && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <div className="card-head">
            <div className="card-title">Créer un ordre de travail</div>
            <button className="btn" onClick={() => setOpen(false)} style={{ padding: '7px 10px' }}><X size={16} /></button>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Machine</label>
              <select className="select" value={form.machine} onChange={set('machine')}>
                {MACHINES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="row-2">
              <div className="field">
                <label>Type</label>
                <select className="select" value={form.type} onChange={set('type')}>
                  <option>Corrective</option><option>Préventive</option>
                </select>
              </div>
              <div className="field">
                <label>Priorité</label>
                <select className="select" value={form.priority} onChange={set('priority')}>
                  <option>Urgente</option><option>Normale</option><option>Faible</option>
                </select>
              </div>
            </div>
          </div>
          <CollabSelect
            collaborateurs={collabs}
            value={form.collaborateurs}
            onChange={(v) => setForm((f) => ({ ...f, collaborateurs: v }))}
          />
          <div className="field">
            <label>Description de l'intervention</label>
            <input className="input" value={form.desc} onChange={set('desc')}
              placeholder="Ex : remplacement roulement broche" />
          </div>
          <div className="row-2">
            <div className="field">
              <label>Heures main d'œuvre</label>
              <input className="input mono" type="number" step="0.5" value={form.laborHours} onChange={set('laborHours')} />
            </div>
            <div className="field">
              <label>Heures d'arrêt production</label>
              <input className="input mono" type="number" step="0.5" value={form.downtimeHours} onChange={set('downtimeHours')} />
            </div>
          </div>
          <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn" onClick={() => setOpen(false)}>Annuler</button>
            <button className="btn btn-primary" onClick={submit} disabled={saving}>
              <Calculator size={16} /> {saving ? 'Calcul…' : 'Créer & valoriser'}
            </button>
          </div>
        </div>
      )}

      {/* Modal modification / consultation OT */}
      {editOt && (() => {
        const ro = !canDo('workorders', 'edit');
        return (
          <div className="overlay" onClick={() => setEditOt(null)}>
            <div className="modal" style={{ maxWidth: 580, maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="card-head" style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                <div className="card-title">{ro ? 'Consulter' : 'Modifier'} {editOt.id}</div>
                <button className="btn" onClick={() => setEditOt(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '0 22px 22px' }}>
                <div className="row-2" style={{ marginTop: 16 }}>
                  <div className="field">
                    <label>Machine</label>
                    <select className="select" value={editForm.machine} onChange={setE('machine')} disabled={ro}>
                      {MACHINES.map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Statut</label>
                    <select className="select" value={editForm.status} onChange={setE('status')} disabled={ro}>
                      <option>Planifié</option><option>En cours</option><option>Clôturé</option>
                    </select>
                  </div>
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Type</label>
                    <select className="select" value={editForm.type} onChange={setE('type')} disabled={ro}>
                      <option>Corrective</option><option>Préventive</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Priorité</label>
                    <select className="select" value={editForm.priority} onChange={setE('priority')} disabled={ro}>
                      <option>Urgente</option><option>Normale</option><option>Faible</option>
                    </select>
                  </div>
                </div>
                <CollabSelect
                  collaborateurs={collabs}
                  value={editForm.collaborateurs || []}
                  onChange={(v) => !ro && setEditForm((f) => ({ ...f, collaborateurs: v }))}
                  readOnly={ro}
                />
                <div className="field">
                  <label>Description de l'intervention</label>
                  <input className="input" value={editForm.desc} onChange={setE('desc')} disabled={ro} />
                </div>
                <div className="row-2">
                  <div className="field">
                    <label>Heures main d'œuvre</label>
                    <input className="input mono" type="number" step="0.5"
                      value={editForm.laborHours} onChange={setE('laborHours')} disabled={ro} />
                  </div>
                  <div className="field">
                    <label>Heures d'arrêt production</label>
                    <input className="input mono" type="number" step="0.5"
                      value={editForm.downtimeHours} onChange={setE('downtimeHours')} disabled={ro} />
                  </div>
                </div>
                {editOt.partsDetail && editOt.partsDetail.length > 0 && (
                  <div className="field">
                    <label>Pièces consommées (ajoutées par le magasinier)</label>
                    <div style={{ background: 'var(--surface-3)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                      {editOt.partsDetail.map((p) => (
                        <div key={p.ref} className="flex between" style={{ fontSize: 13, padding: '3px 0' }}>
                          <span>{p.name}</span>
                          <span className="mono muted">{p.qty} × {p.unitPrice} DH = <b>{dh(p.total)}</b></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                  <button className="btn" onClick={() => setEditOt(null)}>{ro ? 'Fermer' : 'Annuler'}</button>
                  {!ro && (
                    <button className="btn btn-primary" onClick={submitEdit} disabled={editSaving}>
                      <Calculator size={16} /> {editSaving ? 'Calcul…' : 'Enregistrer & revaloriser'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal ajout pièces (magasinier) — sélection multiple */}
      {partsOt && (() => {
        const alreadyRefs = new Set((partsOt.parts || []).map((p) => p.ref));
        const totalNew = Object.entries(partQtys).reduce((s, [ref, q]) => {
          const p = parts.find((x) => x.ref === ref);
          return s + (p ? p.price * Number(q || 0) : 0);
        }, 0);
        const nbSelected = Object.values(partQtys).filter((q) => Number(q) > 0).length;
        return (
          <div className="overlay" onClick={() => setPartsOt(null)}>
            <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}>

              {/* En-tête fixe */}
              <div className="card-head" style={{ flexShrink: 0 }}>
                <div>
                  <div className="card-title">Consommation pièces — {partsOt.id}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{partsOt.machineName} · {partsOt.desc}</div>
                </div>
                <button className="btn" onClick={() => setPartsOt(null)} style={{ padding: '7px 10px' }}><X size={16} /></button>
              </div>

              {/* Pièces déjà consommées (lecture seule) */}
              {partsOt.partsDetail && partsOt.partsDetail.length > 0 && (
                <div style={{ padding: '12px 22px 0', flexShrink: 0 }}>
                  <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    Pièces déjà enregistrées
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {partsOt.partsDetail.map((p) => (
                      <span key={p.ref} style={{
                        background: 'var(--surface-3)', border: '1px solid var(--border)',
                        borderRadius: 6, padding: '3px 10px', fontSize: 12,
                      }}>
                        {p.name} <span className="mono" style={{ color: 'var(--accent)' }}>×{p.qty}</span>
                        <span className="muted"> · {dh(p.total)}</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', marginBottom: 0 }} />
                </div>
              )}

              {/* Tableau des pièces disponibles — scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 0' }}>
                <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                  Saisissez les quantités souhaitées. Laissez vide (ou 0) pour ne pas inclure la pièce.
                </div>
                {partErr && <div className="banner banner-error" style={{ marginBottom: 10 }}>{partErr}</div>}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>RÉFÉRENCE</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>DÉSIGNATION</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CATÉG.</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>STOCK</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>P.U.</th>
                      <th style={{ textAlign: 'center', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>QTÉ</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SOUS-TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((p) => {
                      const qty = Number(partQtys[p.ref] || 0);
                      const selected = qty > 0;
                      const subtotal = selected ? p.price * qty : 0;
                      const noStock = p.stock <= 0;
                      return (
                        <tr key={p.ref} style={{
                          borderBottom: '1px solid var(--border)',
                          background: selected ? 'rgba(var(--accent-rgb, 255,100,40), 0.07)' : 'transparent',
                          opacity: noStock ? 0.45 : 1,
                        }}>
                          <td className="cell-code" style={{ padding: '8px', fontSize: 11 }}>{p.ref}</td>
                          <td style={{ padding: '8px', fontSize: 13 }}>
                            <div style={{ fontWeight: selected ? 600 : 400 }}>{p.name}</div>
                            {alreadyRefs.has(p.ref) && (
                              <div style={{ fontSize: 10, color: 'var(--teal)' }}>déjà sur cet OT</div>
                            )}
                          </td>
                          <td style={{ padding: '8px', fontSize: 11 }} className="muted">{p.category}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }} className="mono">
                            <span style={{ color: p.stock <= p.stockMin ? '#fbbf24' : 'var(--text)' }}>
                              {p.stock}
                            </span>
                            <span className="muted" style={{ fontSize: 10 }}> {p.unit}</span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontSize: 12 }} className="mono muted">
                            {p.price} DH
                          </td>
                          <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                            <input
                              type="number" min="0" max={p.stock}
                              value={partQtys[p.ref] || ''}
                              disabled={noStock}
                              placeholder="0"
                              onChange={(e) => setPartQtys((q) => ({ ...q, [p.ref]: e.target.value }))}
                              style={{
                                width: 64, textAlign: 'center',
                                background: 'var(--surface-2)', border: '1px solid var(--border)',
                                borderRadius: 6, padding: '4px 6px', color: 'var(--text)',
                                fontFamily: 'var(--font-mono)', fontSize: 13,
                                borderColor: selected ? 'var(--accent)' : 'var(--border)',
                              }}
                            />
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right' }} className="mono">
                            {selected ? <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{dh(subtotal)}</span> : <span className="muted">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pied fixe avec total + bouton */}
              <div style={{
                flexShrink: 0, padding: '14px 22px',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  {nbSelected > 0
                    ? <span style={{ fontSize: 13 }}>
                        <b style={{ color: 'var(--accent)' }}>{nbSelected} pièce{nbSelected > 1 ? 's' : ''}</b> sélectionnée{nbSelected > 1 ? 's' : ''} · Total : <b className="mono">{dh(totalNew)}</b>
                      </span>
                    : <span className="muted" style={{ fontSize: 13 }}>Aucune pièce sélectionnée</span>
                  }
                </div>
                <div className="flex gap">
                  <button className="btn" onClick={() => setPartsOt(null)}>Fermer</button>
                  <button className="btn btn-primary" onClick={submitParts} disabled={partSaving || nbSelected === 0}>
                    <Package size={16} /> {partSaving ? 'Enregistrement…' : `Valider ${nbSelected > 0 ? `(${nbSelected})` : ''}`}
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      <div className="card">
        <div className="card-head">
          <div className="card-title">Tous les ordres de travail</div>
          <span className="card-hint">{data.length} OT</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (OT, machine, description…)', type: 'text' },
            { key: 'type', label: 'Type', type: 'select', options: ['Tous', 'Corrective', 'Préventive'] },
            { key: 'status', label: 'Statut', type: 'select', options: ['Tous', 'Planifié', 'En cours', 'Clôturé'] },
            { key: 'priority', label: 'Priorité', type: 'select', options: ['Tous', 'Urgente', 'Normale', 'Faible'] },
          ]}
          values={filters} onChange={setF} total={data.length} shown={filtered.length}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>OT</th><th>Machine</th><th>Personnel</th><th>Type</th><th>Priorité</th><th>Statut</th>
                <th className="mono">M.O.</th><th className="mono">Pièces</th>
                <th className="mono">Arrêt</th><th className="mono">Total</th><th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}>
                  <td className="cell-code">{o.id}</td>
                  <td>
                    <div className="cell-strong">{o.machineName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{o.desc}</div>
                  </td>
                  <td style={{ maxWidth: 160 }}>
                    {Array.isArray(o.collaborateurs) && o.collaborateurs.length > 0
                      ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {o.collaborateurs.map((id) => (
                            <span key={id} className="pill pill-teal" style={{ fontSize: 11 }}>
                              {colName(id)}
                            </span>
                          ))}
                        </div>
                      )
                      : <span className="muted" style={{ fontSize: 12 }}>—</span>
                    }
                  </td>
                  <td><Pill tone={typeTone(o.type)}>{o.type}</Pill></td>
                  <td><Pill tone={priorityTone(o.priority)}>{o.priority}</Pill></td>
                  <td><Pill tone={statusTone(o.status)}>{o.status}</Pill></td>
                  <td className="mono">{dh(o.laborCost)}</td>
                  <td className="mono">{dh(o.partsCost)}</td>
                  <td className="mono" style={{ color: '#fbbf24' }}>{dh(o.downtimeCost)}</td>
                  <td className="mono cell-strong">{dh(o.totalCost)}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{o.date}</td>
                  <td>
                    <div className="flex gap" style={{ gap: 4 }}>
                      <button className="btn" style={{ padding: '5px 8px' }} onClick={() => openEdit(o)}
                        title={canDo('workorders', 'edit') ? 'Modifier cet OT' : 'Consulter cet OT'}>
                        {canDo('workorders', 'edit') ? <Pencil size={14} /> : <Eye size={14} />}
                      </button>
                      {canDo('workorders', 'add_parts') && (
                        <button className="btn" style={{ padding: '5px 8px', color: 'var(--teal)' }}
                          onClick={() => openParts(o)} title="Ajouter pièces consommées (magasinier)">
                          <Package size={14} />
                        </button>
                      )}
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
