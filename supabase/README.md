# Supabase

Esquema, migraciones y RLS. Postgres como almacén/espejo/analítica y **cola `ai_jobs`**.

- Migraciones numeradas en `migrations/` (`0001_init.sql`, …). Aplicar en orden.
- **RLS siempre**: multi-tenant por `user_id` (aunque el MVP sea single-user, se deja listo).
- Nada de secretos aquí. Las direcciones de wallet son públicas (OK); jamás private keys.

> El esquema actual es **tentativo** (depende de la idea final). Ver `docs/00-overview/02-modelo-datos-global.md`.
