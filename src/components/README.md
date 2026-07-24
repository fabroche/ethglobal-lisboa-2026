# Componentes

Convenciones (ver `docs/transversal/sistema-de-diseno.md` y `docs/00-overview/04-convenciones.md`):

- **RSC por defecto**; `"use client"` solo cuando haga falta (estado, efectos, listeners).
- **React 19**: `ref` es prop normal (no `forwardRef`).
- **shadcn/ui** (new-york, slate) en `ui/`. Añadir con `npx shadcn@latest add <componente>`.
- Clases condicionales **siempre** con `cn()` (`@/lib/utils`).
- Tailwind v4: tokens en `src/app/globals.css @theme`. **Sin** `tailwind.config.js`.
- **Mobile-first**: la base es la vista móvil; se escala con `sm:`/`md:`/`lg:`.
- La UI lee datos vía Server Actions / `lib/services`; **nunca** importa `lib/onchain` directo.

## Carpetas
- `ui/` — primitivas shadcn.
- `theme/` — proveedor de tema y toggle light/dark.
