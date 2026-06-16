// =============================================================
//  GMAO BECOMAR — Serveur API (Node.js / Express)
// =============================================================
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  LABOR_RATE,
  units,
  machines,
  parts,
  collaborateurs: seedCollaborateurs,
  workOrders,
  production,
  valorizeWorkOrder,
  seedMovements,
  initialStock,
  articles: seedArticles,
  matieres: seedMatieres,
  productions: seedProductions,
  enrichProduction,
  calcTRS,
  seedArticlesMovements,
  initialArticlesStock,
  seedMatieresMovements,
  initialMatieresStock,
} = require('./data');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'gmao-becomar-secret-2026';

// =============================================================
//  MODULES ACTIONS & PERMISSIONS GRANULAIRES
// =============================================================
const MODULES_ACTIONS = {
  dashboard:      ['view'],
  workorders:     ['view', 'create', 'edit', 'delete', 'add_parts'],
  machines:       ['view'],
  parts:          ['view', 'create', 'edit', 'add_movement'],
  movements:      ['view', 'create'],
  analytics:      ['view'],
  timetracking:   ['view', 'create', 'edit'],
  production:     ['view', 'create', 'edit', 'delete'],
  collaborateurs: ['view', 'create', 'edit', 'delete', 'manage_params'],
  articles:       ['view', 'create', 'edit', 'delete', 'add_movement', 'view_history', 'manage_categories'],
  matieres:       ['view', 'create', 'edit', 'delete', 'add_movement', 'view_history', 'manage_categories'],
  users:          ['view', 'create_user', 'edit_user', 'delete_user', 'manage_groups'],
};
const ALL_MODULES = Object.keys(MODULES_ACTIONS);

function modulePerms(mod, value) {
  return Object.fromEntries(MODULES_ACTIONS[mod].map((a) => [a, value]));
}
function makePerms(config) {
  const result = {};
  for (const mod of ALL_MODULES) {
    const v = config[mod];
    if (v === true) result[mod] = modulePerms(mod, true);
    else if (!v || v === false) result[mod] = modulePerms(mod, false);
    else result[mod] = { ...modulePerms(mod, false), ...v };
  }
  return result;
}
function computeEffectivePerms(groupPerms, userOverrides) {
  const result = {};
  for (const mod of ALL_MODULES) {
    result[mod] = { ...(groupPerms[mod] || modulePerms(mod, false)), ...(userOverrides?.[mod] || {}) };
  }
  return result;
}

let groupes = [
  {
    id: 'GRP-001', nom: 'Administrateur',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: makePerms(Object.fromEntries(ALL_MODULES.map((m) => [m, true]))),
  },
  {
    id: 'GRP-002', nom: 'Responsable Maintenance',
    description: 'Gestion complète de la maintenance',
    permissions: makePerms({
      dashboard: { view: true }, workorders: { view: true, create: true, edit: true, delete: true, add_parts: true },
      machines: { view: true }, parts: { view: true, create: true, edit: true, add_movement: true },
      movements: { view: true, create: true }, analytics: { view: true },
      timetracking: { view: true, create: true, edit: true }, production: { view: true },
      collaborateurs: { view: true, create: true, edit: true, delete: true, manage_params: true },
      articles: false, matieres: false, users: false,
    }),
  },
  {
    id: 'GRP-003', nom: 'Opérateur Production',
    description: 'Saisie production et consultation',
    permissions: makePerms({
      dashboard: { view: true }, workorders: { view: true }, machines: { view: true },
      parts: false, movements: false, analytics: { view: true }, timetracking: false,
      production: { view: true, create: true, edit: true }, collaborateurs: false,
      articles: { view: true }, matieres: { view: true }, users: false,
    }),
  },
  {
    id: 'GRP-004', nom: 'Magasinier',
    description: 'Gestion des stocks et pièces',
    permissions: makePerms({
      dashboard: { view: true }, workorders: { view: true }, machines: false,
      parts: { view: true, create: true, edit: true, add_movement: true },
      movements: { view: true, create: true }, analytics: false, timetracking: false,
      production: false, collaborateurs: false,
      articles: { view: true, create: true, edit: true, delete: true, add_movement: true, view_history: true, manage_categories: true },
      matieres: { view: true, create: true, edit: true, delete: true, add_movement: true, view_history: true, manage_categories: true },
      users: false,
    }),
  },
  {
    id: 'GRP-005', nom: 'Consultation',
    description: 'Accès lecture seule sur tous les modules',
    permissions: makePerms(Object.fromEntries(ALL_MODULES.map((m) => [m, m === 'users' ? false : { view: true }]))),
  },
];
let grpSeq = groupes.length + 1;

