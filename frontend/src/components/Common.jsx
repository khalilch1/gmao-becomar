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

const TONE_COLOR = {
  good: '#2DD4BF', bad: '#ef4444', amber: '#FBBF24',
  teal: '#2DD4BF', orange: '#FB923C', violet: '#A78BFA', muted: '#6B7280',
};

// Variante légère sans icône obligatoire — utilisée par Articles, MatieresPremieres, Production
export function KpiSimple({ label, value, sub, tone = 'muted' }) {
  const c = TONE_COLOR[tone] || '#6B7280';
  return (
    <div className="kpi" style={{ minWidth: 160 }}>
      <div className="kpi-glow" style={{ background: c }} />
      <div className="kpi-label" style={{ marginTop: 12 }}>{label}</div>
      <div className="kpi-value" style={{ color: c, marginTop: 4 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// Barre de filtres générique
// filters = [{ key, label, type: 'text'|'select'|'toggle', options: ['Tous',...] }]
// values = { key: value }  /  onChange(key, value)
export function FilterBar({ filters, values, onChange, total, shown }) {
  const hasActive = filters.some((f) => {
    const v = values[f.key];
    if (f.type === 'toggle') return !!v;
    return v && v !== '' && v !== 'Tous';
  });
  const reset = () => filters.forEach((f) => onChange(f.key, f.type === 'toggle' ? false : f.type === 'select' ? 'Tous' : ''));

  const inputStyle = {
    height: 40,
    padding: '0 14px',
    fontSize: 14,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end',
      padding: '12px 16px 14px', background: 'var(--surface-2)',
      borderRadius: 'var(--radius-sm)', marginBottom: 14,
      border: '1px solid var(--border)',
    }}>
      {filters.map((f) => {
        if (f.type === 'text') return (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 2, minWidth: 200 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Recherche</span>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', pointerEvents: 'none' }}>🔍</span>
              <input
                style={{ ...inputStyle, paddingLeft: 36 }}
                placeholder={f.label}
                value={values[f.key] || ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            </div>
          </div>
        );
        if (f.type === 'select') return (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, minWidth: 150 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{f.label}</span>
            <select
              style={{ ...inputStyle, cursor: 'pointer' }}
              value={values[f.key] || 'Tous'}
              onChange={(e) => onChange(f.key, e.target.value)}
            >
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        );
        if (f.type === 'toggle') return (
          <label key={f.key} style={{
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontSize: 13, fontWeight: 500, height: 40, padding: '0 14px',
            border: `1px solid ${values[f.key] ? '#fbbf24' : 'var(--border)'}`,
            borderRadius: 8, whiteSpace: 'nowrap',
            background: values[f.key] ? 'rgba(251,191,36,0.1)' : 'var(--bg)',
            color: values[f.key] ? '#fbbf24' : 'var(--text-muted)',
            transition: 'all 0.15s',
          }}>
            <input type="checkbox" checked={!!values[f.key]} onChange={(e) => onChange(f.key, e.target.checked)}
              style={{ accentColor: '#fbbf24', width: 15, height: 15, cursor: 'pointer' }} />
            {f.label}
          </label>
        );
        return null;
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 40 }}>
        {total !== undefined && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            {shown !== total
              ? <><b style={{ color: 'var(--text)', fontSize: 14 }}>{shown}</b> <span>/ {total}</span></>
              : <b style={{ color: 'var(--text)', fontSize: 14 }}>{total}</b>
            }
            {' '}résultat{total !== 1 ? 's' : ''}
          </span>
        )}
        {hasActive && (
          <button className="btn" style={{ padding: '0 16px', height: 40, fontSize: 13 }} onClick={reset}>
            ✕ Réinitialiser
          </button>
        )}
      </div>
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
