# Capa IA (`lib/ai`)

Contratos y helpers para la IA de runtime. La ejecución vive en el **worker** (fuera del
proceso de Next): la app **encola** tareas en `ai_jobs` (Supabase) y el worker las **drena**
con el runner de **Claude Code headless** (`claude -p`, suscripción, **sin API key**).

Ver `docs/transversal/ia-runtime-headless.md` y `docs/modules/M4-asistente-ia.md`.

- Entradas y salidas de cada tarea se validan con **Zod** (contratos estables).
- El sistema es **engine-agnóstico**: migrar a `ANTHROPIC_API_KEY` sería cambiar solo el runner.