let users = [
  { id: 'USR-001', username: 'admin', password_hash: bcrypt.hashSync('Admin123!', 10), nom: 'Administrateur', prenom: 'Système', email: 'admin@becomar.ma', groupe_id: 'GRP-001', actif: true, overrides: {} },
];
let usrSeq = users.length + 1;

// ---- Middleware auth ----
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Non authentifié' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}
function adminMiddleware(req, res, next) {
  const u = users.find((u) => u.id === req.user?.id);
  const grp = groupes.find((g) => g.id === u?.groupe_id);
  const eff = computeEffectivePerms(grp?.permissions || {}, u?.overrides || {});
  if (!eff.users?.view) return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  next();
}
function userView(u) {
  const { password_hash, ...safe } = u;
  const grp = groupes.find((g) => g.id === u.groupe_id);
  const effectivePerms = computeEffectivePerms(grp?.permissions || {}, u.overrides || {});
  return { ...safe, groupe_nom: grp?.nom || '—', permissions: effectivePerms, group_permissions: grp?.permissions || {} };
}

// =============================================================
//  ROUTES AUTH
// =============================================================
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username && u.actif);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect' });
  const token = jwt.sign({ id: user.id, username: user.username, groupe_id: user.groupe_id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: userView(user) });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user || !user.actif) return res.status(401).json({ error: 'Compte désactivé' });
  res.json(userView(user));
});

app.get('/api/modules-actions', authMiddleware, (req, res) => res.json(MODULES_ACTIONS));

// =============================================================
//  GESTION UTILISATEURS (admin)
// =============================================================
app.get('/api/users', authMiddleware, adminMiddleware, (req, res) => res.json(users.map(userView)));

app.post('/api/users', authMiddleware, adminMiddleware, (req, res) => {
  const b = req.body || {};
  if (!b.username?.trim() || !b.password?.trim()) return res.status(400).json({ error: 'username et password requis' });
  if (users.find((u) => u.username === b.username)) return res.status(400).json({ error: "Nom d'utilisateur déjà utilisé" });
  const grp = groupes.find((g) => g.id === b.groupe_id);
  if (!grp) return res.status(400).json({ error: 'Groupe invalide' });
  const u = { id: `USR-${String(usrSeq++).padStart(3, '0')}`, username: b.username.trim(), password_hash: bcrypt.hashSync(b.password, 10), nom: b.nom || '', prenom: b.prenom || '', email: b.email || '', groupe_id: b.groupe_id, actif: b.actif !== false, overrides: b.overrides || {} };
  users.push(u);
  res.status(201).json(userView(u));
});

app.put('/api/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Utilisateur introuvable' });
  const b = req.body || {};
  if (b.groupe_id && !groupes.find((g) => g.id === b.groupe_id)) return res.status(400).json({ error: 'Groupe invalide' });
  const u = users[idx];
  if (b.username !== undefined) u.username = b.username.trim();
  if (b.nom !== undefined) u.nom = b.nom;
  if (b.prenom !== undefined) u.prenom = b.prenom;
  if (b.email !== undefined) u.email = b.email;
  if (b.groupe_id !== undefined) u.groupe_id = b.groupe_id;
  if (b.actif !== undefined) u.actif = b.actif;
  if (b.password?.trim()) u.password_hash = bcrypt.hashSync(b.password, 10);
  if (b.overrides !== undefined) u.overrides = b.overrides;
  res.json(userView(u));
});

app.delete('/api/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer son propre compte' });
  const idx = users.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Utilisateur introuvable' });
  users.splice(idx, 1);
  res.json({ ok: true });
});

// =============================================================
//  GESTION GROUPES (admin)
// =============================================================
app.get('/api/groupes', authMiddleware, (req, res) => res.json(groupes));

app.post('/api/groupes', authMiddleware, adminMiddleware, (req, res) => {
  const b = req.body || {};
  if (!b.nom?.trim()) return res.status(400).json({ error: 'Nom du groupe requis' });
  const grp = { id: `GRP-${String(grpSeq++).padStart(3, '0')}`, nom: b.nom.trim(), description: b.description || '', permissions: makePerms(b.permissions || {}) };
  groupes.push(grp);
  res.status(201).json(grp);
});

app.put('/api/groupes/:id', authMiddleware, adminMiddleware, (req, res) => {
  const grp = groupes.find((g) => g.id === req.params.id);
  if (!grp) return res.status(404).json({ error: 'Groupe introuvable' });
  const b = req.body || {};
  if (b.nom !== undefined) grp.nom = b.nom.trim();
  if (b.description !== undefined) grp.description = b.description;
  if (b.permissions !== undefined) grp.permissions = makePerms(b.permissions);
  res.json(grp);
});

