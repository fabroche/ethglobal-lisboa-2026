/**
 * Ensure a World action record exists before verification (M3, root-caused Sat night).
 *
 * Per-room actions are created dynamically — but only the **precheck** endpoint auto-creates
 * them; `/verify` does NOT, and returns `invalid_action` for an unknown action. The v2 widget
 * bridge never touches the portal, so the very first verification for a fresh room raced a
 * record that nothing had created. Calling precheck first closes the race (idempotent: it
 * creates on first sight, then just reports).
 *
 * Fail-open on purpose: if precheck itself errors, we still attempt verification — the
 * fail-CLOSED gate stays where it belongs, on `verify` (claimSeat throws without a valid
 * proof). Creation is best-effort; verification is the security boundary.
 */
const PRECHECK_URL = "https://developer.worldcoin.org/api/v1/precheck";

export async function ensureAction(
  appId: string,
  action: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  try {
    await fetchFn(`${PRECHECK_URL}/${appId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, nullifier_hash: "" }),
    });
  } catch {
    // Best-effort — verify remains the fail-closed gate.
  }
}
