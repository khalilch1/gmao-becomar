// =============================================================
//  GMAO BECOMAR — Données de démonstration & logique métier
//  Fabricant de panneaux / planches. Pilotage par les coûts.
// =============================================================

// --- Taux horaires (DH/h) ---
const LABOR_RATE = 85;          // Coût main d'œuvre maintenance par heure
const DOWNTIME_RATE_DEFAULT = 1200; // Coût d'arrêt production par heure (DH)

// --- Unités de production ---
const units = [
  { id: 'UP-DEBIT', name: 'Unité Débit & Sciage', color: '#FF6A3D' },
  { id: 'UP-PRESSE', name: 'Unité Pressage', color: '#2DD4BF' },
  { id: 'UP-FINITION', name: 'Unité Finition & Ponçage', color: '#A78BFA' },
  { id: 'UP-ENERGIE', name: 'Énergie & Utilités', color: '#FBBF24' },
];

// --- Machines (codification) ---
const machines = [
  { code: 'DEB-SCI-01', name: 'Ligne de sciage principale', unit: 'UP-DEBIT', criticality: 'Critique', downtimeRate: 2100, hoursOpen: 520 },
  { code: 'DEB-SCI-02', name: 'Scie de reprise', unit: 'UP-DEBIT', criticality: 'Majeure', downtimeRate: 900, hoursOpen: 480 },
  { code: 'PRE-HOT-01', name: 'Presse à chaud 12 plateaux', unit: 'UP-PRESSE', criticality: 'Critique', downtimeRate: 3200, hoursOpen: 510 },
  { code: 'PRE-COL-01', name: 'Encolleuse automatique', unit: 'UP-PRESSE', criticality: 'Majeure', downtimeRate: 1400, hoursOpen: 495 },
  { code: 'FIN-PON-01', name: 'Ponceuse à bande large', unit: 'UP-FINITION', criticality: 'Majeure', downtimeRate: 1100, hoursOpen: 470 },
  { code: 'FIN-DEC-01', name: 'Ligne de découpe & calibrage', unit: 'UP-FINITION', criticality: 'Mineure', downtimeRate: 700, hoursOpen: 460 },
  { code: 'ENE-CHA-01', name: 'Chaudière biomasse', unit: 'UP-ENERGIE', criticality: 'Critique', downtimeRate: 2800, hoursOpen: 540 },
  { code: 'ENE-CMP-01', name: 'Compresseur central', unit: 'UP-ENERGIE', criticality: 'Majeure', downtimeRate: 1500, hoursOpen: 540 },
];

// --- Nomenclature pièces de rechange (articles + prix + seuil) ---
// Le STOCK n'est PAS stocké ici : il est dérivé du journal des mouvements.
// `target` = stock courant attendu (sert à calibrer le stock initial des mouvements).
const parts = [
  { ref: 'PR-ROUL-6204', name: 'Roulement 6204-2RS', price: 78,  stockMin: 20, unit: 'pc', category: 'Mécanique', target: 42 },
  { ref: 'PR-COUR-B85',  name: 'Courroie trapézoïdale B85', price: 145, stockMin: 12, unit: 'pc', category: 'Transmission', target: 8 },
  { ref: 'PR-LAME-450',  name: 'Lame de scie carbure Ø450', price: 1250, stockMin: 4,  unit: 'pc', category: 'Outillage', target: 6 },
  { ref: 'PR-BAND-1900', name: 'Bande abrasive 1900x1350 G80', price: 320, stockMin: 10, unit: 'pc', category: 'Consommable', target: 15 },
  { ref: 'PR-HUIL-460',  name: 'Huile hydraulique ISO VG46', price: 38,  stockMin: 80, unit: 'L', category: 'Lubrifiant', target: 210 },
  { ref: 'PR-VERIN-100', name: 'Vérin hydraulique 100/63', price: 3400, stockMin: 2,  unit: 'pc', category: 'Hydraulique', target: 2 },
  { ref: 'PR-RESIS-15K', name: 'Résistance chauffante 15kW', price: 890, stockMin: 2,  unit: 'pc', category: 'Électrique', target: 3 },
  { ref: 'PR-FILT-AIR',  name: 'Filtre à air compresseur', price: 96,  stockMin: 15, unit: 'pc', category: 'Consommable', target: 24 },
  { ref: 'PR-CAPT-TEMP', name: 'Capteur de température PT100', price: 215, stockMin: 6,  unit: 'pc', category: 'Instrumentation', target: 11 },
  { ref: 'PR-JOINT-PRE', name: 'Kit joints presse', price: 540, stockMin: 3,  unit: 'kit', category: 'Hydraulique', target: 4 },
];

const partsMap = Object.fromEntries(parts.map((p) => [p.ref, p]));

