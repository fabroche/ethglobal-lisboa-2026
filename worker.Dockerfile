# Worker (cron + runner IA). Corre `tsx worker/index.ts`.
# Nota: el runner IA headless requiere Claude Code autenticado (CLAUDE_CODE_OAUTH_TOKEN)
# o instalar el CLI en esta imagen. Ver docs/transversal/ia-runtime-headless.md.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
CMD ["npx", "tsx", "worker/index.ts"]
