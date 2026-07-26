import { test, expect, type Page, type Request } from "@playwright/test";

/**
 * S3.4 — the two-browser end-to-end, the flow a judge performs.
 *
 * Creator (Buyer) opens a room with a ~90s deadline, hands the counterpart (Seller)
 * their join link; both write, verify (E2E fixture proof), seal in-browser, and commit
 * to the real Hedera topic; the deadline passes and the first verdict-page poll runs
 * the real reveal in the 0G enclave; both browsers must render the SAME verdict.
 *
 * Real services throughout EXCEPT World verification (a headless browser has no human
 * proof — faked via E2E_FAKE_WORLD, one-seat logic still exercised). RNF-M8-002 is
 * checked directly: no network request ever carries the plaintext position.
 */

const SELLER_POSITION = "PLAINTEXT_SELLER_won't sell below 400000 EUR";
const BUYER_POSITION = "PLAINTEXT_BUYER_can pay up to 420000 EUR";

/** Fail the test if any request body/URL contains a plaintext marker (RNF-M8-002). */
function guardNoPlaintextEgress(page: Page, markers: string[]) {
  const leaks: string[] = [];
  page.on("request", (req: Request) => {
    const haystack = `${req.url()} ${req.postData() ?? ""}`;
    for (const m of markers) if (haystack.includes(m)) leaks.push(`${req.method()} ${req.url()}`);
  });
  return () => leaks;
}

/** Open the write page directly, re-navigating until Mirror has indexed the room's expiry. */
async function openWriteForm(page: Page, roomId: string, side: "A" | "B") {
  const field = page.getByRole("textbox", { name: /^position$/i });
  await expect(async () => {
    await page.goto(`/room/${roomId}/write?side=${side}`);
    await expect(field).toBeVisible({ timeout: 4_000 });
  }).toPass({ timeout: 60_000 });
}

async function writeSealCommit(page: Page, roomId: string, side: "A" | "B", position: string) {
  await openWriteForm(page, roomId, side);
  await page.getByRole("textbox", { name: /^position$/i }).fill(position);
  await page.getByRole("button", { name: /verify \(e2e fixture\)/i }).click();
  await expect(page.getByRole("button", { name: /verified \(e2e\)/i })).toBeVisible();
  await page.getByRole("button", { name: /seal and commit/i }).click();
  await expect(page.getByText(/sealed and committed/i)).toBeVisible({ timeout: 60_000 });
}

test("two browsers reach one identical verdict, with no plaintext egress", async ({ browser }) => {
  const buyerCtx = await browser.newContext();
  const sellerCtx = await browser.newContext();
  const buyer = await buyerCtx.newPage();
  const seller = await sellerCtx.newPage();

  const buyerLeaks = guardNoPlaintextEgress(buyer, [BUYER_POSITION]);
  const sellerLeaks = guardNoPlaintextEgress(seller, [SELLER_POSITION]);

  // 1. Buyer creates the room (deadline ~90s out), declares their side, opts into gap.
  await buyer.goto("/create");
  await buyer.getByRole("radio", { name: /property sale/i }).click();
  await buyer.getByRole("radio", { name: /^buyer$/i }).click();
  // Enough runway for Mirror indexing + two sequential seals before the clock fires.
  const deadline = new Date(Date.now() + 150_000);
  const local = new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  await buyer.getByLabel(/deadline/i).fill(local);
  await buyer.getByRole("checkbox").check();
  await buyer.getByRole("button", { name: /open room/i }).click();

  // 2. Room-ready: grab the Seller's join link, and the Buyer's own write link.
  await expect(buyer.getByText(/room ready/i)).toBeVisible();
  const sellerJoin = await buyer.getByRole("textbox", { name: /room join link/i }).inputValue();
  const roomId = new URL(sellerJoin).pathname.split("/")[2]!;

  // 3. Both write + verify + seal + commit. Buyer declared side B, so the counterpart
  //    (Seller) is side A. Navigate directly — Mirror-indexing retry is in openWriteForm.
  await writeSealCommit(seller, roomId, "A", SELLER_POSITION);
  await writeSealCommit(buyer, roomId, "B", BUYER_POSITION);

  // 4. Both watch the countdown; the deadline passes and the reveal runs on first poll.
  await buyer.goto(`/room/${roomId}/verdict`);
  await seller.goto(`/room/${roomId}/verdict`);

  const verdict = /workable|not workable|no deal|deal is possible|one issue|several issues/i;
  await expect(buyer.getByRole("status")).toContainText(verdict, { timeout: 150_000 });
  await expect(seller.getByRole("status")).toContainText(verdict, { timeout: 150_000 });

  // 5. Verdict parity (RNF-M8-003): both browsers show the same line.
  const buyerVerdict = (await buyer.getByRole("status").textContent())?.trim();
  const sellerVerdict = (await seller.getByRole("status").textContent())?.trim();
  expect(buyerVerdict).toBe(sellerVerdict);

  // 6. Privacy (RNF-M8-002): no request ever carried a plaintext position.
  expect(buyerLeaks(), "buyer position leaked to the network").toEqual([]);
  expect(sellerLeaks(), "seller position leaked to the network").toEqual([]);

  await buyerCtx.close();
  await sellerCtx.close();
});
