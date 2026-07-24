/**
 * Worker: proceso separado de la app web.
 * - Cron (polling on-chain, refrescos programados).
 * - Runner IA: drena la cola `ai_jobs` invocando Claude Code headless (suscripción).
 *
 * Arranque local: `npm run worker`. Ver docs/transversal/ia-runtime-headless.md.
 * Este archivo es un ESQUELETO: la lógica real se añade al implementar M4.
 */
import cron from "node-cron";
import { env } from "../src/config/env";

async function drainAiJobs(): Promise<void> {
  // TODO(M4): tomar_ai_job() en Supabase → invocar `claude -p` (runner headless)
  // → validar salida con Zod → escribir output/estado. Reintentos con backoff.
}

function start(): void {
  console.warn(`[worker] arrancado (NODE_ENV=${env.NODE_ENV})`);

  // Drain de la cola de IA cada AI_POLL_MS.
  setInterval(() => {
    void drainAiJobs();
  }, env.AI_POLL_MS);

  // Ejemplo de cron programado (refrescos on-chain). Ajustar al implementar.
  cron.schedule("*/15 * * * *", () => {
    // TODO: refrescar snapshots on-chain de las wallets vigiladas.
  });
}

start();