app.delete('/api/groupes/:id', authMiddleware, adminMiddleware, (req, res) => {
  if (users.find((u) => u.groupe_id === req.params.id)) return res.status(400).json({ error: 'Groupe utilisé par des utilisateurs' });
  const idx = groupes.findIndex((g) => g.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Groupe introuvable' });
  groupes.splice(idx, 1);
  res.json({ ok: true });
});

// État mutable en mémoire (les OT créés s'ajoutent ici)
let orders = [...workOrders];
let nextId = 2418;

// Collaborateurs (paramétrage)
let collaborateurs = seedCollaborateurs.map((c) => ({ ...c }));
let colSeq = collaborateurs.length + 1;

// Articles (produits finis)
let articlesMeta = seedArticles.map((a) => ({ ...a }));
let articlesStock = { ...initialArticlesStock };
let artMovements = [...seedArticlesMovements];
let artMvSeq = artMovements.length;

// Matières premières
let matieresMeta = seedMatieres.map((m) => ({ ...m }));
let matieresStock = { ...initialMatieresStock };
let matMovements = [...seedMatieresMovements];
let matMvSeq = matMovements.length;

// Paramètres dynamiques
let params = {
  art_categories: ['Planches', 'Panneaux', 'Charpente', 'Ossature', 'Finition', 'Autre'],
  mp_categories: ['Bois brut', 'Adhésifs', 'Consommables', 'Métaux', 'Emballages', 'Produits chimiques', 'Autre'],
  departements: ['Direction', 'Administration', 'Production', 'Maintenance', 'Qualité', 'Logistique', 'Achats', 'Ressources Humaines', 'Finance'],
  fonctions: ['Technicien maintenance', "Chef d'équipe", 'Électricien', 'Mécanicien', 'Magasinier', 'Responsable maintenance'],
};

// Productions
let productionsList = [...seedProductions];
let prodSeq = productionsList.length + 1;

const prodId = () => `PROD-${String(prodSeq++).padStart(4, '0')}`;
const artMvId = () => `AM-${String(++artMvSeq).padStart(4, '0')}`;
const matMvId = () => `MM-${String(++matMvSeq).padStart(4, '0')}`;

// --- État stock & mouvements (le stock n'est JAMAIS saisi directement) ---
let partsMeta = parts.map((p) => ({ ...p })); // métadonnées éditables (sans stock)
let stock = { ...initialStock };               // stock courant dérivé
let movements = [...seedMovements];            // journal des mouvements
let mvSeq = movements.length;

const MOTIFS = {
  Entrée: ['Réception fournisseur', 'Retour atelier', 'Ajustement inventaire', 'Régularisation'],
  Sortie: ['Consommation OT', 'Sortie atelier', 'Rebut', 'Ajustement inventaire'],
};

// --------- Helpers d'agrégation ---------
const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
const round = (n) => Math.round(n);

function machineCosts() {
  return machines.map((m) => {
    const mos = orders.filter((o) => o.machine === m.code);
    const total = sum(mos, (o) => o.totalCost);
    const labor = sum(mos, (o) => o.laborCost);
    const partsC = sum(mos, (o) => o.partsCost);
    const downtime = sum(mos, (o) => o.downtimeCost);
    const downtimeH = sum(mos, (o) => o.downtimeHours);
    return {
      code: m.code,
      name: m.name,
      unit: m.unit,
      criticality: m.criticality,
      hoursOpen: m.hoursOpen,
      interventions: mos.length,
      laborCost: labor,
      partsCost: partsC,
      downtimeCost: downtime,
      downtimeHours: +downtimeH.toFixed(1),
      totalCost: total,
      // Taux d'ouverture = heures travaillées vs heures de marche
      availability: +(((m.hoursOpen - downtimeH) / m.hoursOpen) * 100).toFixed(1),
    };
  });
}

// --------- Routes ---------

// Dashboard global : tous les indicateurs de tête
app.get('/api/dashboard', (req, res) => {
  const closed = orders.filter((o) => o.status === 'Clôturé');
  const totalCost = sum(orders, (o) => o.totalCost);
  const laborCost = sum(orders, (o) => o.laborCost);
  const partsCost = sum(orders, (o) => o.partsCost);
  const downtimeCost = sum(orders, (o) => o.downtimeCost);
  const downtimeHours = sum(orders, (o) => o.downtimeHours);

  const corrective = orders.filter((o) => o.type === 'Corrective').length;
  const preventive = orders.filter((o) => o.type === 'Préventive').length;

  const lastProd = production[production.length - 1];
  const productivity = round(lastProd.planches / lastProd.heures); // planches / h

  // TRS approximatif : dispo * perf * qualité (démo)
  const dispo = (lastProd.heures - lastProd.arretsH) / lastProd.heures;
  const trs = +(dispo * 0.94 * 0.985 * 100).toFixed(1);

  // Coût de maintenance par unité produite
  const costPerUnit = +(totalCost / lastProd.planches).toFixed(2);

  res.json({
    kpis: {
      totalCost,
      laborCost,
      partsCost,
      downtimeCost,
      downtimeHours: +downtimeHours.toFixed(1),
      openOrders: orders.filter((o) => o.status !== 'Clôturé').length,
      closedOrders: closed.length,
      corrective,
      preventive,
      preventiveRatio: +((preventive / (corrective + preventive)) * 100).toFixed(0),
      productivity,
      trs,
      costPerUnit,
    },
    costBreakdown: [
      { name: "Main d'œuvre", value: laborCost, color: '#FF6A3D' },
      { name: 'Pièces', value: partsCost, color: '#2DD4BF' },
      { name: "Arrêt production", value: downtimeCost, color: '#FBBF24' },
    ],
    costByUnit: units.map((u) => {
      const uos = orders.filter((o) => o.unit === u.id);
      return { id: u.id, name: u.name, color: u.color, value: sum(uos, (o) => o.totalCost) };
    }),
    production,
    topMachines: machineCosts().sort((a, b) => b.totalCost - a.totalCost).slice(0, 5),
    recentOrders: [...orders].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
  });
});

// KPI détaillés
app.get('/api/kpis', (req, res) => {
  const trsTrend = production.map((p) => {
    const dispo = (p.heures - p.arretsH) / p.heures;
    return {
      month: p.month,
      trs: +(dispo * 0.94 * 0.985 * 100).toFixed(1),
      productivity: round(p.planches / p.heures),
      arrets: p.arretsH,
    };
  });
  res.json({
    trsTrend,
    machines: machineCosts(),
    laborRate: LABOR_RATE,
  });
});

// Machines
app.get('/api/machines', (req, res) => res.json(machineCosts()));

// Pièces de rechange (nomenclature) — le stock est DÉRIVÉ des mouvements
function partView(p) {
  const cur = stock[p.ref] || 0;
  const mv = movements.filter((m) => m.ref === p.ref);
  const consumed = mv
    .filter((m) => m.type === 'Sortie' && m.motif === 'Consommation OT')
    .reduce((s, m) => s + m.qty, 0);
  const lastMv = mv.length ? mv[mv.length - 1].date : null;
  return {
    ...p,
    stock: cur,
    consumed,
    stockValue: p.price * cur,
    lowStock: cur < p.stockMin,
    movementsCount: mv.length,
    lastMovement: lastMv,
  };
}

app.get('/api/parts', (req, res) => {
  res.json(partsMeta.map(partView));
});

// Création d'une nouvelle pièce
app.post('/api/parts', (req, res) => {
  const b = req.body || {};

  // Validation
  if (!b.ref || !String(b.ref).trim()) {
    return res.status(400).json({ error: 'La référence est obligatoire' });
  }
  if (!b.name || !String(b.name).trim()) {
    return res.status(400).json({ error: 'La désignation est obligatoire' });
  }

  // Vérifier que la référence n'existe pas déjà
  if (partsMeta.find((p) => p.ref === String(b.ref).toUpperCase())) {
    return res.status(400).json({ error: 'Cette référence existe déjà' });
  }

  // Créer la nouvelle pièce
  const newPart = {
    ref: String(b.ref).toUpperCase(),
    name: String(b.name),
    category: String(b.category || 'Mécanique'),
    price: Math.max(0, Number(b.price) || 0),
    unit: String(b.unit || 'pc'),
    stockMin: Math.max(0, Number(b.stockMin) || 0),
  };

  partsMeta.push(newPart);
  // Initialiser le stock à 0 pour cette pièce
  stock[newPart.ref] = 0;

  res.status(201).json(partView(newPart));
});

// Modification d'une pièce — METADONNÉES UNIQUEMENT (le stock est ignoré)
app.put('/api/parts/:ref', (req, res) => {
  const p = partsMeta.find((x) => x.ref === req.params.ref);
  if (!p) return res.status(404).json({ error: 'Pièce introuvable' });
  const b = req.body || {};
  // Champs autorisés — `stock` volontairement exclu et ignoré
  if (b.name !== undefined) p.name = String(b.name);
  if (b.category !== undefined) p.category = String(b.category);
  if (b.unit !== undefined) p.unit = String(b.unit);
  if (b.price !== undefined) p.price = Math.max(0, Number(b.price) || 0);
  if (b.stockMin !== undefined) p.stockMin = Math.max(0, Number(b.stockMin) || 0);
  res.json(partView(p));
});

// Journal des mouvements (tous, ou filtré par ?ref=)
app.get('/api/movements', (req, res) => {
  let list = [...movements];
  if (req.query.ref) list = list.filter((m) => m.ref === req.query.ref);
  list.sort((a, b) => (b.date === a.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
  res.json(list);
});

// Mouvements d'une pièce
app.get('/api/parts/:ref/movements', (req, res) => {
  const list = movements
    .filter((m) => m.ref === req.params.ref)
    .sort((a, b) => (b.date === a.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date)));
  res.json(list);
});

// Création d'un mouvement — SEUL moyen de faire varier le stock
app.post('/api/movements', (req, res) => {
  const b = req.body || {};
  const p = partsMeta.find((x) => x.ref === b.ref);
  if (!p) return res.status(404).json({ error: 'Pièce introuvable' });

  const type = b.type === 'Sortie' ? 'Sortie' : 'Entrée';
  const qty = Math.abs(Number(b.qty));
  if (!qty || qty <= 0) return res.status(400).json({ error: 'Quantité invalide' });

  const cur = stock[p.ref] || 0;
  if (type === 'Sortie' && qty > cur) {
    return res.status(400).json({ error: `Stock insuffisant : ${cur} ${p.unit} disponibles` });
  }

  const delta = type === 'Entrée' ? qty : -qty;
  stock[p.ref] = cur + delta;

  const mv = {
    id: `MV-${String(++mvSeq).padStart(4, '0')}`,
    ref: p.ref,
    type,
    qty,
    date: b.date || new Date().toISOString().slice(0, 10),
    motif: b.motif || (type === 'Entrée' ? 'Réception fournisseur' : 'Sortie atelier'),
    reference: b.reference || '',
    user: b.user || 'Magasin',
    stockAfter: stock[p.ref],
  };
  movements.push(mv);
  res.status(201).json({ movement: mv, part: partView(p) });
});

app.get('/api/movements-meta', (req, res) => res.json({ motifs: MOTIFS }));

// Ordres de travail (liste)
app.get('/api/workorders', (req, res) => {
  res.json([...orders].sort((a, b) => b.date.localeCompare(a.date)));
});

// Création d'un OT (valorisation automatique)
app.post('/api/workorders', (req, res) => {
  const b = req.body || {};
  const id = `OT-${nextId++}`;
  const ot = valorizeWorkOrder({
    id,
    machine: b.machine,
    type: b.type || 'Corrective',
    priority: b.priority || 'Normale',
    status: b.status || 'Planifié',
    date: b.date || new Date().toISOString().slice(0, 10),
    desc: b.desc || '',
    laborHours: Number(b.laborHours) || 0,
    downtimeHours: Number(b.downtimeHours) || 0,
    parts: Array.isArray(b.parts) ? b.parts : [],
    tech: b.tech || 'Non assigné',
    collaborateurs: Array.isArray(b.collaborateurs) ? b.collaborateurs : [],
  });
  orders.unshift(ot);
  res.status(201).json(ot);
});

// Ajout de pièces sur un OT existant (magasinier, post-diagnostic)
// Crée automatiquement un mouvement de sortie de stock
app.post('/api/workorders/:id/parts', (req, res) => {
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'OT introuvable' });
  const { ref, qty } = req.body || {};
  if (!ref || !qty || qty <= 0) return res.status(400).json({ error: 'ref et qty requis' });

  const part = partsMeta.find((p) => p.ref === ref);
  if (!part) return res.status(404).json({ error: 'Pièce introuvable' });
  if ((stock[ref] || 0) < qty) return res.status(400).json({ error: 'Stock insuffisant' });

  // Mouvement de sortie
  mvSeq += 1;
  const mv = {
    id: `MV-${String(mvSeq).padStart(4, '0')}`,
    ref, type: 'Sortie', qty: Number(qty),
    date: new Date().toISOString().slice(0, 10),
    motif: 'Consommation OT', reference: req.params.id, user: 'Magasin',
    stockAfter: (stock[ref] || 0) - Number(qty),
  };
  stock[ref] = mv.stockAfter;
  movements.push(mv);

  // Mise à jour des pièces sur l'OT + revalorisation
  const existingPart = orders[idx].parts.find((p) => p.ref === ref);
  if (existingPart) {
    existingPart.qty += Number(qty);
  } else {
    orders[idx].parts.push({ ref, qty: Number(qty) });
  }
  orders[idx] = valorizeWorkOrder(orders[idx]);

  res.status(201).json({ workorder: orders[idx], movement: mv });
});

