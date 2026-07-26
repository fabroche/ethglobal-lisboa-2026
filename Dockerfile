# App web (Next.js standalone). Imagen mínima para deploy en VPS/Dokploy.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No hay variables NEXT_PUBLIC_*: todo el env es de servidor y se lee en runtime
# (src/config/env.ts), así que el build no necesita secretos.
# `public/` no existe en el repo y el runner lo copia — lo creamos para que el
# COPY no falle.
RUN mkdir -p public && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
# El servidor standalone escucha en HOSTNAME; sin esto puede quedarse en
# localhost dentro del contenedor y Traefik nunca llega.
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