// --- Ordres de travail (OT) ---
// Chaque OT est valorisé : main d'œuvre + pièces + coût d'arrêt production
const rawWorkOrders = [
  { id: 'OT-2406', machine: 'DEB-SCI-01', type: 'Corrective', priority: 'Urgente', status: 'Clôturé', date: '2026-05-28', desc: 'Remplacement lame + roulement broche', laborHours: 4.5, downtimeHours: 3.2, parts: [{ ref: 'PR-LAME-450', qty: 1 }, { ref: 'PR-ROUL-6204', qty: 2 }], tech: 'A. Bennani' },
  { id: 'OT-2407', machine: 'PRE-HOT-01', type: 'Corrective', priority: 'Urgente', status: 'Clôturé', date: '2026-05-27', desc: 'Fuite circuit hydraulique presse', laborHours: 6.0, downtimeHours: 5.5, parts: [{ ref: 'PR-JOINT-PRE', qty: 1 }, { ref: 'PR-HUIL-460', qty: 40 }], tech: 'Y. El Idrissi' },
  { id: 'OT-2408', machine: 'FIN-PON-01', type: 'Préventive', priority: 'Normale', status: 'Clôturé', date: '2026-05-26', desc: 'Changement bande abrasive programmé', laborHours: 1.5, downtimeHours: 1.0, parts: [{ ref: 'PR-BAND-1900', qty: 2 }], tech: 'S. Tahiri' },
  { id: 'OT-2409', machine: 'ENE-CHA-01', type: 'Corrective', priority: 'Urgente', status: 'Clôturé', date: '2026-05-25', desc: 'Résistance HS — perte de température', laborHours: 3.0, downtimeHours: 4.0, parts: [{ ref: 'PR-RESIS-15K', qty: 1 }, { ref: 'PR-CAPT-TEMP', qty: 1 }], tech: 'A. Bennani' },
  { id: 'OT-2410', machine: 'ENE-CMP-01', type: 'Préventive', priority: 'Normale', status: 'Clôturé', date: '2026-05-24', desc: 'Vidange + filtre compresseur', laborHours: 2.0, downtimeHours: 1.5, parts: [{ ref: 'PR-FILT-AIR', qty: 1 }, { ref: 'PR-HUIL-460', qty: 20 }], tech: 'S. Tahiri' },
  { id: 'OT-2411', machine: 'DEB-SCI-02', type: 'Corrective', priority: 'Normale', status: 'En cours', date: '2026-05-30', desc: 'Courroie détendue — vibrations', laborHours: 2.5, downtimeHours: 2.0, parts: [{ ref: 'PR-COUR-B85', qty: 2 }], tech: 'Y. El Idrissi' },
  { id: 'OT-2412', machine: 'PRE-COL-01', type: 'Corrective', priority: 'Urgente', status: 'En cours', date: '2026-05-31', desc: 'Vérin encolleuse bloqué', laborHours: 5.0, downtimeHours: 4.5, parts: [{ ref: 'PR-VERIN-100', qty: 1 }], tech: 'A. Bennani' },
  { id: 'OT-2413', machine: 'FIN-DEC-01', type: 'Préventive', priority: 'Faible', status: 'Planifié', date: '2026-06-04', desc: 'Graissage + contrôle géométrie', laborHours: 1.0, downtimeHours: 0.5, parts: [{ ref: 'PR-ROUL-6204', qty: 1 }], tech: 'S. Tahiri' },
  { id: 'OT-2414', machine: 'PRE-HOT-01', type: 'Préventive', priority: 'Normale', status: 'Planifié', date: '2026-06-05', desc: 'Inspection plateaux & capteurs', laborHours: 3.5, downtimeHours: 2.0, parts: [{ ref: 'PR-CAPT-TEMP', qty: 2 }], tech: 'Y. El Idrissi' },
  { id: 'OT-2415', machine: 'DEB-SCI-01', type: 'Corrective', priority: 'Normale', status: 'Clôturé', date: '2026-05-20', desc: 'Réglage guide + roulement', laborHours: 2.0, downtimeHours: 1.5, parts: [{ ref: 'PR-ROUL-6204', qty: 2 }], tech: 'A. Bennani' },
  { id: 'OT-2416', machine: 'ENE-CHA-01', type: 'Préventive', priority: 'Normale', status: 'Clôturé', date: '2026-05-18', desc: 'Ramonage + contrôle sécurité', laborHours: 4.0, downtimeHours: 2.5, parts: [], tech: 'S. Tahiri' },
  { id: 'OT-2417', machine: 'FIN-PON-01', type: 'Corrective', priority: 'Normale', status: 'Clôturé', date: '2026-05-15', desc: 'Roulement moteur bruyant', laborHours: 2.5, downtimeHours: 2.0, parts: [{ ref: 'PR-ROUL-6204', qty: 2 }, { ref: 'PR-COUR-B85', qty: 1 }], tech: 'Y. El Idrissi' },
];

