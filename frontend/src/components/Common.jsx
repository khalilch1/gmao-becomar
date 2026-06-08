import { useState, useEffect } from 'react';

export function Loading({ label = 'Chargement des données…' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      {label}
    </div>
  );
}

// Hook simple de récupération de données
export function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    fn()
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error };
}

export function KpiCard({ icon: Icon, label, value, unit, color, delta, deltaDir, glow }) {
  return (
    <div className="kpi">
      <div className="kpi-glow" style={{ background: glow || color }} />
      <div className="kpi-top">
        <div className="kpi-icon" style={{ background: `${color}22`, color }}>
          <Icon size={21} strokeWidth={2.2} />
        </div>
      </div>
      <div className="kpi-label">{label}</div>
      <div className="stat-line" style={{ marginTop: 6 }}>
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {delta && (
        <div className={`kpi-delta ${deltaDir}`}>
          {delta}
        </div>
      )}
    </div>
  );
}

export function Pill({ children, tone = 'muted' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

// Tone selon statut / type
export function statusTone(s) {
  return s === 'Clôturé' ? 'good' : s === 'En cours' ? 'amber' : 'muted';
}
export function typeTone(t) {
  return t === 'Préventive' ? 'teal' : 'orange';
}
export function priorityTone(p) {
  return p === 'Urgente' ? 'bad' : p === 'Normale' ? 'amber' : 'muted';
}