// Modification d'un OT
app.put('/api/workorders/:id', (req, res) => {
  const idx = orders.findIndex((o) => o.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'OT introuvable' });
  const b = req.body || {};
  const updated = valorizeWorkOrder({
    ...orders[idx],
    machine: b.machine ?? orders[idx].machine,
    type: b.type ?? orders[idx].type,
    priority: b.priority ?? orders[idx].priority,
    status: b.status ?? orders[idx].status,
    date: b.date ?? orders[idx].date,
    desc: b.desc ?? orders[idx].desc,
    laborHours: b.laborHours !== undefined ? Number(b.laborHours) : orders[idx].laborHours,
    downtimeHours: b.downtimeHours !== undefined ? Number(b.downtimeHours) : orders[idx].downtimeHours,
    parts: Array.isArray(b.parts) ? b.parts : orders[idx].parts,
    tech: b.tech ?? orders[idx].tech,
    collaborateurs: Array.isArray(b.collaborateurs) ? b.collaborateurs : orders[idx].collaborateurs,
  });
  orders[idx] = updated;
  res.json(updated);
});

// =============================================================
//  PARAMÈTRES (catégories, départements, fonctions)
// =============================================================
app.get('/api/params', (req, res) => res.json(params));

app.put('/api/params/:key', (req, res) => {
  const { key } = req.params;
  if (!Object.prototype.hasOwnProperty.call(params, key)) {
    return res.status(404).json({ error: `Paramètre inconnu : ${key}` });
  }
  const { values } = req.body || {};
  if (!Array.isArray(values)) return res.status(400).json({ error: 'values doit être un tableau' });
  params[key] = values.map(String).filter(Boolean);
  res.json({ key, values: params[key] });
});

