import { useState } from 'react';
import {
  LayoutDashboard, Wrench, Cpu, Package, BarChart3, Factory, Clock, ArrowRightLeft, Users,
  TrendingUp, Boxes, FlaskConical, ShieldCheck, LogOut, ChevronDown,
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
import Utilisateurs from './pages/Utilisateurs.jsx';
import Login from './pages/Login.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { api } from './api.js';

export { api };

export const dh = (n) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + ' DH';
export const num = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

const NAV_MAIN = [
  { id: 'dashboard',    label: 'Tableau de bord',     icon: LayoutDashboard, sub: 'Vue Direction Générale' },
  { id: 'workorders',   label: 'Ordres de travail',    icon: Wrench,          sub: 'OT valorisés automatiquement' },
  { id: 'machines',     label: 'Machines & Coûts',     icon: Cpu,             sub: 'Coût et disponibilité par machine' },
  { id: 'parts',        label: 'Pièces de rechange',   icon: Package,         sub: 'Nomenclature & stock' },
  { id: 'movements',    label: 'Mouvements de stock',  icon: ArrowRightLeft,  sub: 'Entrées / Sorties' },
  { id: 'analytics',    label: 'KPI & Performance',    icon: BarChart3,       sub: 'TRS, productivité, tendances' },
  { id: 'timetracking', label: 'Pointage RH',          icon: Clock,           sub: 'Système de pointage intégré' },
];

const NAV_PROD = [
  { id: 'production', label: 'Production & TRS', icon: TrendingUp, sub: 'Saisie et calcul TRS' },
];

const NAV_PARAMS = [
  { id: 'collaborateurs', label: 'Collaborateurs',        icon: Users,        sub: 'Personnel affectable aux OT' },
  { id: 'articles',       label: 'Articles (Produits)',   icon: Boxes,        sub: 'Catalogue et stock produits finis' },
  { id: 'matieres',       label: 'Matières premières',    icon: FlaskConical, sub: 'Gestion stock matières premières' },
];

const PAGE_META = {
  dashboard:    { label: 'Tableau de bord',      sub: 'Vue Direction Générale' },
  workorders:   { label: 'Ordres de travail',     sub: 'OT valorisés automatiquement' },
  machines:     { label: 'Machines & Coûts',      sub: 'Coût et disponibilité par machine' },
  parts:        { label: 'Pièces de rechange',    sub: 'Nomenclature & stock' },
  movements:    { label: 'Mouvements de stock',   sub: 'Entrées / Sorties' },
  analytics:    { label: 'KPI & Performance',     sub: 'TRS, productivité, tendances' },
  timetracking: { label: 'Pointage RH',           sub: 'Système de pointage intégré' },
  production:   { label: 'Production & TRS',      sub: 'Saisie production et calcul TRS' },
  collaborateurs:{ label: 'Collaborateurs',       sub: 'Personnel affectable aux OT' },
  articles:     { label: 'Articles (Produits finis)', sub: 'Catalogue et stock produits finis' },
  matieres:     { label: 'Matières premières',    sub: 'Gestion stock matières premières' },
  users:        { label: 'Gestion utilisateurs',  sub: 'Utilisateurs, groupes et droits d\'accès' },
};

function AccessDenied() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
      <ShieldCheck size={48} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
      <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>Accès restreint</div>
      <div className="muted" style={{ fontSize: 14 }}>Vous n'avez pas les droits pour accéder à ce module.</div>
    </div>
  );
}

export default function App() {
  const { user, ready, logout, canRead, canWrite } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);

  if (!ready) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="spinner" />
    </div>
  );

  if (!user) return <Login />;

  const meta = PAGE_META[page] || { label: '', sub: '' };
  const initials = `${(user.prenom || '')[0] || ''}${(user.nom || '')[0] || ''}`.toUpperCase() || user.username[0].toUpperCase();

  const NavItem = ({ id, label, icon: Icon }) => (
    canRead(id) ? (
      <button className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}>
        <Icon strokeWidth={2.1} />{label}
      </button>
    ) : null
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Factory size={23} strokeWidth={2.4} /></div>
          <div>
            <div className="brand-name">Becomar</div>
            <div className="brand-sub">GMAO · COSWIN</div>
          </div>
        </div>

        <div className="sidebar-scroll">
          <div className="nav-label">Pilotage</div>
          {NAV_MAIN.map((n) => <NavItem key={n.id} {...n} />)}

          {NAV_PROD.some((n) => canRead(n.id)) && (
            <>
              <div className="nav-label" style={{ marginTop: 12 }}>Production</div>
              {NAV_PROD.map((n) => <NavItem key={n.id} {...n} />)}
            </>
          )}

          {NAV_PARAMS.some((n) => canRead(n.id)) && (
            <>
              <div className="nav-label" style={{ marginTop: 12 }}>Paramétrage</div>
              {NAV_PARAMS.map((n) => <NavItem key={n.id} {...n} />)}
            </>
          )}

          {canRead('users') && (
            <>
              <div className="nav-label" style={{ marginTop: 12 }}>Administration</div>
              <button className={`nav-item ${page === 'users' ? 'active' : ''}`} onClick={() => setPage('users')}>
                <ShieldCheck strokeWidth={2.1} />Gestion utilisateurs
              </button>
            </>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-chip" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => setShowUserMenu((v) => !v)}>
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="user-name">{user.prenom} {user.nom || user.username}</div>
              <div className="user-role">{user.groupe_nom}</div>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            {showUserMenu && (
              <div style={{ position: 'absolute', bottom: '110%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.3)' }}>
                <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 600, borderRadius: 8 }}>
                  <LogOut size={15} /> Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="page-title">{meta.label}</div>
            <div className="page-sub">{meta.sub}</div>
          </div>
          <div className="topbar-actions">
            <span className="live-badge"><span className="live-dot" /> Données temps réel</span>
          </div>
        </header>

        <main className="content">
          {page === 'dashboard'     && (canRead('dashboard')     ? <Dashboard />       : <AccessDenied />)}
          {page === 'workorders'    && (canRead('workorders')    ? <WorkOrders />      : <AccessDenied />)}
          {page === 'machines'      && (canRead('machines')      ? <Machines />        : <AccessDenied />)}
          {page === 'parts'         && (canRead('parts')         ? <Parts />           : <AccessDenied />)}
          {page === 'movements'     && (canRead('movements')     ? <StockMovements />  : <AccessDenied />)}
          {page === 'analytics'     && (canRead('analytics')     ? <Analytics />       : <AccessDenied />)}
          {page === 'timetracking'  && (canRead('timetracking')  ? <TimeTracking />    : <AccessDenied />)}
          {page === 'production'    && (canRead('production')    ? <Production />      : <AccessDenied />)}
          {page === 'collaborateurs'&& (canRead('collaborateurs')? <Collaborateurs />  : <AccessDenied />)}
          {page === 'articles'      && (canRead('articles')      ? <Articles />        : <AccessDenied />)}
          {page === 'matieres'      && (canRead('matieres')      ? <MatieresPremieres />: <AccessDenied />)}
          {page === 'users'         && (canRead('users')         ? <Utilisateurs />    : <AccessDenied />)}
        </main>
      </div>
    </div>
  );
}
