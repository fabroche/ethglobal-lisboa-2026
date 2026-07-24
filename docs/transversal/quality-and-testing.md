# T · Quality & testing

Status: 🟧 draft.

## Tools
- **Vitest** + Testing Library (unit/components) · **Storybook** (isolated UI, variants/states, a11y) ·
  **Playwright** (E2E) · **ESLint** + **Prettier** · `tsc --noEmit`.
- Storybook: **v10** with `@storybook/nextjs-vite` (Next 16 + React 19). Tailwind v4 via `@tailwindcss/vite`
  in `viteFinal` and `import '../src/app/globals.css'` in `.storybook/preview.tsx`. (We do **not** use
  `addon-vitest` because it requires Vitest 3/4 and the project runs Vitest 2.)

## Definition of Done (mandatory)
A component/feature is **not done** without:
1. **Implementation** with the design system (tokens, `cn()`, primitives).
2. **Story** in Storybook covering variants and states (co-located `*.stories.tsx`).
3. **RTL test** of behaviour (interaction, validation, states; not just render).

In addition:
- Library logic (`src/seal`, `src/attest`, `src/evaluator`, `src/registry`…) = **unit tests** (input→output).
- The critical flow (create room → write+seal → commitments → reveal → verdict) = **E2E** across **two browsers**.
- **Mobile UX** = meet the **Mobile DoD** of `mobile-first.md` (mobile-first is mandatory).

> **In a hackathon:** the full DoD is the **goal**, not a blocker for demoing. Prioritise the demo path
> end-to-end; tests concentrate where they protect most — the **seal commitment**, **attest fail-closed**,
> and **enum-only output**.

## What to test, in priority order
| Area | Key test |
|------|----------|
| `seal` commitment | **THE critical test.** Same input → same `sha256(ciphertext)`; canonical serialisation is byte-for-byte deterministic; **no clock timestamp** sneaks into the committed bytes (D12). The verifier must recompute the identical hash. |
| `attest` (`verifyEnvelope`) | Good signature → passes; **one tampered byte → FAILS CLOSED → no verdict published** (D10). Verification runs **outside** the 0G SDK. |
| `evaluator` output | Enum only — rejects free text; opt-in **gap consent** logic emits the *richest verdict both sides consented to* (`gap:*` only if BOTH opted in) (D9). |
| `registry` messages | Every HCS message validates against its Zod schema; **version field** present from message 1; a **sequence gap** is a tamper signal. |
| Mirror Node reads | REST responses validated with Zod; unexpected shapes rejected (D11). |
| `worldid` one-seat | A second submission from the same nullifier in the same **room + side** is rejected. |
| Anti-regression | A test that **fails** if `as any` appears at an external boundary or a mapper does not validate with Zod. |

## E2E (Playwright, two browsers)
The demo is inherently multi-party. The E2E harness drives **two browser contexts**: one becomes the
company, the other the candidate (joining via the QR/link). Cover both outcomes:
- **`not_workable`** run (positions don't overlap) — and assert neither context can read the other's terms.
- **`workable`** run (positions overlap) — assert both read the **same** one-line verdict via Mirror Node.

## Anti-regression strategy (lesson inherited from home-os)
- A test that **fails** on `as any` at any external boundary or on a mapper that doesn't validate with Zod.
- Fixture-based tests for HCS message parsing (versioned shapes; reject unversioned/legacy).
- **Story + test enforcement** (`dod-coverage.test.ts`): fails if a visual component lacks its
  co-located `*.stories.tsx` and `*.test.tsx`; known debts tracked in lists inside the test itself.

## Storybook + Next gotchas (verify the REAL render)
`build-storybook` compiles but **does not run the render**: runtime errors only surface in
`npm run storybook` or by loading the story in a browser.
- **Server Actions** (`@/lib/actions/*`) break in the browser → mocks in `.storybook/mocks/` + alias in `main.ts`.
- **`useRouter`/`usePathname`** → `nextjs.appDirectory: true` (global in `preview.tsx`).

## CI (suggested)
`lint` → `typecheck` → `test` → build. Block merge on failure (relaxable in a hackathon for speed).

## Test data
- **Fixtures** for 0G responses, HCS messages and Mirror Node REST (do not call real APIs in unit tests).
- A pinned attestation fixture (good + tampered) for the `attest` fail-closed test.
- `typecheck` + `lint` + `test` + `build` **green** before a module is marked done.
