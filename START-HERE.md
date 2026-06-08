# 🎯 DÉMARRER ICI - Déploiement OVH

## Vous êtes venu à la bonne place ! 👋

Vous avez un VPS OVH et vous voulez déployer GMAO Becomar. Voici comment faire.

---

## ⚡ Option 1 : Ultra Rapide (15 min)

### Requiert:
- VPS OVH + accès SSH
- Git installé en local
- Domaine (optionnel mais recommandé)

### Commandes:
```bash
# Sur votre ordinateur (pas le serveur)
chmod +x deploy-to-ovh.sh
./deploy-to-ovh.sh root@YOUR_VPS_IP your-domain.com
```

**C'est tout !** ✅ 

Après 15 minutes:
- ✅ Application disponible sur `https://your-domain.com`
- ✅ Nginx configuré
- ✅ SSL gratuit avec Let's Encrypt
- ✅ Auto-restart activé

---

## 📚 Option 2 : Je veux comprendre (30 min)

### Lire dans cet ordre:
1. `DEPLOY-QUICK.md` - Guide rapide avec explications
2. `DEPLOYMENT.md` - Documentation complète si besoin

---

## 🐳 Option 3 : Avec Docker (20 min)

### Requiert:
- VPS OVH avec Docker installé
- Domaine

### Commandes:
```bash
ssh root@YOUR_VPS_IP
cd /root/gmao-becomar
docker-compose build
docker-compose up -d
```

### Lire:
- `DEPLOY-DOCKER.md` - Guide Docker complet

---

## 🤔 Quelle option choisir ?

| | Rapide | Complet | Docker |
|--|--|--|--|
| **Temps** | 15 min | 30 min | 20 min |
| **Facilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Je cherche** | Juste lancer | Apprendre | Modern |

**Conseil**: Commencez par **Option 1** (Script auto)

---

## 🔍 Avant de Démarrer

### Avez-vous:
- [ ] L'IP du VPS OVH?
- [ ] L'accès SSH (clé ou mot de passe)?
- [ ] Un domaine configuré? (optionnel mais recommandé)
- [ ] Git installé en local?

Si OUI à tout ✅ → Allez à **Option 1**
Si NON à domaine ✅ → Allez à **Option 1** (c'est optionnel)
Si NON à Git → Utilisez **Option 2** ou **Option 3**

---

## 📋 Résumé: Ce Qui se Passe

```
Avant:
  VPS = serveur vide

Après (Option 1):
  VPS = Application GMAO en production
       = Nginx (reverse proxy)
       = PM2 (auto-restart)
       = SSL (HTTPS sécurisé)
```

---

## ✅ Vérification Finale

Une fois déployé, testez:

```bash
# Sur votre navigateur
https://your-domain.com

# Ou en SSH sur le VPS
curl http://localhost:4000/api/health
```

Résultat attendu:
```json
{"ok":true,"service":"GMAO Becomar API"}
```

---

## 🆘 Ça ne marche pas ?

### Erreur 502 (Nginx Bad Gateway)
```bash
ssh root@YOUR_VPS_IP
pm2 logs gmao-backend
# Voir ce qui bloque
```

### Domaine ne pointe pas
```bash
# Attendre 24h pour la propagation DNS
nslookup your-domain.com
```

### App qui redémarre sans arrêt
```bash
pm2 logs gmao-backend
# Voir l'erreur
```

### Besoin de plus d'aide ?
→ Lire `DEPLOYMENT.md` section "Troubleshooting"

---

## 🎯 Les 3 Points Importants

1. **IP du VPS** - C'est l'adresse pour SSH
2. **Domaine** - Optionnel mais rend l'accès plus facile
3. **SSH Access** - Clé privée ou mot de passe

Avec ces 3 choses, tout le reste est automatique ! 🚀

---

## 🚀 À Vos Claviers !

### Option 1 (Recommandée):
```bash
./deploy-to-ovh.sh root@192.168.1.100 my-app.com
```

Puis prenez un ☕ pendant 15 minutes...

### Puis:
```
https://my-app.com ✅
```

---

## 📞 Questions ?

- Script ne marche pas ? → Lire `DEPLOY-QUICK.md`
- Besoin de détails ? → Lire `DEPLOYMENT.md`
- Avec Docker ? → Lire `DEPLOY-DOCKER.md`
- Vue d'ensemble ? → Lire `DEPLOYMENT-SUMMARY.md`

---

**C'est parti ! 🚀**

Commencez par l'une des 3 options ci-dessus et vous aurez votre application en ligne en quelques minutes !
