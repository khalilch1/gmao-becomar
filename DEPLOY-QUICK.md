# 🚀 Déploiement Rapide - GMAO Becomar sur OVH

## Option 1 : Script Automatisé (Recommandé ⭐)

### Prérequis
- Accès SSH au VPS OVH
- Git installé en local
- Domaine configuré (pointant vers l'IP du VPS)

### Exécution
```bash
# Sur votre ordinateur local
./deploy-to-ovh.sh root@YOUR_VPS_IP your-domain.com
```

**Exemple:**
```bash
./deploy-to-ovh.sh root@192.168.1.100 becomar.ma
```

Le script fait automatiquement:
✅ Mise à jour du serveur  
✅ Installation de Node.js, Nginx, PM2  
✅ Transfert du code  
✅ Installation des dépendances  
✅ Build du frontend  
✅ Configuration PM2  
✅ Configuration Nginx  
✅ Configuration SSL Let's Encrypt  

---

## Option 2 : Installation Manuelle (Pas à Pas)

### 1️⃣ Connexion au VPS
```bash
ssh root@YOUR_VPS_IP
```

### 2️⃣ Préparation
```bash
# Mise à jour système
apt update && apt upgrade -y

# Installation des dépendances
apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx

# Installation Node.js 18
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Installation PM2
npm install -g pm2

# Créer utilisateur
useradd -m -s /bin/bash gmao
```

### 3️⃣ Clonage du projet
```bash
cd /home/gmao
git clone https://github.com/YOUR_USERNAME/gmao-becomar.git
cd gmao-becomar

# Ou télécharger les fichiers via SFTP/FTP
```

### 4️⃣ Installation des dépendances
```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && npm run build && cd ..
```

### 5️⃣ Configuration PM2
```bash
# Créer le fichier de configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'gmao-backend',
    script: './backend/server.js',
    cwd: '/home/gmao/gmao-becomar',
    instances: 2,
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: 4000 },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
  }],
};
EOF

mkdir -p logs
chown -R gmao:gmao /home/gmao/gmao-becomar

# Démarrer
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6️⃣ Configuration Nginx
```bash
# Créer la config
cat > /etc/nginx/sites-available/gmao-becomar << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /home/gmao/gmao-becomar/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

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
}
EOF

# Activer
ln -s /etc/nginx/sites-available/gmao-becomar /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
```

### 7️⃣ SSL Let's Encrypt
```bash
mkdir -p /var/www/certbot

# Générer le certificat
certbot certonly --webroot -w /var/www/certbot \
    -d your-domain.com -d www.your-domain.com \
    --non-interactive --agree-tos --email admin@your-domain.com
```

### 8️⃣ Activer HTTPS dans Nginx
```bash
# Remplacer la config Nginx par celle avec HTTPS
cat > /etc/nginx/sites-available/gmao-becomar << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    location / { return 301 https://$server_name$request_uri; }
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    gzip on;

    location / {
        root /home/gmao/gmao-becomar/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

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
}
EOF

nginx -t && systemctl reload nginx
```

### 9️⃣ Firewall
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

---

## ✅ Vérification

### Tester l'application
```bash
# Sur le VPS
curl http://localhost:4000/api/health
# Output: {"ok":true,"service":"GMAO Becomar API"}

# Dans le navigateur
https://your-domain.com
```

### Vérifier les logs
```bash
pm2 logs gmao-backend
tail -f /var/log/nginx/gmao-error.log
```

### Statut de l'application
```bash
pm2 status
pm2 monit
```

---

## 🔄 Mise à Jour Future

### Méthode 1 : Via Git
```bash
cd /home/gmao/gmao-becomar
git pull origin main
npm --prefix backend install
npm --prefix frontend install && npm --prefix frontend run build
pm2 restart gmao-backend
```

### Méthode 2 : Manuelle
```bash
# Télécharger les fichiers via SFTP
# Puis:
cd /home/gmao/gmao-becomar
npm --prefix frontend run build
pm2 restart gmao-backend
```

---

## 🆘 Problèmes Courants

### L'app ne démarre pas
```bash
pm2 logs gmao-backend          # Voir les erreurs
pm2 delete gmao-backend        # Supprimer
pm2 start ecosystem.config.js  # Relancer
```

### Nginx retourne 502
```bash
# Vérifier le backend
curl http://localhost:4000/api/health

# Redémarrer services
systemctl restart nginx
pm2 restart gmao-backend
```

### Permission refusée
```bash
chown -R gmao:gmao /home/gmao/gmao-becomar
chmod -R 755 /home/gmao/gmao-becomar
```

### Certificat SSL expiré
```bash
certbot renew
systemctl reload nginx
```

---

## 📊 Monitoring

### Espace disque
```bash
df -h
```

### Ressources
```bash
free -h
ps aux | grep node
```

### Logs
```bash
# Backend
pm2 logs gmao-backend

# Nginx
tail -f /var/log/nginx/gmao-access.log
tail -f /var/log/nginx/gmao-error.log
```

---

## 🔐 Sécurité

### Permissions
```bash
chmod 755 /home/gmao/gmao-becomar
chmod 600 /home/gmao/.ssh/authorized_keys
```

### SSH Key Only (optionnel)
```bash
# En local, générer une clé
ssh-keygen -t rsa -b 4096

# Copier sur le serveur
ssh-copy-id -i ~/.ssh/id_rsa.pub root@VPS_IP

# Désactiver password login
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

---

## 📝 Variables d'Environnement

Créer `.env` dans le backend si nécessaire:
```bash
cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=4000
EOF
```

---

## 🎯 URL d'Accès

```
https://your-domain.com              # Frontend
https://your-domain.com/api/health   # API Test
```

---

**Besoin d'aide ? Voir DEPLOYMENT.md pour le guide complet**
