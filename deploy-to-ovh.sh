#!/bin/bash

# ====================================================================
# Script de Déploiement Automatisé - GMAO Becomar sur OVH
# ====================================================================
# Usage: ./deploy-to-ovh.sh USERNAME@VPS_IP
# ====================================================================

set -e  # Arrêter si une commande échoue

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_USER_IP="$1"
PROJECT_DIR="/home/gmao/gmao-becomar"
DOMAIN="${2:-your-domain.com}"

# Fonctions
log_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

log_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Vérifications préalables
if [ -z "$VPS_USER_IP" ]; then
    log_error "Utilisation: $0 USERNAME@VPS_IP [DOMAIN]"
    echo "Exemple: $0 root@192.168.1.100 my-domain.com"
    exit 1
fi

log_info "Déploiement GMAO Becomar vers $VPS_USER_IP"
log_info "Domaine: $DOMAIN"
echo ""

# ====================================================================
# PHASE 1: Préparation du serveur distant
# ====================================================================

log_info "PHASE 1: Préparation du serveur..."

ssh "$VPS_USER_IP" << 'EOF'
set -e

log_info() { echo -e "\033[0;34mℹ ${1}\033[0m"; }
log_success() { echo -e "\033[0;32m✓ ${1}\033[0m"; }

# Mise à jour système
log_info "Mise à jour du système..."
apt-get update > /dev/null 2>&1
apt-get upgrade -y > /dev/null 2>&1
log_success "Système mis à jour"

# Installation dépendances
log_info "Installation des dépendances..."
apt-get install -y curl wget git build-essential nginx certbot python3-certbot-nginx > /dev/null 2>&1
log_success "Dépendances installées"

# Installation Node.js
if ! command -v node &> /dev/null; then
    log_info "Installation de Node.js..."
    curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
    log_success "Node.js $(node --version) installé"
else
    log_success "Node.js $(node --version) déjà installé"
fi

# Utilisateur gmao
if ! id "gmao" &>/dev/null; then
    log_info "Création utilisateur gmao..."
    useradd -m -s /bin/bash gmao
    log_success "Utilisateur gmao créé"
else
    log_success "Utilisateur gmao existe déjà"
fi

# PM2 global
log_info "Installation PM2..."
npm install -g pm2 > /dev/null 2>&1
pm2 startup > /dev/null 2>&1
log_success "PM2 installé et configuré"
EOF

log_success "Serveur préparé"
echo ""

# ====================================================================
# PHASE 2: Transfert du code
# ====================================================================

log_info "PHASE 2: Transfert du code vers le serveur..."

# Créer le répertoire
ssh "$VPS_USER_IP" "mkdir -p $PROJECT_DIR && chown -R gmao:gmao /home/gmao"

# Transférer les fichiers (excluant node_modules et .git)
rsync -avz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='logs' \
    -e ssh \
    . "$VPS_USER_IP:$PROJECT_DIR"

log_success "Code transféré"
echo ""

# ====================================================================
# PHASE 3: Installation et build
# ====================================================================

log_info "PHASE 3: Installation des dépendances et build..."

ssh "$VPS_USER_IP" << 'EOF'
set -e

log_info() { echo -e "\033[0;34mℹ ${1}\033[0m"; }
log_success() { echo -e "\033[0;32m✓ ${1}\033[0m"; }

PROJECT_DIR="/home/gmao/gmao-becomar"
cd "$PROJECT_DIR"

# Backend dependencies
log_info "Installation backend..."
su - gmao -c "cd $PROJECT_DIR/backend && npm install --production" > /dev/null 2>&1
log_success "Backend dépendances installées"

# Frontend dependencies et build
log_info "Installation et build frontend..."
su - gmao -c "cd $PROJECT_DIR/frontend && npm install" > /dev/null 2>&1
su - gmao -c "cd $PROJECT_DIR/frontend && npm run build" > /dev/null 2>&1
log_success "Frontend buildé"

# Créer dossier logs
mkdir -p "$PROJECT_DIR/logs"
chown -R gmao:gmao "$PROJECT_DIR/logs"
EOF

log_success "Dépendances installées et frontend buildé"
echo ""

# ====================================================================
# PHASE 4: Configuration PM2
# ====================================================================

log_info "PHASE 4: Configuration PM2..."

