# World Selfie Check — testing documentation (S4.3)

Status: 🟧 draft — developer half from the S1.5 integration record; **user half deliberately empty
until S3.2 puts the live widget in front of real users**. Feedback here is lived, not invented.

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

## B. User friction (to be filled from real runs — do not write ahead of testing)

Protocol: two-browser run (laptop + phone via QR), first-time users, Property demo room.

- [ ] Time from tapping the gate to a verified nullifier: ___
- [ ] Where a first-time user hesitates (World App install? camera permission? QR hand-off?): ___
- [ ] Failure/retry behaviour observed and how confusing it was: ___
- [ ] Device/permission prompts encountered (exact sequence): ___
- [ ] Drop-off points / anything a judge stumbled on: ___

## C. What we'd tell the World team in one paragraph

_(write last, after B)_
