# Guide de Déploiement - GMAO Becomar sur VPS OVH

## 📋 Prérequis

- VPS OVH avec accès SSH
- Ubuntu 20.04 LTS ou supérieur (recommandé)
- Domaine configuré (optionnel mais recommandé)

---

## 🚀 Étape 1 : Préparation du Serveur VPS

### Connexion au serveur
```bash
ssh root@YOUR_VPS_IP
# ou
ssh -i /path/to/private/key root@YOUR_VPS_IP
```

### Mise à jour du système
```bash
apt update && apt upgrade -y
```

### Installation des dépendances nécessaires
```bash
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx
```

---

## 📦 Étape 2 : Installation de Node.js et npm

### Installation de Node.js (version LTS recommandée)
```bash
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

### Vérification
```bash
node --version  # v18.x.x
npm --version   # 9.x.x
```

---

## 📂 Étape 3 : Préparation du Projet

### Création d'un utilisateur dédié (recommandé)
```bash
useradd -m -s /bin/bash gmao
```

### Clonage du projet
```bash
cd /home/gmao
git clone https://github.com/YOUR_USERNAME/gmao-becomar.git
cd gmao-becomar
```

**OU** si pas de git, télécharger les fichiers via FTP/SFTP

### Installation des dépendances
```bash
# Backend
cd backend
npm install

# Frontend (retourner au répertoire parent)
cd ../frontend
npm install
cd ..
```

---

## ⚙️ Étape 4 : Configuration de l'Application

### Variables d'environnement - Backend
Créer `/home/gmao/gmao-becomar/backend/.env` :
```
NODE_ENV=production
PORT=4000
```

### Build du Frontend (Production)
```bash
cd frontend
npm run build
cd ..
```

Cela crée un dossier `frontend/dist/` avec les fichiers statiques optimisés.

---

## 🔄 Étape 5 : Mise en place de PM2 (Gestionnaire de Processus)

### Installation de PM2
```bash
npm install -g pm2
```

### Créer un fichier de configuration PM2
Créer `/home/gmao/gmao-becomar/ecosystem.config.js` :
```javascript
module.exports = {
  apps: [
    {
      name: 'gmao-backend',
      script: './backend/server.js',
      cwd: '/home/gmao/gmao-becomar',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 4000,
      listen_timeout: 3000,
      kill_timeout: 5000,
    },
  ],
};
```

### Créer le dossier logs
```bash
mkdir -p /home/gmao/gmao-becomar/logs
chown -R gmao:gmao /home/gmao/gmao-becomar
```

### Démarrer l'application avec PM2
```bash
cd /home/gmao/gmao-becomar
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Vérifier le statut
```bash
pm2 status
pm2 logs gmao-backend
```

---

## 🌐 Étape 6 : Configuration de Nginx (Reverse Proxy)

### Créer la configuration Nginx
Créer `/etc/nginx/sites-available/gmao-becomar` :
```nginx
# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location / {
        return 301 https://$server_name$request_uri;
    }
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# Configuration HTTPS
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # Certificats SSL (voir étape suivante)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Configuration SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # API Backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files (SPA)
    location / {
        root /home/gmao/gmao-becomar/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Fichiers statiques (images, css, js)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/gmao/gmao-becomar/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Logs
    access_log /var/log/nginx/gmao-access.log;
    error_log /var/log/nginx/gmao-error.log;
}
```

### Activer la configuration
```bash
ln -s /etc/nginx/sites-available/gmao-becomar /etc/nginx/sites-enabled/
nginx -t  # Tester la configuration
systemctl reload nginx
```

---

## 🔒 Étape 7 : Configuration SSL avec Let's Encrypt

### Sans domaine (Auto-signé - pour test)
```bash
# Cette étape est optionnelle pour test
# Remplacer votre-domaine.com dans les commandes
```

### Avec domaine (Recommandé)
```bash
certbot certonly --nginx -d your-domain.com -d www.your-domain.com
```

### Renouvellement automatique
```bash
# Ajouter à crontab
0 3 1 * * certbot renew --quiet

# Ou utiliser le timer systemd
systemctl enable certbot.timer
systemctl start certbot.timer
```

---

