import { useState } from 'react';
import { Factory, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setErr('Identifiant et mot de passe requis'); return; }
    setLoading(true); setErr('');
    try { await login(form.username, form.password); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            boxShadow: '0 0 30px rgba(255,106,61,0.3)',
          }}>
            <Factory size={28} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Becomar GMAO</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Connectez-vous pour accéder à l'application</div>
        </div>

        {/* Formulaire */}
        <form onSubmit={submit} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          padding: 28, boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        }}>
          {err && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 18,
            }}>{err}</div>
          )}

          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Identifiant
            </label>
            <input
              className="input"
              style={{ marginTop: 6, height: 44 }}
              placeholder="admin"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              autoComplete="username"
            />
          </div>

          <div className="field" style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <input
                className="input"
                style={{ height: 44, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
              }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: 44, fontSize: 15, justifyContent: 'center' }}>
            <LogIn size={17} />
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Becomar GMAO · Système de gestion de maintenance
        </div>
      </div>
    </div>
  );
}
