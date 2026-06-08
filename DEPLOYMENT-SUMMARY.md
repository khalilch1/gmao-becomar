# 📋 Résumé Déploiement - GMAO Becomar sur OVH

## 🎯 Objectif
Déployer l'application GMAO Becomar sur un serveur VPS OVH en production.

---

## 📚 Documentation Disponible

### 1. **DEPLOY-QUICK.md** ⭐ (Recommandé - Commencer ici)
- **Pour qui** : Tous les utilisateurs
- **Temps** : 5-10 minutes
- **Contenu** : 
  - Option script automatisé (1 commande = déploiement complet)
  - Option manuelle pas à pas (pour plus de contrôle)
  - Vérifications rapides
  - Troubleshooting courant

**👉 Commencer par ce fichier !**

---

### 2. **DEPLOYMENT.md** (Guide Complet)
- **Pour qui** : Utilisateurs avancés, customisation
- **Temps** : 20-30 minutes (détail complet)
- **Contenu** :
  - Explication de chaque étape
  - Configuration SSL/HTTPS détaillée
  - Monitoring et logs
  - Sécurité complète
  - Scripts de mise à jour
  - Troubleshooting approfondi

**👉 Consulter pour les détails et customisations**

---

### 3. **deploy-to-ovh.sh** (Script Automatisé)
- **Pour qui** : Utilisateurs qui veulent installer en une commande
- **Temps** : 15-20 minutes (installation entièrement automatisée)
- **Utilisation** :
```bash
chmod +x deploy-to-ovh.sh
./deploy-to-ovh.sh root@192.168.1.100 my-domain.com
```

**👉 Exécuter ce script pour un déploiement sans stress**

---

## 🚀 Démarrage Rapide

### Cas 1 : Je veux juste que ça marche rapidement
```bash
# Sur votre ordinateur local
./deploy-to-ovh.sh root@YOUR_VPS_IP your-domain.com
```
✅ Tout est fait automatiquement !

---

### Cas 2 : Je veux comprendre ce qui se passe
```bash
# Lire DEPLOY-QUICK.md
# Suivre l'option "Installation Manuelle (Pas à Pas)"
```
✅ Vous gardez le contrôle de chaque étape

---

### Cas 3 : Je veux personnaliser (ports, domaines multiples, etc.)
```bash
# Lire DEPLOYMENT.md (guide complet)
# Adapter les configurations selon vos besoins
```
✅ Maximum de flexibilité

---

## 📊 Comparaison des Options

| | Script Auto | Manual Step-by-Step | Guide Complet |
|--|--|--|--|
| **Temps** | 15-20 min | 20-30 min | À votre rythme |
| **Facilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Contrôle** | Non | Oui | Oui |
| **Fichier** | `deploy-to-ovh.sh` | `DEPLOY-QUICK.md` | `DEPLOYMENT.md` |
| **Risque erreur** | Minime | Moyen | Faible |

---

## ✅ Checklist Avant Déploiement

- [ ] J'ai un VPS OVH avec accès SSH
- [ ] J'ai l'IP du VPS ou le domaine
- [ ] Mon domaine DNS est configuré (optionnel mais recommandé)
- [ ] Git est installé en local (pour le script)
- [ ] Je connais ma clé SSH ou mon mot de passe

---

## 🎓 Ce Qui Se Passe (Résumé)

```
┌─────────────────────────────────────────┐
│   Your Development Machine              │
│                                         │
│  1. Exécute le script deploy-to-ovh.sh  │
│  2. Se connecte au VPS via SSH          │
│  3. Transfère le code du projet         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   VPS OVH (192.168.1.100)              │
│                                         │
│  1. Installe Node.js, Nginx, PM2        │
│  2. Télécharge et installe les dépend. │
│  3. Build le frontend (React)           │
│  4. Lance le backend avec PM2           │
│  5. Configure Nginx comme reverse proxy │
│  6. Installe certificat SSL gratuit     │
│  7. Configure le firewall               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   Application En Ligne                  │
│                                         │
│  https://your-domain.com                │
│                                         │
│  ✅ Sécurisée (HTTPS/SSL)               │
│  ✅ Performance optimisée                │
│  ✅ Auto-redémarrage (PM2)              │
│  ✅ Logs centralisés                    │
└─────────────────────────────────────────┘
```

