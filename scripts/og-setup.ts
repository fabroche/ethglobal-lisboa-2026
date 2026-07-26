/**
 * `npm run og:setup` — the two one-time transactions that make a SIGNED 0G call
 * possible. See `docs/handoffs/handoff-open-threads.md` §1.
 *
 *   1. addLedger(amount)  — creates our compute account and funds it. Also
 *      creates the keypair the broker uses to sign our requests.
 *   2. acknowledgeProviderSigner(provider) — required before first use.
 *
 * WHY WE NEED THIS AT ALL. The Router (OG_KEY) answers but cannot give us a
 * signature: it pays the broker with its OWN wallet, so the broker's customer is
 * the Router, not us, and the signature endpoint rightly refuses to hand us the
 * receipt for a conversation we were never party to. To be the customer we must
 * pay the broker ourselves. That is what these two transactions set up.
 *
 * THIS SPENDS REAL MONEY on 0G mainnet. So:
 *   - DRY RUN BY DEFAULT. It prints the plan and exits without sending anything.
 *   - Pass `--confirm` to actually send. Nothing else triggers it, and no other
 *     script calls into this one.
 *
 * The SDK is used here for PAYMENT AND TRANSPORT only. It never gets to tell us
 * whether a signature is good — that stays in `src/evaluator/attest.ts` with
 * `@noble/*` (RNF-M7-001). We deliberately do not call `processResponse()`.
 */
/* eslint-disable no-console -- Same as the spike: the stdout report IS the
   deliverable, a plan and a receipt a human reads before/after spending. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import { ethers } from "ethers";

const OG_RPC = "https://evmrpc.0g.ai";
const DEFAULT_PROVIDER = "0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9";
/**
 * The contract enforces a MINIMUM to open a ledger, and it is not small:
 *
 *   "Minimum balance to create a ledger is 3 0G, but got 0.5 0G"
 *
 * Worth knowing before you fund a wallet. The per-call cost is ~0.0005 0G, so
 * this number has nothing to do with usage — it is an account-opening floor, and
 * budgeting from the call price alone gets you a wallet that cannot transact.
 * Topping up later (`depositFund`) has no such floor; only creation does.
 */
const MIN_LEDGER_OG = 3;
/** What we move into the compute ledger. A refund carries a 24-hour lock, so
 *  there is no reason to exceed the floor. */
const DEPOSIT_OG = MIN_LEDGER_OG;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function loadEnvLocal(): Record<string, string> {
  const out: Record<string, string> = {};
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/u)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/u.exec(line);
    if (!match) continue;
    let value = match[2]!.trim();
    if (value.startsWith('"') || value.startsWith("'")) {
      const quote = value[0]!;
      const end = value.indexOf(quote, 1);
      value = end === -1 ? value.slice(1) : value.slice(1, end);
    } else {
      value = value.replace(/\s+#.*$/u, "").trim();
    }
    out[match[1]!] = value;
  }
  return out;
}

