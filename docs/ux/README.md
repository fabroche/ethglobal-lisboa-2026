# UX · screens, sitemap & sponsor value

Status: 🟧 draft · Last updated: 2026-07-24 · Owner: Frank + Dylan (review together)

Working documents for the **visual design discussion** between the two workstreams, before any
screen is built. They answer three questions: *what routes exist*, *what each screen looks like*,
and *where a judge can physically see each sponsor doing its job*.

| File | Language | Use |
|------|----------|-----|
| [`screens-and-sitemap.md`](./screens-and-sitemap.md) | English | **Canonical.** The version that feeds M8 and the backlog. |
| [`screens-and-sitemap.es.md`](./screens-and-sitemap.es.md) | Español | Mirror for the discussion. Prose translated; **UI copy, routes, component names and code stay in English**. |

> **Language exception.** D2 says the repo is English-only. These two files are the one deliberate
> exception: they exist to be argued over by two people in the room, and one of them thinks in
> Spanish. The English file is the source of truth — if the two disagree, English wins and the
> Spanish one gets fixed.

## What is decided vs. what is open

- **Decided here:** the route table, the room state machine, the screen inventory, the component
  inventory (extends `modules/M8-web.md` §9), and the sponsor-visibility rules.
- **Open — take these to the discussion:** see §9 of either file. Anything resolved there gets
  promoted to `00-overview/05-open-decisions.md`.

## Related

- `modules/M8-web.md` — the RF/RNF for the web module (these screens implement it).
- `transversal/design-system.md` — tokens, typography, verdict colours, Storybook DoD.
- `transversal/mobile-first.md` — the mobile DoD every screen must pass.
- `00-overview/03-sponsors-prizes.md` — the removal test these screens must make *visible*.