// ---- Collaborateurs (paramétrage) ----
app.get('/api/collaborateurs', (req, res) => res.json(collaborateurs));

app.post('/api/collaborateurs', (req, res) => {
  const b = req.body || {};
  if (!b.nom || !b.prenom) return res.status(400).json({ error: 'nom et prenom requis' });
  const col = {
    id: `COL-${String(colSeq++).padStart(3, '0')}`,
    nom: b.nom, prenom: b.prenom,
    matricule: b.matricule || '',
    departement: b.departement || '',
    fonction: b.fonction || '',
  };
  collaborateurs.push(col);
  res.status(201).json(col);
});

app.put('/api/collaborateurs/:id', (req, res) => {
  const idx = collaborateurs.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Collaborateur introuvable' });
  const b = req.body || {};
  collaborateurs[idx] = { ...collaborateurs[idx], ...b, id: collaborateurs[idx].id };
  res.json(collaborateurs[idx]);
});

app.delete('/api/collaborateurs/:id', (req, res) => {
  const idx = collaborateurs.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Collaborateur introuvable' });
  collaborateurs.splice(idx, 1);
  res.json({ ok: true });
});

// =============================================================
//  ARTICLES (Produits finis)
// =============================================================
function articleView(a) {
  const cur = articlesStock[a.ref] || 0;
  const mv = artMovements.filter((m) => m.ref === a.ref);
  const produced = mv.filter((m) => m.motif === 'Production').reduce((s, m) => s + m.qty, 0);
  const shipped = mv.filter((m) => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0);
  const lastMv = mv.length ? mv[mv.length - 1].date : null;
  return { ...a, stock: cur, produced, shipped, stockValue: a.cout_unitaire * cur, lowStock: cur < a.stock_min, movementsCount: mv.length, lastMovement: lastMv };
}

