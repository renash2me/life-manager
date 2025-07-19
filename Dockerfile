# Multi-stage build para otimizar o tamanho da imagem
FROM node:18-alpine AS base

# Instalar dependências necessárias
RUN apk add --no-cache git curl

# Stage 1: Build do Frontend
FROM base AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build do Backend
FROM base AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./

# Stage 3: Imagem final
FROM base AS production
WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copiar arquivos do frontend buildado
COPY --from=frontend-builder --chown=nextjs:nodejs /app/client/build ./client/build

# Copiar arquivos do backend
COPY --from=backend-builder --chown=nextjs:nodejs /app/server ./server

# Copiar arquivos de configuração necessários para o entrypoint
COPY docker-entrypoint.sh ./

# Tornar script executável
RUN chmod +x docker-entrypoint.sh

# Criar diretórios para dados persistentes
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Expor porta
EXPOSE 5000

# Mudar para usuário não-root
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/actions', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Script de inicialização
ENTRYPOINT ["./docker-entrypoint.sh"] 