// --- Valorisation automatique d'un OT ---
function valorizeWorkOrder(ot) {
  const machine = machines.find((m) => m.code === ot.machine) || {};
  const downtimeRate = machine.downtimeRate || DOWNTIME_RATE_DEFAULT;

  const partsDetail = ot.parts.map((p) => {
    const ref = partsMap[p.ref] || { name: p.ref, price: 0, unit: '' };
    return { ref: p.ref, name: ref.name, qty: p.qty, unitPrice: ref.price, total: ref.price * p.qty, unit: ref.unit };
  });

  const laborCost = +(ot.laborHours * LABOR_RATE).toFixed(0);
  const partsCost = +partsDetail.reduce((s, p) => s + p.total, 0).toFixed(0);
  const downtimeCost = +(ot.downtimeHours * downtimeRate).toFixed(0);
  const totalCost = laborCost + partsCost + downtimeCost;

  return {
    ...ot,
    machineName: machine.name,
    unit: machine.unit,
    partsDetail,
    laborCost,
    partsCost,
    downtimeCost,
    totalCost,
  };
}

const workOrders = rawWorkOrders.map(valorizeWorkOrder);

// =============================================================
//  JOURNAL DES MOUVEMENTS DE STOCK
//  Le stock courant est DÉRIVÉ de ces mouvements (jamais saisi
//  directement). Entrées (+) et sorties (−) seulement.
// =============================================================

// Mouvements "manuels" de démonstration (réceptions, rebut, inventaire)
const extraMovements = [
  { ref: 'PR-ROUL-6204', type: 'Entrée', qty: 20, date: '2026-03-15', motif: 'Réception fournisseur', reference: 'BL-3391', user: 'Magasin' },
  { ref: 'PR-COUR-B85',  type: 'Entrée', qty: 4,  date: '2026-04-10', motif: 'Réception fournisseur', reference: 'BL-3478', user: 'Magasin' },
  { ref: 'PR-COUR-B85',  type: 'Sortie', qty: 1,  date: '2026-04-22', motif: 'Rebut',                 reference: 'REB-014', user: 'S. Tahiri' },
  { ref: 'PR-HUIL-460',  type: 'Entrée', qty: 100, date: '2026-04-20', motif: 'Réception fournisseur', reference: 'BL-3502', user: 'Magasin' },
  { ref: 'PR-FILT-AIR',  type: 'Sortie', qty: 2,  date: '2026-05-10', motif: 'Ajustement inventaire',  reference: 'INV-05',  user: 'Magasin' },
];

// Sorties de consommation : générées depuis les OT CLÔTURÉS (consommation réelle)
const consumptionMovements = [];
rawWorkOrders
  .filter((o) => o.status === 'Clôturé')
  .forEach((o) =>
    o.parts.forEach((p) =>
      consumptionMovements.push({
        ref: p.ref, type: 'Sortie', qty: p.qty, date: o.date,
        motif: 'Consommation OT', reference: o.id, user: o.tech,
      })
    )
  );

const allManual = [...extraMovements, ...consumptionMovements];

// Stock initial calibré pour qu'après rejeu des mouvements on retombe sur `target`
const initialMovements = parts.map((p) => {
  const refMoves = allManual.filter((m) => m.ref === p.ref);
  const entr = refMoves.filter((m) => m.type === 'Entrée').reduce((s, m) => s + m.qty, 0);
  const sort = refMoves.filter((m) => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0);
  const qty = p.target + sort - entr; // => stock final = target
  return { ref: p.ref, type: 'Entrée', qty, date: '2026-01-02', motif: 'Stock initial', reference: 'INIT', user: 'Magasin' };
});

// Tri chronologique + numérotation + calcul du stock après chaque mouvement
const running = {};
const seedMovements = [...initialMovements, ...allManual]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((m, i) => {
    const delta = m.type === 'Entrée' ? m.qty : -m.qty;
    running[m.ref] = (running[m.ref] || 0) + delta;
    return {
      id: `MV-${String(i + 1).padStart(4, '0')}`,
      ...m,
      stockAfter: running[m.ref],
    };
  });

// Stock courant initial (dérivé) par référence
const initialStock = { ...running };

// --- Production mensuelle (pour productivité = production / heures) ---
const production = [
  { month: 'Déc', planches: 41200, heures: 232, arretsH: 38 },
  { month: 'Jan', planches: 43800, heures: 240, arretsH: 31 },
  { month: 'Fév', planches: 42100, heures: 228, arretsH: 35 },
  { month: 'Mar', planches: 45600, heures: 240, arretsH: 27 },
  { month: 'Avr', planches: 46900, heures: 238, arretsH: 22 },
  { month: 'Mai', planches: 48000, heures: 240, arretsH: 18 },
];

module.exports = {
  LABOR_RATE,
  units,
  machines,
  parts,
  partsMap,
  workOrders,
  production,
  valorizeWorkOrder,
  seedMovements,
  initialStock,
};