app.get('/api/articles', (req, res) => res.json(articlesMeta.map(articleView)));

app.post('/api/articles', (req, res) => {
  const b = req.body || {};
  if (!b.ref || !b.designation) return res.status(400).json({ error: 'ref et designation requis' });
  if (articlesMeta.find((a) => a.ref === b.ref)) return res.status(400).json({ error: 'Référence déjà existante' });
  const art = { ref: String(b.ref).toUpperCase(), designation: String(b.designation), description: b.description || '', categorie: b.categorie || '', unite: b.unite || 'pc', cout_unitaire: Number(b.cout_unitaire) || 0, stock_min: Number(b.stock_min) || 0, photo: b.photo || null, target: 0 };
  articlesMeta.push(art);
  articlesStock[art.ref] = 0;
  res.status(201).json(articleView(art));
});

app.put('/api/articles/:ref', (req, res) => {
  const a = articlesMeta.find((x) => x.ref === req.params.ref);
  if (!a) return res.status(404).json({ error: 'Article introuvable' });
  const b = req.body || {};
  ['designation', 'description', 'categorie', 'unite', 'photo'].forEach((k) => { if (b[k] !== undefined) a[k] = b[k]; });
  if (b.cout_unitaire !== undefined) a.cout_unitaire = Number(b.cout_unitaire) || 0;
  if (b.stock_min !== undefined) a.stock_min = Number(b.stock_min) || 0;
  res.json(articleView(a));
});

app.delete('/api/articles/:ref', (req, res) => {
  const idx = articlesMeta.findIndex((x) => x.ref === req.params.ref);
  if (idx === -1) return res.status(404).json({ error: 'Article introuvable' });
  const ref = articlesMeta[idx].ref;
  articlesMeta.splice(idx, 1);
  delete articlesStock[ref];
  artMovements = artMovements.filter((m) => m.ref !== ref);
  res.json({ ok: true });
});

