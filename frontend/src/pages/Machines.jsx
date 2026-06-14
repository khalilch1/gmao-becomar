import { useState, useEffect } from 'react';
import { ChevronRight, BarChart3, X } from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, Pill, useFetch, FilterBar } from '../components/Common.jsx';

const critTone = (c) => (c === 'Critique' ? 'bad' : c === 'Majeure' ? 'amber' : 'muted');
const availColor = (a) => (a >= 97 ? '#34d399' : a >= 93 ? '#fbbf24' : '#fb7185');
const trsColor = (v) => v >= 85 ? '#2DD4BF' : v >= 65 ? '#FBBF24' : '#ef4444';

function TrsBar({ value }) {
  const color = trsColor(value);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s' }} />
      </div>
      <span className="mono" style={{ fontSize: 12.5, color, minWidth: 40 }}>{value}%</span>
    </div>
  );
}

function MachineDetail({ machine, onClose }) {
  const [prods, setProds] = useState(null);

  useEffect(() => {
    api.productions().then((all) => {
      const filtered = all.filter((p) => p.machine === machine.code);
      filtered.sort((a, b) => b.date.localeCompare(a.date));
      setProds(filtered);
    });
  }, [machine.code]);

  const avgTRS = prods?.length
    ? +(prods.reduce((s, p) => s + p.trs, 0) / prods.length).toFixed(1)
    : null;
  const totalVal = prods?.reduce((s, p) => s + (p.valeur_production || 0), 0) || 0;
  const totalHeures = prods?.reduce((s, p) => s + (p.duree_shift || 0), 0) || 0;
  const totalArret = prods?.reduce((s, p) => s + Number(p.temps_arret || 0), 0) || 0;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        style={{ margin: 'auto', width: '100%', maxWidth: 780, maxHeight: '92vh', overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="card-head" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="card-title" style={{ fontSize: 17 }}>{machine.name}</div>
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              <span className="cell-code" style={{ fontSize: 11 }}>{machine.code}</span>
              &nbsp;·&nbsp;{machine.interventions} interventions maintenance · Disponibilité {machine.availability}%
            </div>
          </div>
          <button className="btn" style={{ padding: '7px 10px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* KPIs TRS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 22 }}>
            {[
              { label: 'TRS moyen', value: avgTRS !== null ? `${avgTRS}%` : '—', color: avgTRS !== null ? trsColor(avgTRS) : 'var(--text-muted)' },
              { label: 'Sessions', value: prods?.length ?? '—', color: 'var(--text)' },
              { label: 'Valeur produite', value: dh(totalVal), color: '#2DD4BF' },
              { label: 'Temps arrêt cumulé', value: `${totalArret.toFixed(1)} h`, color: '#fbbf24' },
            ].map((k) => (
              <div key={k.label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
                <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>{k.label}</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Historique productions */}
          <div style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historique productions & TRS</span>
            {prods && <span className="card-hint">{prods.length} session{prods.length !== 1 ? 's' : ''}</span>}
          </div>

          {!prods && <Loading label="Chargement des productions…" />}
          {prods && prods.length === 0 && (
            <div className="muted" style={{ textAlign: 'center', padding: '32px 0', fontSize: 13 }}>
              Aucune session de production enregistrée pour cette machine.
            </div>
          )}
          {prods && prods.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date</th>
                    <th>Shift</th>
                    <th>Conducteur</th>
                    <th className="mono">TRS</th>
                    <th className="mono">Dispo</th>
                    <th className="mono">Perf</th>
                    <th className="mono">Qualité</th>
                    <th className="mono">Arrêt</th>
                    <th className="mono">Valeur</th>
                  </tr>
                </thead>
                <tbody>
                  {prods.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-code" style={{ fontSize: 11 }}>{p.id}</td>
                      <td className="mono muted" style={{ fontSize: 12 }}>{p.date}</td>
                      <td className="mono muted" style={{ fontSize: 12 }}>{p.shift_debut}→{p.shift_fin}</td>
                      <td style={{ fontSize: 13 }}>{p.conducteurNom || '—'}</td>
                      <td style={{ minWidth: 110 }}><TrsBar value={p.trs} /></td>
                      <td className="mono" style={{ fontSize: 12, color: trsColor(p.disponibilite) }}>{p.disponibilite}%</td>
                      <td className="mono" style={{ fontSize: 12, color: trsColor(p.performance) }}>{p.performance}%</td>
                      <td className="mono" style={{ fontSize: 12, color: trsColor(p.qualite) }}>{p.qualite}%</td>
                      <td className="mono" style={{ fontSize: 12, color: '#fbbf24' }}>{p.temps_arret}h</td>
                      <td className="mono cell-strong" style={{ fontSize: 12 }}>{dh(p.valeur_production)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Articles produits sur cette machine */}
          {prods && prods.length > 0 && (() => {
            const artMap = {};
            prods.forEach((p) => (p.articlesDetail || []).forEach((a) => {
              if (!artMap[a.ref]) artMap[a.ref] = { designation: a.designation, unite: a.unite, qte: 0, total: 0 };
              artMap[a.ref].qte += Number(a.qte || 0);
              artMap[a.ref].total += Number(a.total || 0);
            }));
            const arts = Object.entries(artMap);
            if (!arts.length) return null;
            return (
              <div style={{ marginTop: 20 }}>
                <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                  Articles produits sur cette machine
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {arts.map(([ref, a]) => (
                    <div key={ref} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', minWidth: 180 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.designation}</div>
                      <div className="mono" style={{ fontSize: 18, color: '#2DD4BF', marginTop: 4 }}>{num(+a.qte.toFixed(0))} <span style={{ fontSize: 12 }}>{a.unite}</span></div>
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>Valeur : {dh(a.total)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function Machines() {
  const { data } = useFetch(api.machines);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ q: '', criticality: 'Tous' });
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  if (!data) return <Loading />;
  const sorted = [...data].sort((a, b) => b.totalCost - a.totalCost);
  const filtered = sorted.filter((m) => {
    if (filters.criticality !== 'Tous' && m.criticality !== filters.criticality) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      return m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="page">
      {selected && <MachineDetail machine={selected} onClose={() => setSelected(null)} />}

      <div className="grid-3">
        {sorted.slice(0, 3).map((m) => (
          <div className="card" key={m.code} style={{ cursor: 'pointer' }} onClick={() => setSelected(m)}>
            <div className="flex between" style={{ marginBottom: 14 }}>
              <span className="cell-code">{m.code}</span>
              <Pill tone={critTone(m.criticality)}>{m.criticality}</Pill>
            </div>
            <div className="card-title" style={{ marginBottom: 4 }}>{m.name}</div>
            <div className="muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
              {m.interventions} interventions · {m.downtimeHours} h d'arrêt
            </div>
            <div className="stat-line">
              <span className="kpi-value" style={{ fontSize: 24 }}>{dh(m.totalCost)}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>coût maintenance cumulé</div>
            <div style={{ marginTop: 16 }}>
              <div className="flex between" style={{ marginBottom: 6, fontSize: 12 }}>
                <span className="muted">Disponibilité</span>
                <span className="mono cell-strong" style={{ color: availColor(m.availability) }}>{m.availability}%</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${m.availability}%`, background: availColor(m.availability) }} />
              </div>
            </div>
            <div className="muted" style={{ fontSize: 11, marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <BarChart3 size={12} /> Voir historique TRS <ChevronRight size={12} />
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Parc machines — coûts & disponibilité</div>
          <span className="card-hint">{data.length} machines codifiées · cliquer pour l'historique TRS</span>
        </div>
        <FilterBar
          filters={[
            { key: 'q', label: 'Rechercher (code, nom…)', type: 'text' },
            { key: 'criticality', label: 'Criticité', type: 'select', options: ['Tous', 'Critique', 'Majeure', 'Mineure'] },
          ]}
          values={filters} onChange={setF} total={sorted.length} shown={filtered.length}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Machine</th><th>Criticité</th><th className="mono">Interv.</th>
                <th className="mono">M.O.</th><th className="mono">Pièces</th><th className="mono">Arrêt</th>
                <th className="mono">Coût total</th><th>Disponibilité</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.code} style={{ cursor: 'pointer' }} onClick={() => setSelected(m)}>
                  <td className="cell-code">{m.code}</td>
                  <td className="cell-strong">{m.name}</td>
                  <td><Pill tone={critTone(m.criticality)}>{m.criticality}</Pill></td>
                  <td className="mono">{m.interventions}</td>
                  <td className="mono">{dh(m.laborCost)}</td>
                  <td className="mono">{dh(m.partsCost)}</td>
                  <td className="mono" style={{ color: '#fbbf24' }}>{dh(m.downtimeCost)}</td>
                  <td className="mono cell-strong">{dh(m.totalCost)}</td>
                  <td>
                    <div className="flex gap">
                      <div className="bar-track" style={{ width: 70 }}>
                        <div className="bar-fill" style={{ width: `${m.availability}%`, background: availColor(m.availability) }} />
                      </div>
                      <span className="mono" style={{ fontSize: 12.5, color: availColor(m.availability) }}>{m.availability}%</span>
                    </div>
                  </td>
                  <td>
                    <button className="btn" style={{ padding: '5px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setSelected(m); }}>
                      <BarChart3 size={13} /> TRS
                    </button>
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