function formatOg(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/u, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

async function main(): Promise<void> {
  const confirmed = process.argv.includes("--confirm");

  console.log(`\n${c.bold}0G compute setup${c.reset} ${c.dim}— ledger deposit + provider acknowledge${c.reset}`);

  const env = loadEnvLocal();
  const key = (env.OG_WALLET_PRIVATE_KEY ?? "").trim();
  if (!/^(0x)?[0-9a-fA-F]{64}$/u.test(key)) {
    console.log(`\n${c.red}OG_WALLET_PRIVATE_KEY missing or malformed.${c.reset} ${c.dim}Run npm run og:status first.${c.reset}\n`);
    process.exit(1);
  }
  const provider = (env.OG_PROVIDER_ADDRESS ?? DEFAULT_PROVIDER).trim();

  const rpc = new ethers.JsonRpcProvider(OG_RPC);
  const wallet = new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, rpc);
  const balance = await rpc.getBalance(wallet.address);

  console.log(`\n  wallet    ${c.cyan}${wallet.address}${c.reset} ${c.dim}(${formatOg(balance)} 0G)${c.reset}`);
  console.log(`  provider  ${c.dim}${provider}${c.reset}`);
  console.log(`  network   ${c.dim}0G mainnet · ${OG_RPC}${c.reset}`);

  if (balance === 0n) {
    console.log(`\n${c.red}Wallet is empty.${c.reset} ${c.dim}Fund it first — see npm run og:status.${c.reset}\n`);
    process.exit(1);
  }

  // Catch the account-opening floor here, in the dry run, rather than letting the
  // SDK reject it after `--confirm` has been typed.
  const needed = BigInt(Math.ceil(DEPOSIT_OG * 1e6)) * 10n ** 12n;
  if (balance < needed) {
    console.log(
      `\n${c.red}${c.bold}Not enough to open a ledger.${c.reset}\n` +
        `  ${c.dim}have ${formatOg(balance)} 0G · need ${DEPOSIT_OG} 0G + gas\n\n` +
        `  The contract enforces a ${MIN_LEDGER_OG} 0G minimum to CREATE a ledger. This is an\n` +
        `  account-opening floor, unrelated to usage — a call costs ~0.0005 0G, so\n` +
        `  budgeting from the call price alone leaves you short. Top-ups afterwards\n` +
        `  have no minimum.${c.reset}\n`,
    );
    process.exit(1);
  }

  console.log(`\n${c.bold}PLAN${c.reset}`);
  console.log(`  1. addLedger(${DEPOSIT_OG})            ${c.dim}spends ${DEPOSIT_OG} 0G + gas${c.reset}`);
  console.log(`  2. acknowledgeProviderSigner(...)  ${c.dim}spends gas only${c.reset}`);

  if (!confirmed) {
    console.log(
      `\n${c.yellow}${c.bold}DRY RUN — nothing was sent.${c.reset}\n` +
        `${c.dim}This is the default precisely because the next step spends real money on\n` +
        `mainnet. When the plan above is what you want:\n\n` +
        `  ${c.reset}${c.bold}npm run og:setup -- --confirm${c.reset}${c.dim}\n\n` +
        `Refunds from the ledger carry a 24-hour lock, so ${DEPOSIT_OG} 0G is deliberately\n` +
        `modest — repeat the deposit if it runs low rather than parking funds.${c.reset}\n`,
    );
    return;
  }

  console.log(`\n${c.yellow}--confirm given. Sending transactions.${c.reset}\n`);

  const broker = await createZGComputeNetworkBroker(wallet);

  // ------------------------------------------------------------ 1. the ledger
  // addLedger CREATES the account (and the request-signing keypair). If one
  // already exists it errors, and the right move is depositFund instead — so we
  // try to read first rather than guessing from an error string.
  let hasLedger = false;
  try {
    await broker.ledger.getLedger();
    hasLedger = true;
  } catch {
    hasLedger = false;
  }

  try {
    if (hasLedger) {
      console.log(`  ${c.dim}ledger exists — depositing instead of creating${c.reset}`);
      await broker.ledger.depositFund(DEPOSIT_OG);
    } else {
      await broker.ledger.addLedger(DEPOSIT_OG);
    }
    console.log(`  ${c.green}OK${c.reset}  ledger funded with ${DEPOSIT_OG} 0G`);
  } catch (error) {
    console.log(`  ${c.red}FAIL${c.reset}  ledger: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`\n${c.dim}Nothing further attempted — the acknowledge is pointless without funds.${c.reset}\n`);
    process.exit(1);
  }

  // -------------------------------------------------------- 2. the acknowledge
  try {
    await broker.inference.acknowledgeProviderSigner(provider);
    console.log(`  ${c.green}OK${c.reset}  provider acknowledged`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Already-acknowledged is a success for our purposes, not a failure.
    if (/already|exist/iu.test(message)) {
      console.log(`  ${c.green}OK${c.reset}  provider was already acknowledged`);
    } else {
      console.log(`  ${c.red}FAIL${c.reset}  acknowledge: ${message}`);
      process.exit(1);
    }
  }

  // ------------------------------------------------------------------ receipt
  const after = await rpc.getBalance(wallet.address);
  console.log(
    `\n${c.bold}${c.green}Setup complete.${c.reset}\n` +
      `  ${c.dim}wallet ${formatOg(balance)} -> ${formatOg(after)} 0G${c.reset}\n` +
      `  ${c.dim}Next: npm run spike — the broker should now recognise our chatID.${c.reset}\n`,
  );
}

void main();