app.get('/api/articles/:ref/movements', (req, res) => {
  res.json(artMovements.filter((m) => m.ref === req.params.ref).sort((a, b) => b.date.localeCompare(a.date)));
});

// Mouvement manuel article (expédition, ajustement...)
app.post('/api/articles/:ref/movement', (req, res) => {
  const a = articlesMeta.find((x) => x.ref === req.params.ref);
  if (!a) return res.status(404).json({ error: 'Article introuvable' });
  const { type, qty, motif, reference, user } = req.body || {};
  const q = Number(qty);
  if (!q || q <= 0) return res.status(400).json({ error: 'Quantité invalide' });
  if (type === 'Sortie' && (articlesStock[a.ref] || 0) < q) return res.status(400).json({ error: 'Stock insuffisant' });
  const delta = type === 'Entrée' ? q : -q;
  articlesStock[a.ref] = (articlesStock[a.ref] || 0) + delta;
  const mv = { id: artMvId(), ref: a.ref, type: type || 'Sortie', qty: q, date: new Date().toISOString().slice(0, 10), motif: motif || 'Sortie atelier', reference: reference || '', user: user || 'Magasin', stockAfter: articlesStock[a.ref] };
  artMovements.push(mv);
  res.status(201).json({ movement: mv, article: articleView(a) });
});

// =============================================================
//  MATIÈRES PREMIÈRES
// =============================================================
function matiereView(m) {
  const cur = matieresStock[m.ref] || 0;
  const mv = matMovements.filter((x) => x.ref === m.ref);
  const received = mv.filter((x) => x.type === 'Entrée').reduce((s, x) => s + x.qty, 0);
  const consumed = mv.filter((x) => x.motif === 'Consommation production').reduce((s, x) => s + x.qty, 0);
  const lastMv = mv.length ? mv[mv.length - 1].date : null;
  return { ...m, stock: cur, received, consumed, stockValue: m.cout_unitaire * cur, lowStock: cur < m.stock_min, movementsCount: mv.length, lastMovement: lastMv };
}

app.get('/api/matieres', (req, res) => res.json(matieresMeta.map(matiereView)));

app.post('/api/matieres', (req, res) => {
  const b = req.body || {};
  if (!b.ref || !b.designation) return res.status(400).json({ error: 'ref et designation requis' });
  if (matieresMeta.find((m) => m.ref === b.ref)) return res.status(400).json({ error: 'Référence déjà existante' });
  const mat = { ref: String(b.ref).toUpperCase(), designation: String(b.designation), description: b.description || '', categorie: b.categorie || '', unite: b.unite || 'kg', cout_unitaire: Number(b.cout_unitaire) || 0, stock_min: Number(b.stock_min) || 0, photo: b.photo || null, target: 0 };
  matieresMeta.push(mat);
  matieresStock[mat.ref] = 0;
  res.status(201).json(matiereView(mat));
});

app.put('/api/matieres/:ref', (req, res) => {
  const m = matieresMeta.find((x) => x.ref === req.params.ref);
  if (!m) return res.status(404).json({ error: 'Matière introuvable' });
  const b = req.body || {};
  ['designation', 'description', 'categorie', 'unite', 'photo'].forEach((k) => { if (b[k] !== undefined) m[k] = b[k]; });
  if (b.cout_unitaire !== undefined) m.cout_unitaire = Number(b.cout_unitaire) || 0;
  if (b.stock_min !== undefined) m.stock_min = Number(b.stock_min) || 0;
  res.json(matiereView(m));
});

app.delete('/api/matieres/:ref', (req, res) => {
  const idx = matieresMeta.findIndex((x) => x.ref === req.params.ref);
  if (idx === -1) return res.status(404).json({ error: 'Matière introuvable' });
  const ref = matieresMeta[idx].ref;
  matieresMeta.splice(idx, 1);
  delete matieresStock[ref];
  matMovements = matMovements.filter((m) => m.ref !== ref);
  res.json({ ok: true });
});

app.get('/api/matieres/:ref/movements', (req, res) => {
  res.json(matMovements.filter((m) => m.ref === req.params.ref).sort((a, b) => b.date.localeCompare(a.date)));
});

// Mouvement manuel matière (réception fournisseur, ajustement...)
app.post('/api/matieres/:ref/movement', (req, res) => {
  const mat = matieresMeta.find((x) => x.ref === req.params.ref);
  if (!mat) return res.status(404).json({ error: 'Matière introuvable' });
  const { type, qty, motif, reference, user } = req.body || {};
  const q = Number(qty);
  if (!q || q <= 0) return res.status(400).json({ error: 'Quantité invalide' });
  if (type === 'Sortie' && (matieresStock[mat.ref] || 0) < q) return res.status(400).json({ error: 'Stock insuffisant' });
  const delta = type === 'Entrée' ? q : -q;
  matieresStock[mat.ref] = (matieresStock[mat.ref] || 0) + delta;
  const mv = { id: matMvId(), ref: mat.ref, type: type || 'Entrée', qty: q, date: new Date().toISOString().slice(0, 10), motif: motif || 'Réception fournisseur', reference: reference || '', user: user || 'Magasin', stockAfter: matieresStock[mat.ref] };
  matMovements.push(mv);
  res.status(201).json({ movement: mv, matiere: matiereView(mat) });
});

