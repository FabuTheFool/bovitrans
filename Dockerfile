# syntax=docker/dockerfile:1.7
# ============================================================================
# Dockerfile — BoviTrans Next.js app
# ============================================================================
# Multi-stage:
#   1. deps    — instala dependencias con caché de npm
#   2. builder — compila Next.js (output: standalone)
#   3. runner  — imagen mínima de producción
# ============================================================================

ARG NODE_VERSION=20-alpine

# ─── Stage 1: deps ──────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# Solo lo necesario para resolver dependencias (mejora cache).
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ─── Stage 2: builder ───────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3: runner ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Usuario no-root.
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copia el output standalone (next.config.js debe tener output: 'standalone').
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

# Healthcheck simple (probe del endpoint de la app).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/healthz || exit 1

CMD ["node", "server.js"]