## 🔧 Étape 8 : Scripts d'Administration

### Créer des scripts utiles
Créer `/home/gmao/gmao-becomar/scripts/deploy.sh` :
```bash
#!/bin/bash

echo "🚀 Déploiement GMAO Becomar..."

# Arrêter l'application
pm2 stop gmao-backend

# Mettre à jour le code
cd /home/gmao/gmao-becomar
git pull origin main

# Installer les dépendances
npm --prefix backend install
npm --prefix frontend install

# Builder le frontend
npm --prefix frontend run build

# Redémarrer l'application
pm2 start ecosystem.config.js

echo "✅ Déploiement terminé!"
pm2 logs gmao-backend
```

### Rendre le script exécutable
```bash
chmod +x /home/gmao/gmao-becomar/scripts/deploy.sh
```

---

## 📊 Étape 9 : Monitoring et Logs

### Vérifier les logs
```bash
# Logs de l'application
pm2 logs gmao-backend

# Logs Nginx
tail -f /var/log/nginx/gmao-error.log
tail -f /var/log/nginx/gmao-access.log
```

### Statistiques PM2
```bash
pm2 monit
```

### Utilisation disque/ressources
```bash
df -h
free -h
ps aux | grep node
```

---

## 🔐 Étape 10 : Sécurité

### Firewall (UFW)
```bash
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw enable
```

### Permissions
```bash
chown -R gmao:gmao /home/gmao/gmao-becomar
chmod -R 755 /home/gmao/gmao-becomar
```

### Limite les ressources (optionnel)
```bash
# Ajouter à /etc/security/limits.conf
gmao soft nofile 10000
gmao hard nofile 10000
```

---

## 📱 Étape 11 : Accès à l'Application

### URLs d'accès
```
Sans SSL:
- Frontend: http://your-domain.com
- API: http://your-domain.com/api/dashboard

Avec SSL:
- Frontend: https://your-domain.com
- API: https://your-domain.com/api/dashboard
```

### Tester l'API
```bash
curl https://your-domain.com/api/health
# Réponse attendue: {"ok":true,"service":"GMAO Becomar API"}
```

---

## 🔄 Mise à Jour Future

### Procédure de mise à jour
```bash
cd /home/gmao/gmao-becomar

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances (si nécessaire)
npm --prefix backend install
npm --prefix frontend install

# Rebuilder le frontend
npm --prefix frontend run build

# Redémarrer l'app
pm2 restart gmao-backend
```

### Ou utiliser le script
```bash
/home/gmao/gmao-becomar/scripts/deploy.sh
```

---

## 🆘 Troubleshooting

### L'application ne démarre pas
```bash
pm2 logs gmao-backend  # Vérifier les erreurs
pm2 delete gmao-backend
pm2 start ecosystem.config.js
```

### Nginx retourne 502 Bad Gateway
```bash
# Vérifier que le backend répond
curl http://localhost:4000/api/health

# Redémarrer Nginx
systemctl restart nginx

# Vérifier les logs
tail -f /var/log/nginx/gmao-error.log
```

### Certbot ne renouvelle pas
```bash
certbot renew --dry-run
systemctl status certbot.timer
```

### Permissions refusées
```bash
ls -l /home/gmao/gmao-becomar
chown -R gmao:gmao /home/gmao/gmao-becomar
```

---

## 📝 Informations Importantes

- **Port Backend** : 4000 (interne, non exposé directement)
- **Port Frontend** : Serveur via Nginx sur 80/443
- **Base de données** : En mémoire (données perdues au redémarrage)
- **Domaine requis** : Oui, pour SSL/HTTPS
- **Backup** : À mettre en place pour les données importantes

---

## ✅ Checklist Final

- [ ] VPS configuré et accessible
- [ ] Node.js et npm installés
- [ ] Projet cloné/téléchargé
- [ ] Dépendances installées
- [ ] Frontend buildé
- [ ] PM2 configuré et démarré
- [ ] Nginx configuré
- [ ] SSL/HTTPS activé
- [ ] Firewall configuré
- [ ] Application accessible via le domaine

---

**Besoin d'aide ?** Vérifiez les logs avec `pm2 logs gmao-backend` ou contactez le support OVH.
