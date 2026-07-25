/**
 * `npm run og:status` — what does our 0G operating wallet need before it can pay
 * for a sealed call? READ-ONLY: no transaction is sent, nothing is spent.
 *
 * Answers three questions in order, because they fail for different reasons:
 *
 *   1. Is OG_WALLET_PRIVATE_KEY a usable key, and which address is it?
 *   2. Does that address hold 0G on mainnet? (gas + the deposit itself)
 *   3. Is anything deposited in the compute `ledger` contract?
 *
 * (3) is the one that bites. Holding 0G in the wallet is NOT the same as having
 * it available to pay a provider — the deposit is a separate transaction. We were
 * bitten by exactly this shape of mistake twice already this weekend, so it gets
 * its own check rather than a comment.
 *
 * NEVER prints the private key, and never a fragment of it. It prints the derived
 * ADDRESS, which is public by construction.
 */
/* eslint-disable no-console -- Same as the spike: this script's stdout report IS
   its deliverable, a status a human reads. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";

// 0G mainnet. From the SDK's constants.js — values, not code.
const OG_RPC = "https://evmrpc.0g.ai";
const LEDGER_CONTRACT = "0x2dE54c845Cd948B72D2e32e39586fe89607074E3";
const MAINNET_CHAIN_ID = 16661n;

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

/** Same minimal .env.local reader the spike uses — inline comments and all. */
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
    // Strip an inline comment ONLY when the value is not quoted — a `#` inside
    // quotes is data. Getting this wrong cost us a debugging session already.
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

async function rpc(method: string, params: unknown[]): Promise<string | null> {
  try {
    const response = await fetch(OG_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json()) as { result?: string; error?: { message?: string } };
    if (json.error) {
      console.log(`  ${c.red}RPC error${c.reset} ${c.dim}${method}: ${json.error.message}${c.reset}`);
      return null;
    }
    return json.result ?? null;
  } catch (error) {
    console.log(`  ${c.red}RPC unreachable${c.reset} ${c.dim}${error instanceof Error ? error.message : String(error)}${c.reset}`);
    return null;
  }
}

