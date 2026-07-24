# T · Sistema de diseño

Identidad **editorial con personalidad** (heredada de `home-os`, adaptada a una app de datos cripto legible).
Definida íntegramente en `src/app/globals.css` (Tailwind v4 CSS-first, **sin** `tailwind.config.js`).

## Base
- **Tailwind v4** (`@theme` en `globals.css`) + utilidades **shadcn/ui** (estilo **new-york**, base **slate**).
- **Light + Dark** vía `next-themes` (`attribute="class"` → `.dark` en `<html>`).
  Provider en `src/components/theme/theme-provider.tsx`, toggle en `theme-toggle.tsx`.
- Iconos: `lucide-react`.

## Tipografía
- **Inter Tight** (`--font-inter`) — cuerpo, datos y titulares. `next/font/google` en `layout.tsx`.
- **Instrument Serif** (`--font-instrument`) — solo acentos en *cursiva* dentro de titulares.
  Utilidad **`.serif-accent`** (serif + italic + weight 400) sobre la palabra a destacar.
- Titulares: sans, `font-weight 600`, `tracking` ceñido.

## Color
- **Marca: violeta / índigo** (paleta cripto / ETHGlobal) como `--primary` / `--brand`; se aclara en dark.
- Tokens semánticos de dominio cripto: `--profit` (verde, PnL positivo), `--loss` (rojo, PnL negativo),
  `--pending` (ámbar). Usar **siempre** estos (`text-profit`, `bg-loss`, …), nunca colores sueltos.
- Paleta decorativa de acento y gradientes suaves (`--glow-*`) con variantes dark.

## Formas y efectos
- **Botones pill** (`rounded-full`) con inversión al hover.
- **Cards** `rounded-xl` con `shadow-soft`; variante `hover` con elevación sutil.
- **Header** flotante tipo pill, sticky con `backdrop-blur` al hacer scroll; resalta el enlace activo.

## Motion (discreto)
- **`<Reveal>`** — fade + slide-up al entrar en viewport (`motion`), respeta `prefers-reduced-motion`.
- **`<AnimatedNumber>`** — conteo ascendente para KPIs (PnL, valor de cartera), con formato de divisa.

## Componentes del sistema
`src/components/{ui,theme,motion,layout}`. Primitivas: `button`, `card`, `badge`, `count-up`.
- Clases condicionales **siempre** con `cn()`. Variantes con `class-variance-authority`.

## Storybook (DoD)
- **Storybook v10** con `@storybook/nextjs-vite` (compatible con Next 16 + React 19).
- **Tailwind v4** vía `@tailwindcss/vite` en `viteFinal` (`.storybook/main.ts`) + `import '../src/app/globals.css'`
  en `.storybook/preview.tsx`. Addons: `addon-a11y`, `addon-docs`.
- **NO** usar `@storybook/addon-vitest` (exige Vitest 3/4; el proyecto va en Vitest 2). El comportamiento se
  cubre con **RTL** co-locado (`*.test.tsx`).
- Stories **co-locadas** (`*.stories.tsx`), formato **CSF3**.
- **Toggle de tema** (Light/Dark) en la toolbar para revisar cada componente en ambos temas.

### Definition of Done de un componente
1. Implementación con tokens/primitivas + `cn()`.
2. **Story** cubriendo variantes y estados.
3. **Test RTL** de comportamiento (no solo render).

## Accesibilidad
- Navegación por teclado, foco visible (`focus-visible:ring-ring`), contraste AA en ambos temas.
- Motion respeta `prefers-reduced-motion`; el toggle de tema evita mismatch de hidratación.

## Nota para la hackathon
El sistema viene "de fábrica" de home-os: **reutilizarlo** ahorra horas. Priorizar el flujo demo sobre
pulir cada primitiva; el DoD completo (story + test por componente) es la meta, no un bloqueo para demostrar.
