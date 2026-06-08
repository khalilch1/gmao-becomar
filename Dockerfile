# Multi-stage build pour optimiser la taille de l'image

# Stage 1: Build du frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build du backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ ./

# Stage 3: Image finale
FROM node:18-alpine
WORKDIR /app

# Installation des dépendances supplémentaires
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copier le backend depuis le stage 2
COPY --from=backend-builder --chown=nodejs:nodejs /app/backend ./backend

# Copier le frontend depuis le stage 1
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Changer vers l'utilisateur non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Port
EXPOSE 4000

# Lancer l'app
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/server.js"]
