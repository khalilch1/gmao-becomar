import { useState } from 'react';
import { Plus, X, Calculator } from 'lucide-react';
import { api, dh } from '../App.jsx';
import {
  Loading, Pill, useFetch, statusTone, typeTone, priorityTone,
} from '../components/Common.jsx';

const MACHINES = [
  'DEB-SCI-01', 'DEB-SCI-02', 'PRE-HOT-01', 'PRE-COL-01',
  'FIN-PON-01', 'FIN-DEC-01', 'ENE-CHA-01', 'ENE-CMP-01',
];

export default function WorkOrders() {
  const [reload, setReload] = useState(0);
  const { data } = useFetch(api.workorders, [reload]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    machine: 'DEB-SCI-01', type: 'Corrective', priority: 'Normale',
    desc: '', laborHours: 2, downtimeHours: 1, tech: 'A. Bennani',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.createWorkorder({ ...form, status: 'Planifié', parts: [] });
      setOpen(false);
      setReload((r) => r + 1);
      setForm((f) => ({ ...f, desc: '' }));
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <Loading />;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="page">
      <div className="flex between" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ fontSize: 13.5, maxWidth: 620 }}>
          Chaque ordre de travail est <b style={{ color: 'var(--text)' }}>valorisé automatiquement</b> :
          main d'œuvre (heures × taux) + pièces (nomenclature) + coût d'arrêt (heures × coût horaire machine).
        </p>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Plus size={17} /> Nouvel OT
        </button>
      </div>

      {open && (
        <div className="card" style={{ marginBottom: 18, borderColor: 'var(--accent)' }}>
          <div className="card-head">
            <div className="card-title">Créer un ordre de travail</div>
            <button className="btn" onClick={() => setOpen(false)} style={{ padding: '7px 10px' }}>
              <X size={16} />
            </button>
          </div>
          <div className="row-2">
            <div className="field">
              <label>Machine</label>
              <select className="select" value={form.machine} onChange={set('machine')}>
                {MACHINES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Technicien</label>
              <select className="select" value={form.tech} onChange={set('tech')}>
                {['A. Bennani', 'Y. El Idrissi', 'S. Tahiri'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
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

      <div className="card">
        <div className="card-head">
          <div className="card-title">Tous les ordres de travail</div>
          <span className="card-hint">{data.length} OT</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>OT</th><th>Machine</th><th>Type</th><th>Priorité</th><th>Statut</th>
                <th className="mono">M.O.</th><th className="mono">Pièces</th>
                <th className="mono">Arrêt</th><th className="mono">Total</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id}>
                  <td className="cell-code">{o.id}</td>
                  <td>
                    <div className="cell-strong">{o.machineName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{o.desc}</div>
                  </td>
                  <td><Pill tone={typeTone(o.type)}>{o.type}</Pill></td>
                  <td><Pill tone={priorityTone(o.priority)}>{o.priority}</Pill></td>
                  <td><Pill tone={statusTone(o.status)}>{o.status}</Pill></td>
                  <td className="mono">{dh(o.laborCost)}</td>
                  <td className="mono">{dh(o.partsCost)}</td>
                  <td className="mono" style={{ color: '#fbbf24' }}>{dh(o.downtimeCost)}</td>
                  <td className="mono cell-strong">{dh(o.totalCost)}</td>
                  <td className="muted mono" style={{ fontSize: 12 }}>{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