---

## 🔧 Architecture Finale

```
┌────────────────────────────────────┐
│         Internet                   │
│  https://your-domain.com:443       │
└────────────────────────────────────┘
            ↓
┌────────────────────────────────────┐
│   NGINX (Reverse Proxy)            │
│   Port 80 (HTTP)                   │
│   Port 443 (HTTPS/SSL)             │
└────────────────────────────────────┘
       ↙                        ↘
┌──────────────────┐    ┌──────────────────┐
│ Frontend (React) │    │ Backend (Node.js)│
│ /frontend/dist   │    │ Port 4000        │
│ (Fichiers statiq)│    │ (API JSON)       │
└──────────────────┘    └──────────────────┘

            ↙
┌────────────────────────────────────┐
│  PM2 (Process Manager)             │
│  - Auto-restart                    │
│  - Load balancing                  │
│  - Monitoring                      │
└────────────────────────────────────┘
```

---

## 📱 Après Déploiement

### URLs d'Accès
```
Frontend:  https://your-domain.com
API:       https://your-domain.com/api/dashboard
Health:    https://your-domain.com/api/health
```

### Commandes Utiles (sur le VPS)
```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs gmao-backend

# Redémarrer
pm2 restart gmao-backend

# Arrêter
pm2 stop gmao-backend

# Voir l'utilisation des ressources
pm2 monit
```

### Mettre à Jour (Prochaines Fois)
```bash
cd /home/gmao/gmao-becomar
git pull origin main
npm --prefix frontend run build
pm2 restart gmao-backend
```

---

## 🆘 Aide Rapide

| Problème | Solution |
|--|--|
| L'app ne démarre pas | `pm2 logs gmao-backend` pour voir l'erreur |
| Nginx 502 Bad Gateway | Vérifier que le backend répond : `curl http://localhost:4000/api/health` |
| SSL/Certificat expiré | `certbot renew` |
| Permissions refusées | `chown -R gmao:gmao /home/gmao/gmao-becomar` |
| Domaine ne pointe pas | Vérifier DNS, attendre 24h propagation |

---

## 🎯 Prochaines Étapes

### ✅ Après Déploiement
1. Accéder à `https://your-domain.com`
2. Vérifier que tout fonctionne
3. Lire les logs si problème : `pm2 logs gmao-backend`
4. Configurer les backups (important !)

### 🔐 Sécurité
1. Changer le mot de passe root
2. Désactiver SSH par password (utiliser clés SSH)
3. Configurer un firewall
4. Mettre en place des monitoring/alertes

### 📊 Monitoring
1. Installer New Relic ou Datadog (optionnel)
2. Configurer les alertes emails
3. Sauvegarder les données régulièrement

---

## 📞 Support

- **Documentation complète** : Voir `DEPLOYMENT.md`
- **Questions sur OVH** : [Contact OVH Support](https://www.ovh.com/support)
- **Questions sur Node.js** : [Node.js Docs](https://nodejs.org/docs)
- **Questions sur Nginx** : [Nginx Docs](https://nginx.org/en/docs)

---

## 🎬 Commençons !

### Étape 1 : Lire DEPLOY-QUICK.md
```bash
cat DEPLOY-QUICK.md
```

### Étape 2 : Choisir votre approche
- **Script auto** : `./deploy-to-ovh.sh`
- **Manuel** : Suivre DEPLOY-QUICK.md

### Étape 3 : Profiter ! 🎉
```
https://your-domain.com ✅
```

---

**Bonne chance ! 🚀**
