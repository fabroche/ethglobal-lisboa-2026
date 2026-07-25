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

## B. User friction (to be filled from real runs — do not write ahead of testing)

Protocol: two-browser run (laptop + phone via QR), first-time users, Property demo room.

- [ ] Time from tapping the gate to a verified nullifier: ___
- [ ] Where a first-time user hesitates (World App install? camera permission? QR hand-off?): ___
- [ ] Failure/retry behaviour observed and how confusing it was: ___
- [ ] Device/permission prompts encountered (exact sequence): ___
- [ ] Drop-off points / anything a judge stumbled on: ___

## C. What we'd tell the World team in one paragraph

_(write last, after B)_
