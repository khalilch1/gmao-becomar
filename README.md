# GMAO Becomar — Pilotage de la maintenance par les coûts

Application full-stack **React + Node.js** issue de la présentation *« GMAO & Performance Industrielle — Becomar »*.
Objectif : passer d'une maintenance corrective subie à un **pilotage industriel basé sur les données**, où
chaque ordre de travail est valorisé en coût réel complet.

> **Idée centrale** : `Coût total d'un OT = Main d'œuvre + Pièces + Coût d'arrêt production`
> Le coût d'arrêt — la « perte invisible » — représente la majeure partie du coût réel et n'est
> habituellement pas suivi. La GMAO le rend visible et pilotable.

---

## Démarrage rapide

Pré-requis : **Node.js 18+**.

```bash
# 1) Backend (API REST) — port 4000
cd backend
npm install
npm start

# 2) Frontend (interface React) — port 5173, dans un second terminal
cd frontend
npm install
npm run dev
```

Ouvrir ensuite **http://localhost:5173**.
Le frontend appelle l'API via un proxy Vite (`/api` → `http://localhost:4000`), aucune config réseau nécessaire.

---

## Pages de l'application

| Page | Contenu |
|------|---------|
| **Tableau de bord** | KPI Direction (coût total, coût d'arrêt, TRS, coût/planche), structure du coût, machines les plus coûteuses, production vs arrêts, OT récents. |
| **Ordres de travail** | Liste des OT valorisés + formulaire de création avec **valorisation automatique**. |
| **Machines & Coûts** | Coût et disponibilité par machine, criticité, priorisation par impact financier. |
| **Pièces de rechange** | Nomenclature (article + prix + stock), consommation par OT, valeur de stock, alertes de réapprovisionnement. |
| **KPI & Performance** | Évolution du TRS, productivité vs heures d'arrêt, liste des KPI suivis. |

---

## Architecture

```
gmao-becomar/
├── backend/                 # Node.js + Express
│   ├── server.js            # API REST + agrégations (dashboard, kpis, machines, parts, OT)
│   ├── data.js              # Données de démo + logique de valorisation des OT
│   └── package.json
└── frontend/                # React + Vite + Recharts + lucide-react
    ├── index.html
    ├── vite.config.js        # proxy /api → backend
    └── src/
        ├── App.jsx           # layout, navigation, formatters
        ├── api.js            # client API
        ├── styles.css        # design system industriel (thème sombre)
        ├── components/Common.jsx
        └── pages/            # Dashboard, WorkOrders, Machines, Parts, Analytics
```

### Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/dashboard` | KPI agrégés, répartition des coûts, top machines, production. |
| GET | `/api/kpis` | Tendances TRS / productivité. |
| GET | `/api/machines` | Coût et disponibilité par machine. |
| GET | `/api/parts` | Nomenclature + consommation + alertes stock. |
| GET | `/api/workorders` | Liste des ordres de travail valorisés. |
| POST | `/api/workorders` | Crée un OT et le valorise automatiquement. |

---

## Modèle de coût

- **Main d'œuvre** = heures d'intervention × taux horaire (85 DH/h, paramétrable dans `data.js`).
- **Pièces** = quantités consommées × prix unitaire (nomenclature).
- **Coût d'arrêt** = heures d'arrêt × coût horaire d'arrêt propre à chaque machine
  (une presse à chaud immobilisée coûte bien plus qu'une scie de reprise).

Les KPI dérivés : **TRS**, **productivité** (production / heures), **coût par unité produite**,
**disponibilité machine**, taux préventif/correctif.

---

## Pour aller vers la production

Les données sont actuellement en mémoire (jeu de démonstration). Pour un déploiement réel :

1. **Base de données** : remplacer `data.js` par PostgreSQL ou MongoDB.
2. **Intégrations** : pointage RH, production et stock (slides 7 et 13 de la présentation).
3. **Authentification** : rôles (DG, responsable maintenance, technicien).
4. **Industrie 4.0** : ingestion de capteurs machines, application mobile technicien.

---

*Design : thème industriel sombre — Archivo (titres), IBM Plex Sans (texte), IBM Plex Mono (données).*
