# 🐳 Déploiement avec Docker sur OVH

Docker rend le déploiement encore plus simple et reproductible.

---

## ✅ Avantages Docker

- **Une image = même comportement partout** (dev, test, prod)
- **Pas de conflicts de dépendances** 
- **Facile à mettre à jour**
- **Facile à rollback**
- **Isolation complète**

---

## 🚀 Installation Rapide (Avec Docker)

### Prérequis
- VPS OVH avec Ubuntu/Debian
- Docker et Docker Compose installés

### 1️⃣ Préparer le Serveur

```bash
# Connexion au VPS
ssh root@YOUR_VPS_IP

# Mise à jour
apt update && apt upgrade -y

# Installation Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker root  # ou votre utilisateur

# Installation Docker Compose
apt install -y docker-compose

# Vérification
docker --version
docker-compose --version
```

### 2️⃣ Télécharger le Projet

```bash
# Via Git
git clone https://github.com/YOUR_USERNAME/gmao-becomar.git
cd gmao-becomar

# Ou via SFTP
# Télécharger et extraire les fichiers
```

### 3️⃣ Configuration Nginx

Éditer `nginx.conf` et remplacer `YOUR_DOMAIN` par votre domaine:

```bash
sed -i 's|YOUR_DOMAIN|your-domain.com|g' nginx.conf
```

### 4️⃣ Certificat SSL (Optionnel - faire avant)

```bash
# Générer le certificat Let's Encrypt
certbot certonly --standalone \
    -d your-domain.com -d www.your-domain.com \
    --non-interactive --agree-tos --email admin@your-domain.com

# Copier les certificats
mkdir -p /etc/letsencrypt/live/your-domain.com
# Les certificats sont maintenant dans /etc/letsencrypt
```

### 5️⃣ Lancer l'Application

```bash
cd /path/to/gmao-becomar

# Build l'image Docker
docker-compose build

# Démarrer les services
docker-compose up -d

# Vérifier le statut
docker-compose ps

# Voir les logs
docker-compose logs -f app
```

### 6️⃣ Configurer Nginx sur l'Hôte (optionnel)

Si vous voulez que Nginx sur l'hôte gère le SSL :

```bash
# Arrêter le Nginx du conteneur et utiliser celui de l'hôte
# Éditer /etc/nginx/sites-available/gmao-becomar
# Et pointer vers localhost:4000
```

---

## 📋 Structure Docker

```
Dockerfile          # Construit l'image app
docker-compose.yml  # Orchestre les conteneurs
nginx.conf          # Configuration Nginx

Conteneurs lancés:
- gmao-becomar (Node.js app, port 4000)
- gmao-nginx (Reverse proxy, port 80/443)
```

---

## 🔧 Commandes Utiles

### Voir les logs
```bash
# Tous les services
docker-compose logs -f

# Service spécifique
docker-compose logs -f app
docker-compose logs -f nginx
```

### Redémarrer
```bash
# Service unique
docker-compose restart app

# Tous
docker-compose restart
```

### Arrêter
```bash
docker-compose stop
```

### Démarrer
```bash
docker-compose start
```

### Arrêter et supprimer
```bash
docker-compose down
```

### Exécuter une commande dans un conteneur
```bash
docker-compose exec app node backend/server.js
```

### Voir l'utilisation des ressources
```bash
docker stats
```

---

## 🔄 Mise à Jour

### Mettre à jour le code
```bash
cd /path/to/gmao-becomar

# Récupérer les nouveautés
git pull origin main

# Rebuild l'image
docker-compose build

# Redémarrer
docker-compose up -d
```

---

## 🐛 Troubleshooting Docker

### L'app n'est pas accessible
```bash
# Vérifier les conteneurs
docker-compose ps

# Vérifier les logs
docker-compose logs app
docker-compose logs nginx

# Vérifier que le port 4000 répond
curl http://localhost:4000/api/health
```

### Conteneur qui s'arrête constamment
```bash
docker-compose logs app
# Voir l'erreur dans les logs
```

### Connexion à la base de données échoue
```bash
# Si vous ajoutez une base de données
# Vérifier que le service est lancé
docker-compose ps
```

### Permissions refusées
```bash
# Les permissions sont gérées dans le Dockerfile
# Vérifier que l'utilisateur nodejs existe
docker-compose exec app id
```

### Le build échoue
```bash
# Supprimer l'image et rebuild
docker-compose down
docker system prune
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Monitoring

### Avec Docker
```bash
# Utilisation des ressources
docker stats gmao-becomar

# Vérification du healthcheck
docker inspect gmao-becomar | grep -A 5 "Health"
```

### Logs
```bash
# Derniers logs
docker-compose logs -f app --tail 50

# Entre deux timestamps
docker-compose logs --since 2024-01-01 --until 2024-01-02
```

---

## 🔐 Sécurité avec Docker

### Exécuter avec un utilisateur non-root
✅ Déjà configuré dans le Dockerfile

### Limiter les ressources
Ajouter à docker-compose.yml:
```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Network isolation
✅ Déjà configuré avec `gmao-network`

### Volumes en lecture seule
```yaml
volumes:
  - ./frontend/dist:/usr/share/nginx/html:ro
```

---

## 📈 Scaling avec Docker

### Augmenter les instances du backend
```bash
docker-compose up -d --scale app=3
```

Puis configurer Nginx pour load balance entre les instances.

---

## 🔄 Cycle CI/CD avec Docker

### Build automatique
```bash
# Exemple de GitHub Actions
on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to VPS
        run: |
          ssh root@VPS_IP 'cd /path/to/gmao-becomar && \
            git pull && \
            docker-compose build && \
            docker-compose up -d'
```

---

## 📝 Variables d'Environnement

Créer `.env` à la racine:
```
NODE_ENV=production
PORT=4000
```

Puis dans docker-compose.yml:
```yaml
env_file:
  - .env
```

---

## 🆚 Comparaison: Avec vs Sans Docker

| Aspect | Sans Docker | Avec Docker |
|--|--|--|
| **Installation** | 30 min | 10 min |
| **Dépendances** | À gérer manuellement | Isolées dans l'image |
| **Mise à jour** | Risqué | Sûr (nouvelle image) |
| **Déploiement** | Complexe | Simple (une commande) |
| **Environnement** | Dev ≠ Prod | Dev = Prod |
| **Rollback** | Difficile | Facile (image précédente) |

---

## ✅ Checklist Docker

- [ ] Docker installé
- [ ] Docker Compose installé
- [ ] Code cloné
- [ ] Certificats SSL générés
- [ ] nginx.conf configuré
- [ ] DNS pointe vers le VPS
- [ ] `docker-compose build` réussi
- [ ] `docker-compose up -d` lancé
- [ ] `curl http://localhost:4000/api/health` retourne 200
- [ ] https://your-domain.com accessible

---

## 🎯 Prochaines Étapes

1. **Backups** : Sauvegarder les données régulièrement
2. **Monitoring** : Configurer des alertes
3. **Logs** : Centraliser les logs (ELK, Datadog, etc.)
4. **CI/CD** : Automatiser les déploiements
5. **Documentation** : Documenter votre configuration

---

**Docker rend tout plus simple ! 🐳**
