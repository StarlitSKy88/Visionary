# ===== Stage 1: Frontend Build =====
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# ===== Stage 2: Backend =====
FROM node:20-alpine AS backend

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy server source
COPY server/ ./

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set output directory
RUN mkdir .next && chown nextjs:nodejs .next

# Copy built frontend
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=frontend-builder --chown=nextjs:nodejs /app/public ./public
COPY --from=frontend-builder --chown=nextjs:nodejs /app/src/app/globals.css ./src/app/globals.css

# Copy backend
COPY --from=backend --chown=nextjs:nodejs /app/server ./server

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_URL=http://localhost:3001

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Switch to non-root user
USER nextjs

# Start both frontend and backend
CMD ["sh", "-c", "node server/index.js & npx next start"]