ssh "$VPS_USER_IP" << 'EOF'
PROJECT_DIR="/home/gmao/gmao-becomar"

# Arrêter l'app existante si elle tourne
pm2 delete gmao-backend 2>/dev/null || true

# Créer la config PM2
cat > "$PROJECT_DIR/ecosystem.config.js" << 'ECOSYSTEM'
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
    },
  ],
};
ECOSYSTEM

chown gmao:gmao "$PROJECT_DIR/ecosystem.config.js"

# Démarrer avec PM2
su - gmao -c "cd $PROJECT_DIR && pm2 start ecosystem.config.js"
su - gmao -c "pm2 save"
pm2 startup -u gmao --hp /home/gmao > /dev/null 2>&1
EOF

log_success "PM2 configuré et application démarrée"
echo ""

# ====================================================================
# PHASE 5: Configuration Nginx
# ====================================================================

log_info "PHASE 5: Configuration Nginx..."

ssh "$VPS_USER_IP" "mkdir -p /var/www/certbot" 2>/dev/null || true

# Créer la config Nginx temporaire (HTTP seulement)
ssh "$VPS_USER_IP" << EOF
cat > /etc/nginx/sites-available/gmao-becomar << 'NGINX'
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /home/gmao/gmao-becomar/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gmao-becomar /etc/nginx/sites-enabled/ 2>/dev/null || true
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t && systemctl restart nginx
EOF

log_success "Nginx configuré"
echo ""

# ====================================================================
# PHASE 6: Certificat SSL
# ====================================================================

log_info "PHASE 6: Configuration SSL avec Let's Encrypt..."

ssh "$VPS_USER_IP" << EOF
certbot certonly --webroot -w /var/www/certbot -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN 2>/dev/null || {
    echo "⚠ Certificat non généré automatiquement"
    echo "À faire manuellement après configuration du domaine:"
    echo "  certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN"
}
EOF

# Mettre à jour Nginx config avec SSL
ssh "$VPS_USER_IP" << 'EOF'
DOMAIN="$1"
cat > /etc/nginx/sites-available/gmao-becomar << 'NGINX_FINAL'
# HTTP -> HTTPS redirect
server {
    listen 80;
    server_name DOMAIN www.DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name DOMAIN www.DOMAIN;

    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Frontend
    location / {
        root /home/gmao/gmao-becomar/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
    }

    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/gmao/gmao-becomar/frontend/dist;
        expires 1y;
    }

    # API
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

    access_log /var/log/nginx/gmao-access.log;
    error_log /var/log/nginx/gmao-error.log;
}
NGINX_FINAL

# Remplacer DOMAIN
sed -i "s|DOMAIN|$DOMAIN|g" /etc/nginx/sites-available/gmao-becomar

nginx -t && systemctl reload nginx
EOF

log_success "SSL configuré"
echo ""

# ====================================================================
# PHASE 7: Firewall
# ====================================================================

log_info "PHASE 7: Configuration Firewall..."

ssh "$VPS_USER_IP" << EOF
ufw allow 22/tcp > /dev/null 2>&1
ufw allow 80/tcp > /dev/null 2>&1
ufw allow 443/tcp > /dev/null 2>&1
ufw --force enable > /dev/null 2>&1
EOF

log_success "Firewall configuré"
echo ""

# ====================================================================
# RÉSUMÉ FINAL
# ====================================================================

echo ""
echo "============================================================"
log_success "🚀 DÉPLOIEMENT RÉUSSI!"
echo "============================================================"
echo ""
log_info "Accès à l'application:"
echo "  • Frontend: https://$DOMAIN"
echo "  • API: https://$DOMAIN/api/dashboard"
echo ""
log_info "Commandes utiles sur le VPS:"
echo "  • Vérifier l'app: pm2 status"
echo "  • Logs: pm2 logs gmao-backend"
echo "  • Redémarrer: pm2 restart gmao-backend"
echo "  • Arrêter: pm2 stop gmao-backend"
echo ""
log_warning "À faire manuellement:"
echo "  1. Configurer les DNS de votre domaine vers l'IP du VPS"
echo "  2. Générer le certificat SSL:"
echo "     ssh $VPS_USER_IP"
echo "     certbot certonly --nginx -d $DOMAIN -d www.$DOMAIN"
echo "  3. Redémarrer Nginx: systemctl reload nginx"
echo ""
echo "============================================================"