// =============================================================
//  PRODUCTIONS
// =============================================================
function applyProdStock(prod, reverse = false) {
  const today = new Date().toISOString().slice(0, 10);
  // Articles produits → Entrée (ou Sortie si reversal)
  (prod.articles_produits || []).forEach((a) => {
    const q = Number(a.qte);
    const type = reverse ? 'Sortie' : 'Entrée';
    const delta = reverse ? -q : q;
    articlesStock[a.ref] = (articlesStock[a.ref] || 0) + delta;
    artMovements.push({ id: artMvId(), ref: a.ref, type, qty: q, date: today, motif: reverse ? 'Annulation production' : 'Production', reference: prod.id, user: prod.conducteur || 'Production', stockAfter: articlesStock[a.ref] });
  });
  // Matières consommées → Sortie (ou Entrée si reversal)
  (prod.matieres_consommees || []).forEach((m) => {
    const q = Number(m.qte);
    const type = reverse ? 'Entrée' : 'Sortie';
    const delta = reverse ? q : -q;
    matieresStock[m.ref] = (matieresStock[m.ref] || 0) + delta;
    matMovements.push({ id: matMvId(), ref: m.ref, type, qty: q, date: today, motif: reverse ? 'Annulation production' : 'Consommation production', reference: prod.id, user: prod.conducteur || 'Production', stockAfter: matieresStock[m.ref] });
  });
}

app.get('/api/productions', (req, res) => {
  res.json([...productionsList].sort((a, b) => b.date.localeCompare(a.date)));
});

app.post('/api/productions', (req, res) => {
  const b = req.body || {};
  if (!b.machine || !b.date) return res.status(400).json({ error: 'machine et date requis' });
  const raw = {
    id: prodId(),
    machine: b.machine,
    date: b.date,
    shift_debut: b.shift_debut || '06:00',
    shift_fin: b.shift_fin || '14:00',
    conducteur: b.conducteur || '',
    articles_produits: Array.isArray(b.articles_produits) ? b.articles_produits : [],
    matieres_consommees: Array.isArray(b.matieres_consommees) ? b.matieres_consommees : [],
    temps_arret: Number(b.temps_arret) || 0,
    production_theorique: Number(b.production_theorique) || 0,
    production_conforme: b.production_conforme != null ? Number(b.production_conforme) : null,
    observations: b.observations || '',
  };
  applyProdStock(raw);
  const enriched = enrichProduction(raw, collaborateurs, articlesMeta, matieresMeta);
  productionsList.push(enriched);
  res.status(201).json(enriched);
});

app.put('/api/productions/:id', (req, res) => {
  const idx = productionsList.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Production introuvable' });
  const b = req.body || {};
  // Reversal des anciens mouvements
  applyProdStock(productionsList[idx], true);
  const raw = {
    ...productionsList[idx],
    machine: b.machine ?? productionsList[idx].machine,
    date: b.date ?? productionsList[idx].date,
    shift_debut: b.shift_debut ?? productionsList[idx].shift_debut,
    shift_fin: b.shift_fin ?? productionsList[idx].shift_fin,
    conducteur: b.conducteur ?? productionsList[idx].conducteur,
    articles_produits: Array.isArray(b.articles_produits) ? b.articles_produits : productionsList[idx].articles_produits,
    matieres_consommees: Array.isArray(b.matieres_consommees) ? b.matieres_consommees : productionsList[idx].matieres_consommees,
    temps_arret: b.temps_arret !== undefined ? Number(b.temps_arret) : productionsList[idx].temps_arret,
    production_theorique: b.production_theorique !== undefined ? Number(b.production_theorique) : productionsList[idx].production_theorique,
    production_conforme: b.production_conforme !== undefined ? Number(b.production_conforme) : productionsList[idx].production_conforme,
    observations: b.observations ?? productionsList[idx].observations,
  };
  applyProdStock(raw);
  productionsList[idx] = enrichProduction(raw, collaborateurs, articlesMeta, matieresMeta);
  res.json(productionsList[idx]);
});

app.delete('/api/productions/:id', (req, res) => {
  const idx = productionsList.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Production introuvable' });
  applyProdStock(productionsList[idx], true);
  productionsList.splice(idx, 1);
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'GMAO Becomar API' }));

app.listen(PORT, () => {
  console.log(`✅ GMAO Becomar API en écoute sur http://localhost:${PORT}`);
});
