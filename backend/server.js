// =============================================================
//  GMAO BECOMAR — Serveur API (Node.js / Express)
// =============================================================
const express = require('express');
const cors = require('cors');
const {
  LABOR_RATE,
  units,
  machines,
  parts,
  workOrders,
  production,
  valorizeWorkOrder,
  seedMovements,
  initialStock,
} = require('./data');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// État mutable en mémoire (les OT créés s'ajoutent ici)
let orders = [...workOrders];
let nextId = 2418;

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
  });
  orders.unshift(ot);
  res.status(201).json(ot);
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'GMAO Becomar API' }));

app.listen(PORT, () => {
  console.log(`✅ GMAO Becomar API en écoute sur http://localhost:${PORT}`);
});
