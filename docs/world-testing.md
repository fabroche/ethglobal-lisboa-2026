# World Selfie Check — testing documentation (S4.3)

Status: 🟧 draft — developer half from the S1.5 integration record; user half (§B/§C) filled from
the 25–26 Jul live runs, **still open for updates before submission**. Feedback here is lived,
not invented.

> Track requirement (Selfie Check Beta): document **developer friction** and **user friction**.
> See `transversal/integration-worldid.md` §3.

## A. Developer friction (from the S1.5 integration, as recorded in M3)

1. **Per-room action scoping was the big unknown.** We need one nullifier per `(room, side)` — not
   per app — or a negotiator could never open a second room. Whether a runtime-constructed action id
   (`seam-<roomId>-<side>`, `src/worldid/action.ts`) is a supported pattern was not clear from the
   docs alone; it took the Friday workshop (our DA4) to confirm. Clear documentation of
   "dynamic/incognito actions and nullifier scope" would have saved the round-trip.
2. **Widget and server verification want opposite bundles.** `IDKitWidget` is a client bundle;
   `verifyCloudProof` is server-side. We had to isolate the only `@worldcoin/idkit` import in
   `cloud-verifier.ts` (same pattern as our Hedera SDK boundary) so unit tests of the seat/claim
   logic never pull the widget bundle. Worth a docs example for SSR/App-Router projects.
3. **Credentials arrived late and gated a whole screen.** `WORLD_APP_ID` / `WORLD_ACTION` were the
   blocking config for the write+seal screen (S3.2) for ~a day. For a hackathon beta, faster/clearer
   developer-portal provisioning is the single highest-leverage improvement.
4. **No offline test story for cloud verify.** Unit tests fake the `WorldVerifier` port; the real
   `verifyCloudProof` path is only coverable live (E2E/manual). A documented test/staging mode or a
   verifiable fixture proof would let CI cover the real adapter.
5. **Meta: the requirements of this very document** were only pinned down by asking at the booth —
   the track page's description of the testing doc is thin.

_To append during S3.2: any friction mounting `IDKitWidget` in the write+seal screen (App Router,
two-browser flow, per-side action strings)._

6. **World ID 4.0 enablement (Sat evening, live portal):** Selfie Check turned out to be
   **4.x-only** (`selfieCheckLegacy` preset) — not discoverable from the portal UI; we found it in
   the docs after building against IDKit v2 levels. The "Enable World ID 4.0" wizard then blocked us
   with **"RP registration is not active. Please ensure your app is properly registered."** — a
   chicken-and-egg inside the enablement flow itself (likely lost wizard state after an interrupted
   first run, or async Relying Party Registry propagation). The error string appears in no public
   docs. A resumable wizard, or an explicit "registration pending/failed" status on the app page,
   would have saved the evening. _Resolution: (fill in — restart worked / new app worked / booth.)_

7. **What the docs never said but the API confirmed (Sat night, live precheck calls):** unregistered
   actions **auto-create on first reference** (`status: active`, `max_verifications: 1`) — our
   per-room `seam-<roomId>-<side>` scoping works with zero pre-registration. This is the single most
   important integration fact for our design and we found it by probing `POST /api/v1/precheck`,
   not in any doc. Also visible only via API: `enable_face_check: true` on our app — nothing in the
   portal UI shows Selfie Check's enablement state.

8. **Silent failure on insecure origins (Sat night, reproduced twice on the phone):** serving the
   app over plain HTTP on a LAN IP (standard hackathon setup), the IDKit modal renders and offers
   "Open World App", but tapping it does **nothing** — no error anywhere. Root cause read from the
   v2 source (`packages/core/src/bridge.ts`): `createClient` starts with `await generateKey()`
   (WebCrypto) — on a non-secure origin this **throws on its first line**, so `connectorURI` stays
   `null` and the button has no URL to open, while the state sits in `PreparingClient` and the error
   only reaches the console. The widget should surface "this page must be served over HTTPS"
   instead of rendering a dead button. **Root fix on our side:** serve the app over HTTPS with
   a valid certificate (tunnel or local TLS) and point `APP_URL` at it so QR links carry the HTTPS
   origin; pending team go-ahead on public tunnel exposure. Note: our own `seal()` needs WebCrypto
   too — the same origin problem would have bitten the sealing step next.

## What we ship, stated plainly

**This submission uses World ID device-level verification, not Selfie Check.** We attempted the
Selfie Check integration in earnest: the credential is only reachable through the World ID 4.0
stack (`selfieCheckLegacy`, IDKit 4.x), and the portal's "Enable World ID 4.0" wizard blocked us
with the undocumented "RP registration is not active" error (§A.6), with no booth available to
unstick it. The 4.x migration path is fully specified in `transversal/integration-worldid.md` §5
and the server half (v4 verification) already runs in production here. What the device-level flow
still delivers: one real proof per human per `(room, side)`, enforced by World's
`max_verifications: 1` and our seat registry — the anti-probing property the product needs. What
it does not deliver: the face check itself. We say this here, in the body, on purpose: a beta
track deserves honest reporting more than a hidden substitution.

## B. User friction (from real runs, 25–26 Jul)

Protocol: two-browser runs (laptop + two phones via QR), first-time users, Property demo room.
Scope caveat: Selfie Check's own UI was unreachable for our app (4.x-only — §A.6), so this
reports the **device-verification** flow users actually went through, not the selfie capture.

- [x] **Time from tapping the gate to a verified nullifier:** ~1–2 min the first time, dominated
  by the World App hand-off; **a few seconds** on repeat runs.
- [x] **Where a first-time user hesitates:** (a) the **World App install requirement** — a party
  invited by QR who doesn't have the app hits an install detour mid-flow; (b) the QR-inside-a-QR
  moment: after scanning our room QR with the camera, IDKit presents *another* QR/deep-link into
  World App, which reads as "didn't I just do this?"; (c) nothing in the default flow says *why*
  an identity app is involved — we added our own explanatory copy.
- [x] **Failure/retry behaviour:** the worst moment of our testing. World allows **one
  verification per person per action** (deliberately — it is our one-seat-per-side control). When
  the flow died after the in-app verification but before our server accepted it (the
  `invalid_action` night, §A), the user's single verification was already **spent**: on retry
  World answers "already verified" and refuses, with no explanation and no way forward — a
  silent, permanent lock-out from the room, surfaced only as raw jargon. We reordered our server
  checks so a submit doomed for other reasons is rejected **before** touching World, specifically
  so it cannot burn someone's only attempt (S3.24c).
- [x] **Device/permission prompts (sequence):** browser → deep-link/QR into World App → in-app
  confirm → automatic return to the browser. The return hand-off worked every time, but there is
  a beat of dead air where the browser shows nothing until the proof lands.
- [x] **Drop-off points** (where a real user would give up): (1) the mid-flow app install for an
  invited party; (2) the burned-verification dead-end — someone staring at "already verified"
  with no path forward quits.

## C. What we'd tell the World team in one paragraph

We signed up to test Selfie Check and never reached it: Selfie Check requires the 4.x flow, and
the verify path was blind to our (new-generation portal) app — v2 rejected it silently, and
nothing surfaced that the incompatibility was generational rather than a bug in our code
(§A.6–7). We
shipped device verification instead, so the beta feature itself went untested by us, and §B above
reports the flow we could reach. Three asks: (1) **human-readable errors in IDKit** —
`invalid_action` told us nothing actionable; (2) **a documented compatibility story for
new-generation apps** across the verify APIs; (3) **a recovery path when a failed flow consumes
a user's single verification** — today it is a silent dead-end.
