import { createContext, useContext, useState, useEffect } from 'react';

const Ctx = createContext(null);

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = pas encore vérifié
  const [ready, setReady] = useState(false); // true = vérification initiale faite

  // Vérification du token au démarrage
  useEffect(() => {
    const token = localStorage.getItem('gmao_token');
    if (!token) { setReady(true); return; }
    fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((u) => { setUser(u); setReady(true); })
      .catch(() => { localStorage.removeItem('gmao_token'); setReady(true); });
  }, []);

  const login = async (username, password) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur de connexion');
    localStorage.setItem('gmao_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('gmao_token');
    setUser(null);
  };

  // perm(module) → 'none' | 'read' | 'write'
  const perm = (module) => user?.permissions?.[module] || 'none';
  const canRead  = (module) => ['read', 'write'].includes(perm(module));
  const canWrite = (module) => perm(module) === 'write';

  return (
    <Ctx.Provider value={{ user, ready, login, logout, perm, canRead, canWrite }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
