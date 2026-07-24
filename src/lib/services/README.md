# Servicios de dominio (`lib/services`)

Lógica de negocio de finanzas cripto (PnL, base de costo, agregación de posiciones,
composición de reportes). Orquesta `lib/onchain` (The Graph, viem) y `lib/supabase`.

- Aquí vive el dominio; **no** en la capa de datos ni en la UI.
- Toda respuesta externa (subgraph/RPC) se **valida con Zod** al entrar.
- Funciones puras y testeables (Vitest); I/O inyectable donde ayude a testear.

Ver `docs/00-overview/01-arquitectura-c4.md`.
