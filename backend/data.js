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

// --- Collaborateurs (personnel maintenance) ---
const collaborateurs = [
  { id: 'COL-001', nom: 'Bennani',    prenom: 'Ahmed',   matricule: 'MTR-0042', departement: 'Maintenance', fonction: 'Technicien maintenance', equipe: 'Équipe A' },
  { id: 'COL-002', nom: 'El Idrissi', prenom: 'Youssef', matricule: 'MTR-0057', departement: 'Maintenance', fonction: 'Technicien maintenance', equipe: 'Équipe B' },
  { id: 'COL-003', nom: 'Tahiri',     prenom: 'Samir',   matricule: 'MTR-0063', departement: 'Maintenance', fonction: 'Technicien maintenance', equipe: 'Équipe A' },
  { id: 'COL-004', nom: 'Ouali',      prenom: 'Khalid',  matricule: 'MTR-0071', departement: 'Maintenance', fonction: 'Chef d\'équipe',         equipe: 'Équipe A' },
  { id: 'COL-005', nom: 'Ziani',      prenom: 'Rachid',  matricule: 'MTR-0085', departement: 'Maintenance', fonction: 'Électricien',            equipe: 'Équipe B' },
];

// --- Ordres de travail (OT) ---
// Chaque OT est valorisé : main d'œuvre + pièces + coût d'arrêt production
const rawWorkOrders = [
  { id: 'OT-2406', machine: 'DEB-SCI-01', type: 'Corrective', priority: 'Urgente', status: 'Clôturé', date: '2026-05-28', desc: 'Remplacement lame + roulement broche', laborHours: 4.5, downtimeHours: 3.2, parts: [{ ref: 'PR-LAME-450', qty: 1 }, { ref: 'PR-ROUL-6204', qty: 2 }], tech: 'A. Bennani', collaborateurs: ['COL-001', 'COL-003'] },
  { id: 'OT-2407', machine: 'PRE-HOT-01', type: 'Corrective', priority: 'Urgente', status: 'Clôturé', date: '2026-05-27', desc: 'Fuite circuit hydraulique presse', laborHours: 6.0, downtimeHours: 5.5, parts: [{ ref: 'PR-JOINT-PRE', qty: 1 }, { ref: 'PR-HUIL-460', qty: 40 }], tech: 'Y. El Idrissi', collaborateurs: ['COL-002', 'COL-004'] },
  { id: 'OT-2408', machine: 'FIN-PON-01', type: 'Préventive', priority: 'Normale', status: 'Clôturé', date: '2026-05-26', desc: 'Changement bande abrasive programmé', laborHours: 1.5, downtimeHours: 1.0, parts: [{ ref: 'PR-BAND-1900', qty: 2 }], tech: 'S. Tahiri', collaborateurs: ['COL-003'] },
  { id: 'OT-2409', machine: 'ENE-CHA-01', type: 'Corrective', priority: 'Urgente', status: 'Clôturé', date: '2026-05-25', desc: 'Résistance HS — perte de température', laborHours: 3.0, downtimeHours: 4.0, parts: [{ ref: 'PR-RESIS-15K', qty: 1 }, { ref: 'PR-CAPT-TEMP', qty: 1 }], tech: 'A. Bennani', collaborateurs: ['COL-001', 'COL-005'] },
  { id: 'OT-2410', machine: 'ENE-CMP-01', type: 'Préventive', priority: 'Normale', status: 'Clôturé', date: '2026-05-24', desc: 'Vidange + filtre compresseur', laborHours: 2.0, downtimeHours: 1.5, parts: [{ ref: 'PR-FILT-AIR', qty: 1 }, { ref: 'PR-HUIL-460', qty: 20 }], tech: 'S. Tahiri', collaborateurs: ['COL-003'] },
  { id: 'OT-2411', machine: 'DEB-SCI-02', type: 'Corrective', priority: 'Normale', status: 'En cours', date: '2026-05-30', desc: 'Courroie détendue — vibrations', laborHours: 2.5, downtimeHours: 2.0, parts: [{ ref: 'PR-COUR-B85', qty: 2 }], tech: 'Y. El Idrissi', collaborateurs: ['COL-002'] },
  { id: 'OT-2412', machine: 'PRE-COL-01', type: 'Corrective', priority: 'Urgente', status: 'En cours', date: '2026-05-31', desc: 'Vérin encolleuse bloqué', laborHours: 5.0, downtimeHours: 4.5, parts: [{ ref: 'PR-VERIN-100', qty: 1 }], tech: 'A. Bennani', collaborateurs: ['COL-001', 'COL-004', 'COL-005'] },
  { id: 'OT-2413', machine: 'FIN-DEC-01', type: 'Préventive', priority: 'Faible', status: 'Planifié', date: '2026-06-04', desc: 'Graissage + contrôle géométrie', laborHours: 1.0, downtimeHours: 0.5, parts: [{ ref: 'PR-ROUL-6204', qty: 1 }], tech: 'S. Tahiri', collaborateurs: ['COL-003'] },
  { id: 'OT-2414', machine: 'PRE-HOT-01', type: 'Préventive', priority: 'Normale', status: 'Planifié', date: '2026-06-05', desc: 'Inspection plateaux & capteurs', laborHours: 3.5, downtimeHours: 2.0, parts: [{ ref: 'PR-CAPT-TEMP', qty: 2 }], tech: 'Y. El Idrissi', collaborateurs: ['COL-002', 'COL-003'] },
  { id: 'OT-2415', machine: 'DEB-SCI-01', type: 'Corrective', priority: 'Normale', status: 'Clôturé', date: '2026-05-20', desc: 'Réglage guide + roulement', laborHours: 2.0, downtimeHours: 1.5, parts: [{ ref: 'PR-ROUL-6204', qty: 2 }], tech: 'A. Bennani', collaborateurs: ['COL-001'] },
  { id: 'OT-2416', machine: 'ENE-CHA-01', type: 'Préventive', priority: 'Normale', status: 'Clôturé', date: '2026-05-18', desc: 'Ramonage + contrôle sécurité', laborHours: 4.0, downtimeHours: 2.5, parts: [], tech: 'S. Tahiri', collaborateurs: ['COL-003', 'COL-004'] },
  { id: 'OT-2417', machine: 'FIN-PON-01', type: 'Corrective', priority: 'Normale', status: 'Clôturé', date: '2026-05-15', desc: 'Roulement moteur bruyant', laborHours: 2.5, downtimeHours: 2.0, parts: [{ ref: 'PR-ROUL-6204', qty: 2 }, { ref: 'PR-COUR-B85', qty: 1 }], tech: 'Y. El Idrissi', collaborateurs: ['COL-002', 'COL-005'] },
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

// =============================================================
//  ARTICLES (Produits finis)
// =============================================================
const articles = [
  { ref: 'ART-PLN-22', designation: 'Planche rabotée 22mm',     description: 'Planche de sapin rabotée 4 faces, épaisseur 22mm', categorie: 'Planches',  unite: 'ml',     cout_unitaire: 18,  stock_min: 500, photo: null, target: 2200 },
  { ref: 'ART-PLN-18', designation: 'Planche rabotée 18mm',     description: 'Planche de sapin rabotée 4 faces, épaisseur 18mm', categorie: 'Planches',  unite: 'ml',     cout_unitaire: 15,  stock_min: 300, photo: null, target: 1600 },
  { ref: 'ART-PNL-12', designation: 'Panneau contreplaqué 12mm', description: 'Panneau 2440×1220mm, 12mm épaisseur',               categorie: 'Panneaux',  unite: 'm²',     cout_unitaire: 45,  stock_min: 100, photo: null, target: 350  },
  { ref: 'ART-PNL-18', designation: 'Panneau contreplaqué 18mm', description: 'Panneau 2440×1220mm, 18mm épaisseur',               categorie: 'Panneaux',  unite: 'm²',     cout_unitaire: 65,  stock_min: 80,  photo: null, target: 250  },
  { ref: 'ART-CHV-45', designation: 'Chevron 45×70mm',          description: 'Chevron raboté sapin, section 45×70mm',             categorie: 'Charpente', unite: 'ml',     cout_unitaire: 22,  stock_min: 200, photo: null, target: 900  },
];
const articlesMap = Object.fromEntries(articles.map((a) => [a.ref, a]));

// =============================================================
//  MATIÈRES PREMIÈRES
// =============================================================
const matieres = [
  { ref: 'MP-BOIS-SAP', designation: 'Grumes de sapin',     description: 'Bois brut de sciage, sapin',                     categorie: 'Bois brut',     unite: 'm³',     cout_unitaire: 320, stock_min: 20,  photo: null, target: 38  },
  { ref: 'MP-BOIS-CHE', designation: 'Grumes de chêne',     description: 'Bois brut de sciage, chêne',                     categorie: 'Bois brut',     unite: 'm³',     cout_unitaire: 480, stock_min: 10,  photo: null, target: 18  },
  { ref: 'MP-COLE-PVA', designation: 'Colle PVA D3',        description: 'Colle vinylique résistante humidité classe D3',  categorie: 'Adhésifs',      unite: 'kg',     cout_unitaire: 8.5, stock_min: 50,  photo: null, target: 130 },
  { ref: 'MP-RES-UF',   designation: 'Résine urée-formol',  description: 'Résine thermodurcissable pour panneaux',         categorie: 'Adhésifs',      unite: 'kg',     cout_unitaire: 6.2, stock_min: 100, photo: null, target: 210 },
  { ref: 'MP-ABRS-80',  designation: 'Abrasif grain 80',    description: 'Papier abrasif rouleau 1900mm, grain 80',        categorie: 'Consommables',  unite: 'rouleau', cout_unitaire: 45,  stock_min: 20,  photo: null, target: 42  },
];
const matieresMap = Object.fromEntries(matieres.map((m) => [m.ref, m]));

// =============================================================
//  CALCUL TRS
// =============================================================
function parseHeure(t) {
  const [h, m] = (t || '08:00').split(':').map(Number);
  return h + m / 60;
}

function calcTRS(prod) {
  const duree = Math.max(0.1, parseHeure(prod.shift_fin) - parseHeure(prod.shift_debut));
  const ta = Math.min(Number(prod.temps_arret || 0), duree);
  const dispo = (duree - ta) / duree;
  const totalProd = (prod.articles_produits || []).reduce((s, a) => s + Number(a.qte || 0), 0);
  const theorique = Number(prod.production_theorique || 0);
  const perf = theorique > 0 ? Math.min(1, totalProd / theorique) : 1;
  const conforme = prod.production_conforme != null ? Math.min(Number(prod.production_conforme), totalProd) : totalProd;
  const qualite = totalProd > 0 ? conforme / totalProd : 1;
  return {
    duree_shift: +duree.toFixed(2),
    disponibilite: +(dispo * 100).toFixed(1),
    performance: +(perf * 100).toFixed(1),
    qualite: +(qualite * 100).toFixed(1),
    trs: +(dispo * perf * qualite * 100).toFixed(1),
  };
}

function enrichProduction(prod, collaborateursArr) {
  const machine = machines.find((m) => m.code === prod.machine) || {};
  const conducteurObj = (collaborateursArr || collaborateurs).find((c) => c.id === prod.conducteur);
  const articlesDetail = (prod.articles_produits || []).map((a) => {
    const art = articlesMap[a.ref] || { designation: a.ref, cout_unitaire: 0, unite: '' };
    return { ref: a.ref, designation: art.designation, qte: Number(a.qte), cout_unitaire: art.cout_unitaire, unite: art.unite, total: art.cout_unitaire * Number(a.qte) };
  });
  const matieresDetail = (prod.matieres_consommees || []).map((m) => {
    const mat = matieresMap[m.ref] || { designation: m.ref, cout_unitaire: 0, unite: '' };
    return { ref: m.ref, designation: mat.designation, qte: Number(m.qte), cout_unitaire: mat.cout_unitaire, unite: mat.unite, total: mat.cout_unitaire * Number(m.qte) };
  });
  const trsData = calcTRS(prod);
  return {
    ...prod,
    machineName: machine.name || prod.machine,
    conducteurNom: conducteurObj ? `${conducteurObj.prenom} ${conducteurObj.nom}` : (prod.conducteur || '—'),
    articlesDetail,
    matieresDetail,
    cout_matieres: +matieresDetail.reduce((s, m) => s + m.total, 0).toFixed(2),
    valeur_production: +articlesDetail.reduce((s, a) => s + a.total, 0).toFixed(2),
    ...trsData,
  };
}

// =============================================================
//  PRODUCTIONS (sessions de production)
// =============================================================
const rawProductions = [
  { id: 'PROD-0001', machine: 'DEB-SCI-01', date: '2026-05-15', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-001', articles_produits: [{ ref: 'ART-PLN-22', qte: 480 }, { ref: 'ART-CHV-45', qte: 120 }], matieres_consommees: [{ ref: 'MP-BOIS-SAP', qte: 3.2 }], temps_arret: 0.5, production_theorique: 700, production_conforme: 570 },
  { id: 'PROD-0002', machine: 'FIN-PON-01', date: '2026-05-15', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-003', articles_produits: [{ ref: 'ART-PLN-22', qte: 320 }, { ref: 'ART-PLN-18', qte: 200 }], matieres_consommees: [{ ref: 'MP-ABRS-80', qte: 4 }], temps_arret: 1.0, production_theorique: 600, production_conforme: 510 },
  { id: 'PROD-0003', machine: 'DEB-SCI-01', date: '2026-05-20', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-001', articles_produits: [{ ref: 'ART-PLN-22', qte: 520 }, { ref: 'ART-PLN-18', qte: 180 }], matieres_consommees: [{ ref: 'MP-BOIS-SAP', qte: 3.8 }], temps_arret: 0, production_theorique: 700, production_conforme: 695 },
  { id: 'PROD-0004', machine: 'PRE-HOT-01', date: '2026-05-25', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-002', articles_produits: [{ ref: 'ART-PNL-12', qte: 85 }, { ref: 'ART-PNL-18', qte: 60 }], matieres_consommees: [{ ref: 'MP-COLE-PVA', qte: 28 }, { ref: 'MP-RES-UF', qte: 42 }], temps_arret: 1.5, production_theorique: 180, production_conforme: 138 },
  { id: 'PROD-0005', machine: 'DEB-SCI-01', date: '2026-05-28', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-001', articles_produits: [{ ref: 'ART-PLN-22', qte: 380 }], matieres_consommees: [{ ref: 'MP-BOIS-SAP', qte: 2.4 }], temps_arret: 3.2, production_theorique: 700, production_conforme: 370 },
  { id: 'PROD-0006', machine: 'PRE-HOT-01', date: '2026-06-01', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-002', articles_produits: [{ ref: 'ART-PNL-12', qte: 95 }, { ref: 'ART-PNL-18', qte: 72 }], matieres_consommees: [{ ref: 'MP-COLE-PVA', qte: 32 }, { ref: 'MP-RES-UF', qte: 48 }], temps_arret: 0, production_theorique: 180, production_conforme: 165 },
  { id: 'PROD-0007', machine: 'FIN-PON-01', date: '2026-06-05', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-003', articles_produits: [{ ref: 'ART-PLN-22', qte: 490 }, { ref: 'ART-PLN-18', qte: 220 }], matieres_consommees: [{ ref: 'MP-ABRS-80', qte: 5 }], temps_arret: 0, production_theorique: 700, production_conforme: 700 },
  { id: 'PROD-0008', machine: 'DEB-SCI-01', date: '2026-06-10', shift_debut: '06:00', shift_fin: '14:00', conducteur: 'COL-001', articles_produits: [{ ref: 'ART-PLN-22', qte: 540 }, { ref: 'ART-CHV-45', qte: 160 }], matieres_consommees: [{ ref: 'MP-BOIS-SAP', qte: 3.6 }, { ref: 'MP-BOIS-CHE', qte: 0.8 }], temps_arret: 0, production_theorique: 700, production_conforme: 695 },
];

const productions = rawProductions.map((p) => enrichProduction(p));

// =============================================================
//  STOCKS ARTICLES & MATIÈRES (dérivés des mouvements)
// =============================================================

// Mouvements manuels articles (expéditions, rebuts)
const articlesExtraMovements = [
  { ref: 'ART-PLN-22', type: 'Sortie', qty: 800,  date: '2026-05-22', motif: 'Expédition client', reference: 'BC-1041', user: 'Expédition' },
  { ref: 'ART-PLN-18', type: 'Sortie', qty: 300,  date: '2026-05-22', motif: 'Expédition client', reference: 'BC-1041', user: 'Expédition' },
  { ref: 'ART-PNL-12', type: 'Sortie', qty: 80,   date: '2026-06-02', motif: 'Expédition client', reference: 'BC-1058', user: 'Expédition' },
  { ref: 'ART-PNL-18', type: 'Sortie', qty: 60,   date: '2026-06-02', motif: 'Expédition client', reference: 'BC-1058', user: 'Expédition' },
  { ref: 'ART-CHV-45', type: 'Sortie', qty: 200,  date: '2026-06-08', motif: 'Expédition client', reference: 'BC-1062', user: 'Expédition' },
];

// Mouvements automatiques depuis productions (Entrée articles produits)
const artProdMovements = [];
rawProductions.forEach((p) =>
  (p.articles_produits || []).forEach((a) =>
    artProdMovements.push({ ref: a.ref, type: 'Entrée', qty: Number(a.qte), date: p.date, motif: 'Production', reference: p.id, user: p.conducteur })
  )
);

const allArticlesMovements = [...articlesExtraMovements, ...artProdMovements];

// Stock initial articles calibré sur target
const runningArt = {};
const articlesInitMovements = articles.map((a) => {
  const mv = allArticlesMovements.filter((m) => m.ref === a.ref);
  const entr = mv.filter((m) => m.type === 'Entrée').reduce((s, m) => s + m.qty, 0);
  const sort = mv.filter((m) => m.type === 'Sortie').reduce((s, m) => s + m.qty, 0);
  const qty = a.target + sort - entr;
  return { ref: a.ref, type: 'Entrée', qty: Math.max(0, qty), date: '2026-01-02', motif: 'Stock initial', reference: 'INIT', user: 'Magasin' };
});

const runningArt2 = {};
const seedArticlesMovements = [...articlesInitMovements, ...allArticlesMovements]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((m, i) => {
    const delta = m.type === 'Entrée' ? m.qty : -m.qty;
    runningArt2[m.ref] = (runningArt2[m.ref] || 0) + delta;
    return { id: `AM-${String(i + 1).padStart(4, '0')}`, ...m, stockAfter: runningArt2[m.ref] };
  });
const initialArticlesStock = { ...runningArt2 };

// Mouvements manuels matières (réceptions fournisseur)
const matieresExtraMovements = [
  { ref: 'MP-BOIS-SAP', type: 'Entrée', qty: 15, date: '2026-05-10', motif: 'Réception fournisseur', reference: 'BL-8821', user: 'Magasin' },
  { ref: 'MP-BOIS-CHE', type: 'Entrée', qty: 8,  date: '2026-05-10', motif: 'Réception fournisseur', reference: 'BL-8821', user: 'Magasin' },
  { ref: 'MP-COLE-PVA', type: 'Entrée', qty: 80, date: '2026-05-12', motif: 'Réception fournisseur', reference: 'BL-8835', user: 'Magasin' },
  { ref: 'MP-RES-UF',   type: 'Entrée', qty: 120, date: '2026-05-12', motif: 'Réception fournisseur', reference: 'BL-8835', user: 'Magasin' },
  { ref: 'MP-ABRS-80',  type: 'Entrée', qty: 20, date: '2026-05-14', motif: 'Réception fournisseur', reference: 'BL-8839', user: 'Magasin' },
];

// Mouvements automatiques depuis productions (Sortie matières consommées)
const matProdMovements = [];
rawProductions.forEach((p) =>
  (p.matieres_consommees || []).forEach((m) =>
    matProdMovements.push({ ref: m.ref, type: 'Sortie', qty: Number(m.qte), date: p.date, motif: 'Consommation production', reference: p.id, user: p.conducteur })
  )
);

const allMatieresMovements = [...matieresExtraMovements, ...matProdMovements];

// Stock initial matières calibré sur target
const runningMat = {};
const matieresInitMovements = matieres.map((m) => {
  const mv = allMatieresMovements.filter((x) => x.ref === m.ref);
  const entr = mv.filter((x) => x.type === 'Entrée').reduce((s, x) => s + x.qty, 0);
  const sort = mv.filter((x) => x.type === 'Sortie').reduce((s, x) => s + x.qty, 0);
  const qty = m.target + sort - entr;
  return { ref: m.ref, type: 'Entrée', qty: Math.max(0, qty), date: '2026-01-02', motif: 'Stock initial', reference: 'INIT', user: 'Magasin' };
});

const runningMat2 = {};
const seedMatieresMovements = [...matieresInitMovements, ...allMatieresMovements]
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((m, i) => {
    const delta = m.type === 'Entrée' ? m.qty : -m.qty;
    runningMat2[m.ref] = (runningMat2[m.ref] || 0) + delta;
    return { id: `MM-${String(i + 1).padStart(4, '0')}`, ...m, stockAfter: runningMat2[m.ref] };
  });
const initialMatieresStock = { ...runningMat2 };

module.exports = {
  LABOR_RATE,
  units,
  machines,
  parts,
  partsMap,
  collaborateurs,
  workOrders,
  production,
  valorizeWorkOrder,
  seedMovements,
  initialStock,
  // Production
  articles,
  articlesMap,
  matieres,
  matieresMap,
  productions,
  enrichProduction,
  calcTRS,
  seedArticlesMovements,
  initialArticlesStock,
  seedMatieresMovements,
  initialMatieresStock,
};
