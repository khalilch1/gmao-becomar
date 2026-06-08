import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Bar, Legend,
} from 'recharts';
import { api } from '../App.jsx';
import { Loading, useFetch } from '../components/Common.jsx';

const KPI_LIST = [
  { name: 'TRS (Taux de Rendement Synthétique)', desc: 'Disponibilité × Performance × Qualité', tone: '#2dd4bf' },
  { name: 'Taux de casse', desc: 'Pannes critiques / heures de marche', tone: '#fb7185' },
  { name: 'Coût par intervention', desc: 'Coût total moyen par OT', tone: '#ff6a3d' },
  { name: 'Coût par machine', desc: 'Cumul valorisé par équipement', tone: '#ff6a3d' },
  { name: 'Coût par unité produite', desc: 'Coût maintenance / planche', tone: '#a78bfa' },
  { name: "Taux d'occupation machine", desc: 'Heures travaillées / heures de marche', tone: '#fbbf24' },
  { name: 'Productivité', desc: 'Production / heures de marche', tone: '#34d399' },
  { name: 'Taux de perte matière première', desc: 'Rebuts / matière engagée', tone: '#fb7185' },
];

export default function Analytics() {
  const { data } = useFetch(api.kpis);
  if (!data) return <Loading />;

  return (
    <div className="page">
      <div className="grid-2-eq">
        <div className="card">
          <div className="card-head">
            <div className="card-title">Évolution du TRS</div>
            <span className="card-hint">6 mois · objectif &gt; 90%</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.trsTrend} margin={{ left: -12, right: 10, top: 8 }}>
              <CartesianGrid stroke="#222730" vertical={false} />
              <XAxis dataKey="month" stroke="#6b7384" fontSize={11.5} />
              <YAxis domain={[75, 95]} stroke="#6b7384" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="trs" stroke="#2dd4bf" strokeWidth={3}
                dot={{ r: 4, fill: '#2dd4bf' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Productivité vs heures d'arrêt</div>
            <span className="card-hint">planches/h · heures arrêt</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={data.trsTrend} margin={{ left: -10, right: 10, top: 8 }}>
              <CartesianGrid stroke="#222730" vertical={false} />
              <XAxis dataKey="month" stroke="#6b7384" fontSize={11.5} />
              <YAxis yAxisId="l" stroke="#6b7384" fontSize={11} />
              <YAxis yAxisId="r" orientation="right" stroke="#6b7384" fontSize={11} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="r" dataKey="arrets" name="Heures arrêt" fill="#fbbf24" radius={[4, 4, 0, 0]} barSize={18} />
              <Line yAxisId="l" type="monotone" dataKey="productivity" name="Productivité" stroke="#34d399" strokeWidth={3} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">KPI suivis par la GMAO</div>
          <span className="card-hint">On ne traite pas toutes les pannes pareil — priorisation par impact financier</span>
        </div>
        <div className="grid-2-eq mb0">
          {KPI_LIST.map((k) => (
            <div key={k.name} className="cost-row" style={{ padding: '14px 0' }}>
              <div className="cost-left">
                <span className="dot" style={{ background: k.tone, width: 9, height: 9 }} />
                <div>
                  <div className="cell-strong" style={{ fontSize: 14 }}>{k.name}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{k.desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
