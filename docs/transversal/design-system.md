# T · Design system

Status: 🟧 draft · applies to all `web` screens (M8).

Editorial identity **with personality** (inherited from `home-os`, adapted to a sealed-negotiation
app that must read calmly under demo pressure). Defined entirely in `src/app/globals.css`
(Tailwind v4, CSS-first, **no** `tailwind.config.js` — D1).

## Base
- **Tailwind v4** (`@theme` in `globals.css`) + **shadcn/ui** utilities (**new-york** style, **slate** base).
- **Light + Dark** via `next-themes` (`attribute="class"` → `.dark` on `<html>`).
  Provider in `src/components/theme/theme-provider.tsx`, toggle in `theme-toggle.tsx`.
- Icons: `lucide-react`.

## Typography
- **Inter Tight** (`--font-inter`) — body, data and headings. `next/font/google` in `layout.tsx`.
- **Instrument Serif** (`--font-instrument`) — *italic* accents inside headings only.
  Utility **`.serif-accent`** (serif + italic + weight 400) on the word to emphasise.
- Headings: sans, `font-weight 600`, tight `tracking`.

## Colour
- **Brand: violet / indigo** (crypto / ETHGlobal palette) as `--primary` / `--brand`; lightened in dark.
- Semantic **verdict tokens** — the domain of Overlap is a verdict, not P&L:
  - `--workable` (green, positive — a deal is possible),
  - `--not-workable` (**muted / neutral, NOT alarming red** — it is just "no deal", not an error),
  - `--pending` (amber — sealed, awaiting the scheduled reveal).
  Use these **always** (`text-workable`, `bg-pending`, …), never loose colours.
- Decorative accent palette and soft gradients (`--glow-*`) with dark variants.

## Brand — Overlap
Adopted name + identity (DA9). Two "sides" (teal + indigo) that meet on a lit common bar — the
*overlap*. Apply via **S4.8** (the token block below goes in `globals.css`, an integrator-owned file);
until then `verdict-panel` keeps its placeholder Tailwind colours.

**Tokens** — brand + the semantic verdict tokens named above. Keep the existing slate neutrals; only
these change. The old violet `--primary` becomes the indigo below (nearly the same hue — cards/buttons
barely shift).

```css
:root {
  --primary: #635bf3;            /* Side B / indigo — primary action */
  --primary-foreground: #ffffff;
  --side-a: #12b8a6;             /* Side A — teal */
  --side-b: #635bf3;             /* Side B — indigo */
  --seam:   #4d8fd6;             /* the common bar where the two sides meet */
  --workable:     #0ea472;       /* a deal is possible */
  --not-workable: #64748b;       /* neutral slate — "no deal", NOT an error */
  --pending:      #d98a0b;       /* amber — sealed, awaiting the reveal */
}
.dark {
  --primary: #8b85ff; --primary-foreground: #14122e;
  --side-a: #2dd4bf; --side-b: #8b85ff; --seam: #8fbdf0;
  --workable: #2fd39a; --not-workable: #94a3b8; --pending: #f5b841;
}
@theme inline {
  --color-side-a: var(--side-a); --color-side-b: var(--side-b); --color-seam: var(--seam);
  --color-workable: var(--workable); --color-not-workable: var(--not-workable); --color-pending: var(--pending);
}
```

**Wordmark** — `overlap`, all-lowercase, Inter Tight **800**, letter-spacing **−0.03em**.

**Mark** — two chevrons (the two sides) converging on a lit common bar. Ship as `<OverlapMark/>`
(tokens, so it themes):

```html
<svg viewBox="0 0 56 44" fill="none" role="img" aria-label="Overlap">
  <path d="M9 8 L23 22 L9 36" stroke="var(--side-a)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M47 8 L33 22 L47 36" stroke="var(--side-b)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="25" y="13.5" width="6" height="17" rx="3" fill="var(--seam)"/>
</svg>
```

Full identity board + brand kit (palette, type, applications, misuse): the exploration artifact linked in DA9.

## Shapes & effects
- **Pill buttons** (`rounded-full`) with hover inversion.
- **Cards** `rounded-xl` with `shadow-soft`; a `hover` variant with subtle elevation.
- **Header**: floating pill, sticky with `backdrop-blur` on scroll; highlights the active link.

## Motion (discreet)
- **`<Reveal>`** — fade + slide-up on entering the viewport (`motion`), respects `prefers-reduced-motion`.
- **`<AnimatedNumber>` / count-up** — used for the **countdown to the scheduled reveal** on the verdict
  screen; format as a time remaining, not a currency.

## System components
`src/components/{ui,theme,motion,layout}`. Primitives: `button`, `card`, `badge`, `count-up`.
- Conditional classes **always** with `cn()`. Variants with `class-variance-authority`.

## Storybook (DoD)
- **Storybook v10** with `@storybook/nextjs-vite` (compatible with Next 16 + React 19).
- **Tailwind v4** via `@tailwindcss/vite` in `viteFinal` (`.storybook/main.ts`) + `import '../src/app/globals.css'`
  in `.storybook/preview.tsx`. Addons: `addon-a11y`, `addon-docs`.
- **Do NOT** use `@storybook/addon-vitest` (requires Vitest 3/4; the project runs Vitest 2). Behaviour is
  covered by co-located **RTL** (`*.test.tsx`).
- Stories **co-located** (`*.stories.tsx`), **CSF3** format.
- **Theme toggle** (Light/Dark) in the toolbar to review each component in both themes.

### Component Definition of Done
1. Implementation with tokens/primitives + `cn()`.
2. **Story** covering variants and states.
3. **RTL test** of behaviour (not just render).

## Accessibility
- Keyboard navigation, visible focus (`focus-visible:ring-ring`), AA contrast in both themes.
- Motion respects `prefers-reduced-motion`; the theme toggle avoids hydration mismatch.

## Hackathon note
The system comes "out of the box" from home-os: **reuse it** to save hours. Prioritise the demo flow
(the three screens: create · write+seal · verdict) over polishing every primitive; the full DoD
(story + test per component) is the goal, not a blocker for demoing.
