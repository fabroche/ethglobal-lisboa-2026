---
name: verify
description: Receta de verificación E2E en local — levantar la app, recorrer flujos reales (conectar wallet read-only → leer posiciones → generar reporte) con Playwright y limpiar. Usar cuando haya que verificar un cambio en la app corriendo, no solo con tests.
---

# Verificación E2E local

> Adaptada del método de home-os. En una hackathon prioriza verificar el **flujo de demo**
> funcionando de punta a punta, con datos on-chain reales.

## Receta

1. **Dev server**: `npm run dev` (background). Espera a que la home devuelva 200
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`) — la primera compilación
   de cada ruta es lenta con Turbopack.

2. **Datos de prueba on-chain**: usa una **wallet pública conocida** con actividad (p. ej. una
   dirección `.eth` famosa) — es **solo lectura**, no hace falta ninguna private key. Así la demo
   siempre tiene datos ricos sin depender de tu propia cartera.

3. **Recorrer el flujo** con Playwright (`playwright` viene con `@playwright/test`; instala el
   navegador la primera vez: `npx playwright install chromium`). Flujo de demo tentativo:
   introducir dirección/ENS → resolver ENS → leer posiciones/movimientos (The Graph) →
   generar borrador de reporte (IA headless) → screenshots de cada paso.

4. **IA de runtime**: para que el paso de reporte funcione en local, el **worker** debe estar
   corriendo (`npm run worker`) con Claude Code autenticado (`CLAUDE_CODE_OAUTH_TOKEN` o login local).

5. **Limpieza**: si creaste usuario/tester en Supabase, bórralo al terminar (aislado por `user_id`).
   Las direcciones de wallet son públicas: no hay secretos que limpiar.

## Notas
- El `.env.local` de dev puede apuntar a un Supabase de hackathon desechable.
- No metas private keys en ningún paso: el MVP es **solo lectura** on-chain.
- Graba el recorrido: varios sponsors piden **video demo**.
