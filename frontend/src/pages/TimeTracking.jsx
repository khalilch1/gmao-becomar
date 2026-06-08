import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Clock, Users, AlertCircle, CheckCircle2, User, Calendar, Briefcase, TrendingUp,
} from 'lucide-react';
import { api, dh, num } from '../App.jsx';
import { Loading, KpiCard, Pill, useFetch, statusTone } from '../components/Common.jsx';

export default function TimeTracking() {
  const [timeframe, setTimeframe] = useState('month');

  // Mock data for time tracking dashboard
  const mockData = {
    kpis: {
      totalEmployees: 145,
      onTime: 138,
      lateArrivals: 5,
      absent: 2,
      avgWorkHours: 7.8,
      totalPayroll: 524800,
      overtimeHours: 234,
    },
    dailyAttendance: [
      { date: '1 Jun', present: 142, absent: 3 },
      { date: '2 Jun', present: 140, absent: 5 },
      { date: '3 Jun', present: 143, absent: 2 },
      { date: '4 Jun', present: 138, absent: 7 },
      { date: '5 Jun', present: 144, absent: 1 },
    ],
    departmentMetrics: [
      { dept: 'Production', hours: 1250, cost: 87500, employees: 45 },
      { dept: 'Maintenance', hours: 340, cost: 32500, employees: 18 },
      { dept: 'Qualité', hours: 245, cost: 19600, employees: 12 },
      { dept: 'Admin', hours: 280, cost: 28000, employees: 15 },
    ],
    attendanceStatus: [
      { name: 'À l\'heure', value: 138, color: '#10b981' },
      { name: 'Retard', value: 5, color: '#f59e0b' },
      { name: 'Absent', value: 2, color: '#ef4444' },
    ],
  };

  const k = mockData.kpis;
  const onTimeRate = Math.round((k.onTime / k.totalEmployees) * 100);

  return (
    <div className="page">
      {/* Key insight */}
      <div className="insight">
        <div className="insight-icon"><Clock size={22} /></div>
        <div>
          <h4>Pilotage RH intégré : Pointage temps réel</h4>
          <p>
            Synchronisation automatique des pointages avec le système de paie.
            <b> {k.totalEmployees}</b> agents suivis en continu. <b>{onTimeRate}%</b> de taux
            de présence à l'heure. Intégration directe COSWIN pour valorisation automatique des heures.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <KpiCard
          icon={Users}
          label="Effectif présent"
          value={num(k.onTime)}
          unit={`/ ${k.totalEmployees}`}
          color="#10b981"
          delta={`${onTimeRate}% à l'heure`}
          deltaDir="up"
        />
        <KpiCard
          icon={AlertCircle}
          label="Retards et absences"
          value={num(k.lateArrivals + k.absent)}
          unit="agents"
          color="#ef4444"
          delta={`${k.lateArrivals} retards, ${k.absent} absents`}
          deltaDir="down"
        />
        <KpiCard
          icon={Clock}
          label="Heures travaillées (jour)"
          value={k.avgWorkHours}
          unit="h/agent"
          color="#3b82f6"
          delta="Moyenne par effectif"
          deltaDir="up"
        />
        <KpiCard
          icon={TrendingUp}
          label="Masse salariale mois"
          value={num(Math.round(k.totalPayroll / 1000))}
          unit="k DH"
          color="#8b5cf6"
          delta={`+ ${num(k.overtimeHours)} h supp`}
          deltaDir="up"
        />
      </div>

      <div className="grid-2">
        {/* Daily Attendance Trend */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Présence quotidienne (semaine)</div>
            <span className="card-hint">Présents vs Absents</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mockData.dailyAttendance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="present" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Breakdown */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Répartition heures travaillées</div>
            <span className="card-hint">Par département</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mockData.departmentMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dept" stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Legend />
              <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid-2">
        {/* Attendance Status Pie */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">État de la présence (aujourd'hui)</div>
            <span className="card-hint">Décomposition</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={mockData.attendanceStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {mockData.attendanceStatus.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department Details Table */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">Détail par département</div>
            <span className="card-hint">Heures et coûts</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Département</th>
                  <th>Heures</th>
                  <th>Effectif</th>
                  <th>Coût mois</th>
                </tr>
              </thead>
              <tbody>
                {mockData.departmentMetrics.map((dept) => (
                  <tr key={dept.dept}>
                    <td>
                      <Pill tone="blue">{dept.dept}</Pill>
                    </td>
                    <td>{num(dept.hours)} h</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        {dept.employees}
                      </div>
                    </td>
                    <td className="font-semibold">{dh(dept.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Integration Info */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Intégration COSWIN</div>
          <CheckCircle2 size={20} color="#10b981" />
        </div>
        <div style={{ padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
          <p style={{ margin: '0 0 10px 0', color: '#065f46' }}>
            <strong>✓ Synchronisation temps réel</strong> : Les pointages remontent automatiquement
            à COSWIN pour valorisation des heures travaillées.
          </p>
          <p style={{ margin: '0 0 10px 0', color: '#065f46' }}>
            <strong>✓ Paie intégrée</strong> : Les données de pointage alimentent directement le
            moteur de calcul de paie.
          </p>
          <p style={{ margin: '0', color: '#065f46' }}>
            <strong>✓ Conformité</strong> : Audit trail complet pour le contrôle des heures et
            dérogations.
          </p>
        </div>
      </div>
    </div>
  );
}
