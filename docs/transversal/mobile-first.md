# T · Mobile-first — adaptability & mobile UX

Status: 🟧 draft · **transversal and mandatory** rule for every screen. Complements the design system
(`transversal/design-system.md`): this document is *how* each screen must feel on a phone.

> **Principle.** Seam is demoed and consumed on both desktop and phone (**a judge may scan the QR and
> open a room on their own phone**). We design **mobile-first**: the base of every class is the mobile
> view and it *scales up* with breakpoints (`sm:`, `md:`, `lg:`). Never the other way round. No screen
> is done if on a phone it feels like a compressed desktop.

## Breakpoints (Tailwind v4, defaults)
| Prefix | Min width | Typical use |
|--------|-----------|-------------|
| *(base)* | 0 | **Mobile. The starting point of every class.** |
| `sm:` | 40rem (640px) | large phone / portrait tablet |
| `md:` | 48rem (768px) | tablet / small desktop — **breakpoint for nav and dense layouts** |
| `lg:` | 64rem (1024px) | desktop |

Rule of thumb: write the mobile version first with no prefix, then add `sm:`/`md:`/`lg:` only to
*grow* or *reorganise* on larger screens.

## Mandatory patterns
### 1. Navigation
- Seam is a **short three-screen flow** (create · write+seal · verdict), not a dashboard, so navigation
  is mostly linear. Any persistent controls (theme toggle, "new room") stay within thumb reach.
- **Single source** of any nav items (`nav-items.tsx`) if a header/bottom bar is used; never duplicate the list.
- The layout reserves bottom padding on mobile = bar height + `safe-area-inset-bottom` when a fixed bar exists.

### 2. Dense blocks → stacked cards
The general tool for any block that would be unreadable when squeezed is `.reflow-cards`: below `md`
it reflows to **stacked cards**, one per row, each cell labelled by its `data-label`.
```html
<table class="reflow-cards w-full text-sm">
  …
  <td data-label="Side">…</td>   <!-- the label appears on the left on mobile -->
```
In Seam this applies to the **room-status list** (side A committed? side B committed? deadline) rather
than a data table — but the pattern is the same.

### 3. Fluid typography
The base is the **mobile** size; it grows on `sm:`/`lg:`. Readable body ≥14px.
```html
<h1 class="text-3xl sm:text-4xl">
<div class="text-2xl sm:text-3xl">…</div>  <!-- the one-line verdict / countdown -->
```
The **verdict** (`workable` / `not_workable`) and the **countdown** must be legible at **360px** — they
are the payoff of the whole flow.

### 4. Touch targets ≥ 44px
Touch controls ≥44px. `size="sm"` buttons grow on mobile (`max-sm:h-11 max-sm:px-5`). Nothing depends
**only** on `hover` (it does not exist on touch): every hover action has a tap/visible equivalent.

### 5. Inputs and the position textarea
The **write-position textarea** is full-width on mobile, natural width on desktop; the "seal" button is
a full-width primary on mobile. Any filter/option rows use `flex-wrap`.

### 6. Layout and safe-area
- `container-app` with responsive side padding.
- Respect the notch / bottom bar with `env(safe-area-inset-*)` when there are fixed elements (e.g. a
  sticky "seal" CTA on the write screen).
- Grids: 1 column on mobile → `sm:grid-cols-2` where it helps (e.g. side A / side B status).

### 7. Light + dark
Every screen is tested in both themes (semantic verdict tokens, never loose colours).

## Mobile DoD (checklist before merge)
- [ ] Tested at **360–390px** wide in light **and** dark.
- [ ] **No accidental horizontal scroll.**
- [ ] Dense blocks reflowed (`.reflow-cards`) or with **intentional**, indicated scroll.
- [ ] Touch targets ≥44px; no action depends on `hover` alone.
- [ ] The **QR to join** is scannable and centred; the **verdict + countdown** legible at 360px.
- [ ] Readable typography (body ≥14px) and scaled headings.
- [ ] `safe-area` respected if there are fixed elements.
- [ ] Covered by RTL test (general DoD) and, where applicable, a Storybook story.

## Anti-patterns (do NOT)
- Design desktop and "shrink" it.
- Dense blocks with no reflow and no intentional scroll.
- Fixed px sizes that don't scale; body text < 14px.
- Actions available only on `hover`.
