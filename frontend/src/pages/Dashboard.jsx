import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  Coins, TimerOff, Gauge, Boxes, AlertTriangle, TrendingUp, TrendingDown,
} from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, KpiCard, Pill, useFetch, statusTone, typeTone } from '../components/Common.jsx';

export default function Dashboard() {
  const { data } = useFetch(api.dashboard);
  if (!data) return <Loading />;
  const k = data.kpis;
  const downtimeShare = Math.round((k.downtimeCost / k.totalCost) * 100);

  return (
    <div className="page">
      {/* Insight clé : le coût d'arrêt est la perte invisible */}
      <div className="insight">
        <div className="insight-icon"><AlertTriangle size={22} /></div>
        <div>
          <h4>La perte invisible : le coût d'arrêt production</h4>
          <p>
            Sur <b>{dh(k.totalCost)}</b> de coût maintenance total, <b>{downtimeShare}%</b> provient
            des <b>{k.downtimeHours} h</b> d'arrêt machine — bien au-delà de la main d'œuvre et des
            pièces. C'est ce coût caché que la GMAO rend enfin visible et pilotable.
          </p>
        </div>
      </div>

      {/* KPI principaux */}
      <div className="kpi-grid">
        <KpiCard icon={Coins} label="Coût maintenance total" value={num(k.totalCost)} unit="DH"
          color="#ff6a3d" delta="Main d'œuvre + Pièces + Arrêt" deltaDir="up" />
        <KpiCard icon={TimerOff} label="Coût d'arrêt production" value={num(k.downtimeCost)} unit="DH"
          color="#fbbf24" delta={`${downtimeShare}% du coût total`} deltaDir="warn" />
        <KpiCard icon={Gauge} label="TRS (mois courant)" value={k.trs} unit="%"
          color="#2dd4bf" delta="+3,4 pts vs déc." deltaDir="up" />
        <KpiCard icon={Boxes} label="Coût par planche" value={k.costPerUnit} unit="DH/u"
          color="#a78bfa" delta="Indicateur de pilotage" deltaDir="up" />
      </div>

      <div className="grid-2">
        {/* Coût par unité de production */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Coût maintenance par unité de production</div>
            <span className="card-hint">DH cumulés</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.costByUnit} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid horizontal={false} stroke="#222730" />
              <XAxis type="number" stroke="#6b7384" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <YAxis type="category" dataKey="name" stroke="#a3acbb" fontSize={11.5} width={140} />
              <Tooltip formatter={(v) => dh(v)} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={26}>
                {data.costByUnit.map((u) => <Cell key={u.id} fill={u.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition coût (donut) */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Structure du coût d'intervention</div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <PieChart>
              <Pie data={data.costBreakdown} dataKey="value" nameKey="name"
                innerRadius={56} outerRadius={82} paddingAngle={3} stroke="none">
                {data.costBreakdown.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={(v) => dh(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 6 }}>
            {data.costBreakdown.map((c) => (
              <div className="cost-row" key={c.name}>
                <div className="cost-left">
                  <span className="dot" style={{ background: c.color }} />
                  <span className="cost-name">{c.name}</span>
                </div>
                <span className="cost-val">{dh(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Top machines coûteuses */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Machines les plus coûteuses</div>
            <span className="card-hint">Priorisation par impact financier</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Machine</th><th>Interv.</th><th className="mono">Arrêt (h)</th><th className="mono">Coût total</th>
                </tr>
              </thead>
              <tbody>
                {data.topMachines.map((m) => (
                  <tr key={m.code}>
                    <td>
                      <div className="cell-strong">{m.name}</div>
                      <div className="cell-code">{m.code}</div>
                    </td>
                    <td className="mono">{m.interventions}</td>
                    <td className="mono">{m.downtimeHours}</td>
                    <td className="mono cell-strong">{dh(m.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Production & arrêts */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Production vs heures d'arrêt</div>
            <span className="card-hint">6 derniers mois</span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={data.production} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#222730" vertical={false} />
              <XAxis dataKey="month" stroke="#6b7384" fontSize={11.5} />
              <YAxis stroke="#6b7384" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v, n) => n === 'planches' ? `${num(v)} planches` : `${v} h`} />
              <Area type="monotone" dataKey="planches" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#gProd)" />
              <Bar dataKey="arretsH" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={14} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* OT récents */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Ordres de travail récents</div>
          <span className="card-hint">{k.openOrders} en cours · {k.preventiveRatio}% préventif</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>OT</th><th>Machine</th><th>Type</th><th>Statut</th>
                <th className="mono">M.O.</th><th className="mono">Pièces</th>
                <th className="mono">Arrêt</th><th className="mono">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((o) => (
                <tr key={o.id}>
                  <td className="cell-code">{o.id}</td>
                  <td>
                    <div className="cell-strong">{o.machineName}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{o.desc}</div>
                  </td>
                  <td><Pill tone={typeTone(o.type)}>{o.type}</Pill></td>
                  <td><Pill tone={statusTone(o.status)}>{o.status}</Pill></td>
                  <td className="mono">{dh(o.laborCost)}</td>
                  <td className="mono">{dh(o.partsCost)}</td>
                  <td className="mono" style={{ color: '#fbbf24' }}>{dh(o.downtimeCost)}</td>
                  <td className="mono cell-strong">{dh(o.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
