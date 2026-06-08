import { api, dh } from '../App.jsx';
import { Loading, Pill, useFetch } from '../components/Common.jsx';

const critTone = (c) => (c === 'Critique' ? 'bad' : c === 'Majeure' ? 'amber' : 'muted');
const availColor = (a) => (a >= 97 ? '#34d399' : a >= 93 ? '#fbbf24' : '#fb7185');

export default function Machines() {
  const { data } = useFetch(api.machines);
  if (!data) return <Loading />;
  const sorted = [...data].sort((a, b) => b.totalCost - a.totalCost);

  return (
    <div className="page">
      <div className="grid-3">
        {sorted.slice(0, 3).map((m, i) => (
          <div className="card" key={m.code}>
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
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Parc machines — coûts & disponibilité</div>
          <span className="card-hint">{data.length} machines codifiées</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th><th>Machine</th><th>Criticité</th><th className="mono">Interv.</th>
                <th className="mono">M.O.</th><th className="mono">Pièces</th><th className="mono">Arrêt</th>
                <th className="mono">Coût total</th><th>Disponibilité</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr key={m.code}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
