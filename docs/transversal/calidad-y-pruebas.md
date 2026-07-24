# T · Calidad y pruebas

## Herramientas
- **Vitest** + Testing Library (unit/componentes) · **Storybook** (UI aislada, variantes/estados, a11y) ·
  **Playwright** (E2E) · **ESLint** + **Prettier** · `tsc --noEmit`.
- Storybook: **v10** con `@storybook/nextjs-vite` (Next 16 + React 19). Tailwind v4 vía `@tailwindcss/vite`
  en `viteFinal` y `import '../src/app/globals.css'` en `.storybook/preview.tsx`. (No usamos el addon-vitest
  porque exige Vitest 3/4 y el proyecto va en Vitest 2.)

## Definition of Done (mandatorio)
Un componente/funcionalidad **no está terminado** sin:
1. **Implementación** con el sistema de diseño (tokens, `cn()`, primitivas).
2. **Story** en Storybook cubriendo variantes y estados (co-locada `*.stories.tsx`).
3. **Test RTL** de comportamiento (interacción, validación, estados; no solo render).

Además:
- Lógica de `lib/services` (**PnL/base de costo**) y mappers de `lib/onchain` = **tests unitarios** (entrada→salida).
- Flujos críticos (conectar wallet → sync → PnL → reporte) = **E2E** Playwright.
- **UX móvil** = cumplir el **DoD móvil** de `mobile-first.md` (mobile-first es obligatorio).

> **En hackathon:** el DoD completo es la **meta**, no un bloqueo para demostrar. Se prioriza que el flujo
> demo funcione end-to-end; los tests se completan donde más protegen (cálculo de PnL, mappers on-chain).

## Qué testear con prioridad
| Área | Test clave |
|------|-----------|
| `lib/onchain/paginate` | recorre múltiples páginas; no trunca |
| `lib/onchain/rate-limit` | respeta límites del gateway/RPC + retry ante 429 |
| `lib/onchain/mappers` | respuesta subgraph/RPC → DTO válido; rechaza shapes inesperados (Zod) |
| `lib/services/pnl` | **base de costo y realizado/no realizado correctos** (caso del socio contador) |
| ingesta idempotencia | mismo `(wallet, tx_hash)` no duplica |
| `lib/ai/runner` | salida no conforme → `error` reintentable (no persiste basura) |
| M3 reportes | el cuerpo solo cita cifras presentes en `metricas` (no alucina números) |
| RLS | no se leen filas de otro `user_id` |

## Estrategia anti-regresión (lección heredada de home-os)
- Test que **falla** si aparece `as any` en `lib/onchain` o si un mapper no valida con Zod.
- Test de paginación con fixture de 2+ páginas (no truncar resultados de The Graph).
- **Enforcement de stories+tests** (`dod-coverage.test.ts`): falla si un componente visual no tiene su
  `*.stories.tsx` y su `*.test.tsx` co-locados; deudas conocidas trackeadas en listas del propio test.

## Gotchas de Storybook + Next (verificar el render REAL)
`build-storybook` compila pero **no ejecuta el render**: los errores de runtime solo salen en
`npm run storybook` o cargando la story en un navegador.
- **Server Actions** (`@/lib/actions/*`) rompen en navegador → mocks en `.storybook/mocks/` + alias en `main.ts`.
- **`useRouter`/`usePathname`** → `nextjs.appDirectory: true` (global en `preview.tsx`).

## CI (sugerido)
`lint` → `typecheck` → `test` → build. Bloquear merge si algo falla (relajable en hackathon por velocidad).

## Datos de prueba
- **Fixtures** de respuestas de subgraph / RPC (no llamar a APIs reales en unit tests).
- Una wallet real de prueba (pública) para los E2E de lectura on-chain.
