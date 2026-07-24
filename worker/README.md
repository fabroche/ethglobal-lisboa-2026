# Worker

Proceso aparte de la app web (`npm run worker`, `tsx worker/index.ts`).

Responsabilidades:
- **Cron**: refrescos on-chain programados de las wallets vigiladas.
- **Runner IA**: drena `ai_jobs` invocando **Claude Code headless** (`claude -p`, suscripción,
  sin API key). Salida validada con Zod; reintentos con backoff.

Requiere Claude Code autenticado donde corra el worker (`CLAUDE_CODE_OAUTH_TOKEN` o login local).
Ver `docs/transversal/ia-runtime-headless.md`.
