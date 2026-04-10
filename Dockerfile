# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for both root and server
COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci && \
    cp -r node_modules server/node_modules

# ===== Stage 2: Frontend Build =====
FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY . .

RUN npm run build

# ===== Stage 3: Backend Build =====
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

COPY --from=deps /app/server/node_modules ./node_modules
COPY server/ ./

# Build (for any TypeScript/transpilation if needed)
RUN npm run build 2>/dev/null || true

# ===== Stage 4: Runner =====
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache curl && \
    npm install -g pm2

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set output directory
RUN mkdir -p .next server data logs && \
    chown -R nextjs:nodejs .Next server data logs

# Copy built frontend (standalone output)
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=frontend-builder --chown=nextjs:nodejs /app/public ./public

# Copy backend
COPY --from=backend-builder --chown=nextjs:nodejs /app/server ./server

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_URL=http://localhost:3001

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nextjs

# Start both frontend and backend with pm2
CMD ["pm2", "start", "ecosystem.config.js", "--env", "production"]