/** wei -> 0G, trimmed. Kept exact via BigInt; no float until display. */
function formatOg(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/u, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

async function main(): Promise<void> {
  console.log(`\n${c.bold}0G operating wallet — status${c.reset}`);
  console.log(`${c.dim}Read-only. Nothing is sent, nothing is spent.${c.reset}\n`);

  const env = loadEnvLocal();
  const raw = (env.OG_WALLET_PRIVATE_KEY ?? "").trim();

  if (!raw) {
    console.log(`${c.red}${c.bold}OG_WALLET_PRIVATE_KEY is not set${c.reset} in .env.local.`);
    console.log(`${c.dim}See .env.example. Use a DEDICATED wallet with only a few 0G.${c.reset}\n`);
    process.exit(1);
  }

  // ---------------------------------------------------------------- 1. the key
  const hex = raw.replace(/^0x/iu, "");
  if (!/^[0-9a-fA-F]{64}$/u.test(hex)) {
    console.log(`${c.red}${c.bold}That does not look like a private key.${c.reset}`);
    console.log(
      `${c.dim}Expected 64 hex characters (32 bytes), with or without 0x. Got ${hex.length} chars.\n` +
        `If you pasted a SEED PHRASE, remove it: a seed controls every account\n` +
        `derivable from it, forever, and nothing here needs that. Export the\n` +
        `private key of a single account instead.${c.reset}\n`,
    );
    process.exit(1);
  }

  let address: string;
  try {
    const pub = secp256k1.getPublicKey(hex, false); // uncompressed, 65 bytes
    address = `0x${Buffer.from(keccak_256(pub.subarray(1)).subarray(-20)).toString("hex")}`;
  } catch (error) {
    console.log(`${c.red}Could not derive an address from the key${c.reset} ${c.dim}${error instanceof Error ? error.message : String(error)}${c.reset}\n`);
    process.exit(1);
  }

  console.log(`${c.green}key parses${c.reset} — wallet address:`);
  console.log(`  ${c.bold}${c.cyan}${address}${c.reset}`);
  console.log(`  ${c.dim}Public by construction. This is the address to fund.${c.reset}\n`);

  // ------------------------------------------------------------ 2. the network
  const chainIdHex = await rpc("eth_chainId", []);
  if (chainIdHex) {
    const chainId = BigInt(chainIdHex);
    const ok = chainId === MAINNET_CHAIN_ID;
    console.log(
      `${ok ? c.green + "on 0G mainnet" : c.yellow + "unexpected chain"}${c.reset} ` +
        `${c.dim}chainId=${chainId}${ok ? "" : ` (expected ${MAINNET_CHAIN_ID})`}${c.reset}`,
    );
  }

  // ------------------------------------------------------------ 3. the balance
  const balanceHex = await rpc("eth_getBalance", [address, "latest"]);
  if (balanceHex === null) {
    console.log(`\n${c.yellow}Could not read the balance — try again in a moment.${c.reset}\n`);
    process.exit(2);
  }
  const balance = BigInt(balanceHex);
  const funded = balance > 0n;
  console.log(
    `${funded ? c.green + "wallet funded" : c.red + "wallet EMPTY"}${c.reset} ` +
      `${c.dim}${formatOg(balance)} 0G${c.reset}`,
  );

  // ------------------------------------------------- 4. the ledger sub-account
  // getLedger() is keyed by caller (msg.sender), so eth_call needs `from` set to
  // our address — the whole point is to read OUR sub-account, not a global.
  const selector = Buffer.from(keccak_256(new TextEncoder().encode("getLedger(address)")))
    .toString("hex")
    .slice(0, 8);
  const ledgerHex = await rpc("eth_call", [
    {
      from: address,
      to: LEDGER_CONTRACT,
      data: `0x${selector}${address.replace(/^0x/u, "").padStart(64, "0")}`,
    },
    "latest",
  ]);

  let deposited: bigint | null = null;
  if (ledgerHex && ledgerHex !== "0x" && ledgerHex.length > 2) {
    // The struct's shape is not something we should guess at; what we need is
    // "is there anything in here at all". Any non-zero word means yes.
    const words = (ledgerHex.slice(2).match(/.{64}/gu) ?? []).map((w) => BigInt(`0x${w}`));
    deposited = words.find((w) => w > 0n && w < 10n ** 30n) ?? 0n;
    console.log(
      `${deposited > 0n ? c.green + "ledger has a balance" : c.yellow + "ledger EMPTY"}${c.reset} ` +
        `${c.dim}~${formatOg(deposited)} 0G deposited for compute${c.reset}`,
    );
  } else {
    console.log(
      `${c.yellow}no ledger account yet${c.reset} ` +
        `${c.dim}(expected — it is created by the first deposit)${c.reset}`,
    );
    deposited = 0n;
  }

  // ------------------------------------------------------------- what to do
  console.log(`\n${c.bold}${c.cyan}NEXT${c.reset}`);
  if (!funded) {
    console.log(
      `  ${c.bold}Send 0G to ${address}${c.reset}\n` +
        `  ${c.dim}How much: 0.5 0G is plenty. A sealed call costs ~0.0005 0G, so that is\n` +
        `  ~1000 calls, and it leaves room for the two setup transactions (gas).\n` +
        `  Do NOT send more than you would shrug off — this key sits in a .env\n` +
        `  during a live demo. Network: 0G mainnet (chainId ${MAINNET_CHAIN_ID}).${c.reset}\n`,
    );
    process.exit(2);
  }
  if (deposited === 0n) {
    console.log(
      `  ${c.bold}Wallet is funded; the compute ledger is not.${c.reset}\n` +
        `  ${c.dim}Two one-time transactions are still needed before a signed call works:\n` +
        `    1. deposit into the ledger contract (funds the compute account)\n` +
        `    2. acknowledge the provider (required before first use)\n` +
        `  Next script does both — this one only ever reads.${c.reset}\n`,
    );
    process.exit(2);
  }
  console.log(`  ${c.green}Funded and deposited.${c.reset} ${c.dim}Ready to try a signed call.${c.reset}\n`);
}

void main();
