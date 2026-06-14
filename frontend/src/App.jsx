import { useState } from 'react';
import {
  LayoutDashboard, Wrench, Cpu, Package, BarChart3, Factory, Clock, ArrowRightLeft, Users,
  TrendingUp, Boxes, FlaskConical,
} from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import WorkOrders from './pages/WorkOrders.jsx';
import Machines from './pages/Machines.jsx';
import Parts from './pages/Parts.jsx';
import Analytics from './pages/Analytics.jsx';
import TimeTracking from './pages/TimeTracking.jsx';
import StockMovements from './pages/StockMovements.jsx';
import Collaborateurs from './pages/Collaborateurs.jsx';
import Articles from './pages/Articles.jsx';
import MatieresPremieres from './pages/MatieresPremieres.jsx';
import Production from './pages/Production.jsx';
import { api } from './api.js';

export { api };

// ---- Formatters partagés ----
export const dh = (n) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' DH';
export const num = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const NAV = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, sub: 'Vue Direction Générale' },
  { id: 'workorders', label: 'Ordres de travail', icon: Wrench, sub: 'OT valorisés automatiquement' },
  { id: 'machines', label: 'Machines & Coûts', icon: Cpu, sub: 'Coût et disponibilité par machine' },
  { id: 'parts', label: 'Pièces de rechange', icon: Package, sub: 'Nomenclature & stock' },
  { id: 'movements', label: 'Mouvements de stock', icon: ArrowRightLeft, sub: 'Entrées / Sorties' },
  { id: 'analytics', label: 'KPI & Performance', icon: BarChart3, sub: 'TRS, productivité, tendances' },
  { id: 'timetracking', label: 'Pointage RH', icon: Clock, sub: 'Système de pointage intégré' },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const SETTINGS_PAGES = {
    collaborateurs: { label: 'Collaborateurs', sub: 'Personnel affectable aux OT' },
    articles: { label: 'Articles (Produits finis)', sub: 'Catalogue et stock produits finis' },
    matieres: { label: 'Matières premières', sub: 'Gestion stock matières premières' },
    production: { label: 'Production & TRS', sub: 'Saisie production et calcul du Taux de Rendement Synthétique' },
  };
  const current = NAV.find((n) => n.id === page) || SETTINGS_PAGES[page] || { label: '', sub: '' };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Factory size={23} strokeWidth={2.4} />
          </div>
          <div>
            <div className="brand-name">Becomar</div>
            <div className="brand-sub">GMAO · COSWIN</div>
          </div>
        </div>

        <div className="sidebar-scroll">
        <div className="nav-label">Pilotage</div>
        {NAV.map((n) => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <Icon strokeWidth={2.1} />
              {n.label}
            </button>
          );
        })}
        <div className="nav-label" style={{ marginTop: 12 }}>Production</div>
        <button className={`nav-item ${page === 'production' ? 'active' : ''}`} onClick={() => setPage('production')}>
          <TrendingUp strokeWidth={2.1} />
          Production & TRS
        </button>

        <div className="nav-label" style={{ marginTop: 12 }}>Paramétrage</div>
        <button className={`nav-item ${page === 'collaborateurs' ? 'active' : ''}`} onClick={() => setPage('collaborateurs')}>
          <Users strokeWidth={2.1} />
          Collaborateurs
        </button>
        <button className={`nav-item ${page === 'articles' ? 'active' : ''}`} onClick={() => setPage('articles')}>
          <Boxes strokeWidth={2.1} />
          Articles (Produits finis)
        </button>
        <button className={`nav-item ${page === 'matieres' ? 'active' : ''}`} onClick={() => setPage('matieres')}>
          <FlaskConical strokeWidth={2.1} />
          Matières premières
        </button>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">DG</div>
            <div>
              <div className="user-name">Direction Générale</div>
              <div className="user-role">Accès pilotage industriel</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{current.label}</div>
            <div className="page-sub">{current.sub}</div>
          </div>
          <div className="topbar-actions">
            <span className="live-badge">
              <span className="live-dot" /> Données temps réel
            </span>
          </div>
        </header>

        <main className="content">
          {page === 'dashboard' && <Dashboard />}
          {page === 'workorders' && <WorkOrders />}
          {page === 'machines' && <Machines />}
          {page === 'parts' && <Parts />}
          {page === 'movements' && <StockMovements />}
          {page === 'analytics' && <Analytics />}
          {page === 'timetracking' && <TimeTracking />}
          {page === 'collaborateurs' && <Collaborateurs />}
          {page === 'articles' && <Articles />}
          {page === 'matieres' && <MatieresPremieres />}
          {page === 'production' && <Production />}
        </main>
      </div>
    </div>
  );
}
