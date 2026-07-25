/**
 * DEMO script (S4.2) — **Act 3 of the demo**, and the one that does the arguing.
 *
 *   npm run demo:naive            # structural contrast, no credentials, no spend
 *   npm run demo:naive -- --live  # also ask the real enclave, to show the verdict matches
 *
 * The problem this solves: two text boxes and one line look **identical** whether
 * the comparison ran inside a TEE or in a `console.log`. "Watch it work" proves
 * nothing. So we build the same product the obvious way and show what the operator
 * can read.
 *
 * ── ON NOT BUILDING A STRAWMAN ──────────────────────────────────────────────
 * The naive path here is not a sloppy version of Seam. It is the CORRECT and
 * natural way to build this feature, and it is what any competent team would ship:
 * receive both positions, ask a model whether a deal exists, return one line. It is
 * not careless with the data — it simply has to read the data to do the job.
 *
 * That is the whole point. Comparing two positions written in plain language
 * requires a model to READ them. If the model does not run inside an enclave, then
 * whoever operates the server reads them too. Not through a bug, not through a
 * missing `if` — as an unavoidable consequence of where the model runs.
 *
 * And the naive build returns the SAME VERDICT. Removing the enclave costs nothing
 * in output and costs the users everything they were protecting. That is why this
 * is not already built, and it is the sentence the demo should leave in the room.
 */
/* eslint-disable no-console -- demo script: the stdout contrast IS the deliverable. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { x25519 } from "@noble/curves/ed25519";

import { evaluate } from "../src/evaluator/evaluate";
import { seal } from "../src/seal/seal";

import { buildSealedModel, looksLikePrivateKey } from "./lib/sealed-model";

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
};

/**
 * A property negotiation that is genuinely CLOSE — €400,000 asked against
 * €395,000 offered. Chosen deliberately: the interesting leak is not "no deal",
 * it is that the operator learns the gap is €5,000 and can trade on it.
 */
const CASE = {
  useCase: "property" as const,
  positionA:
    "I won't sell below €400,000. I need at least 15% at CPCV, signed by 20 August, and the deed within 60 days.",
  positionB:
    "I can go up to €395,000 but no further. I can put 10% down at CPCV and I need 5 months to complete.",
};

const CONSENT = { a: false, b: false };

const rule = (char = "─", width = 74): string => char.repeat(width);

function boxed(label: string, body: string, colour: string): void {
  console.log(`  ${colour}┌─ ${label} ${rule("─", Math.max(0, 68 - label.length))}${c.reset}`);
  for (const line of body.split("\n")) console.log(`  ${colour}│${c.reset} ${line}`);
  console.log(`  ${colour}└${rule("─", 71)}${c.reset}`);
}

function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
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
    if (!(match[1]! in process.env)) process.env[match[1]!] = value;
  }
}
loadEnvLocal();

async function main(): Promise<void> {
  const live = process.argv.includes("--live");

  console.log(`\n${c.bold}${rule("═")}${c.reset}`);
  console.log(`${c.bold}  ACT 3 · Break it — the same product without the enclave${c.reset}`);
  console.log(`${c.bold}${rule("═")}${c.reset}`);
  console.log(
    `${c.dim}  Same feature, same model, same verdict. The only thing that changes is\n` +
      `  where the model runs — and therefore what the operator can read.${c.reset}`,
  );

  // ─────────────────────────────────────────────────────── ① the naive build
  console.log(`\n${c.red}${c.bold}  ① THE NAIVE BUILD${c.reset} ${c.dim}— what a competent team ships${c.reset}`);
  console.log(
    `${c.dim}  Both positions POST to our server. To decide whether a deal exists, a model\n` +
      `  must read them. That model runs on ordinary infrastructure, so the server\n` +
      `  reads them too. No bug, no missing check — this is simply where the data has\n` +
      `  to be for the feature to work at all.${c.reset}\n`,
  );
  console.log(`  ${c.red}${c.bold}WHAT THE OPERATOR CAN READ:${c.reset}\n`);
  boxed("position A · seller", CASE.positionA, c.red);
  boxed("position B · buyer", CASE.positionB, c.red);

  console.log(
    `\n  ${c.red}${c.bold}And this is the part that matters.${c.reset}\n` +
      `  ${c.dim}The operator now knows both reserve prices, so they know the gap is\n` +
      `  ${c.reset}${c.bold}€5,000${c.reset}${c.dim} — and that the buyer moves in months while the seller wants\n` +
      `  60 days. That is not a privacy nicety, it is a tradeable position against\n` +
      `  both of their own users:\n` +
      `    · tell the seller to hold firm, and the buyer pays more\n` +
      `    · tell the buyer to wait, and the seller drops\n` +
      `    · or simply sell the fact that these two are €5,000 apart\n` +
      `  Neither side can detect any of it. Both of them see one word.${c.reset}`,
  );

  // ───────────────────────────────────────────────────────────────── ② Seam
  console.log(`\n${c.green}${c.bold}  ② SEAM${c.reset} ${c.dim}— the same product, sealed${c.reset}`);
  console.log(
    `${c.dim}  Positions are encrypted in the browser to the enclave's key. What reaches\n` +
      `  our server is ciphertext, and what reaches the public topic is a hash of it.${c.reset}\n`,
  );

  // A throwaway recipient key, matching the default suite (x25519). This demo is
  // about WHERE plaintext exists, which the real enclave encryption key would not
  // change — and that key does not exist yet anyway (D-M6-2 / handoff §3.1). Said
  // plainly rather than glossed over.
  const recipientHex = Buffer.from(x25519.getPublicKey(x25519.utils.randomPrivateKey())).toString("hex");
  const sealedA = await seal(CASE.positionA, recipientHex);
  const sealedB = await seal(CASE.positionB, recipientHex);

  console.log(`  ${c.green}${c.bold}WHAT THE OPERATOR CAN READ:${c.reset}\n`);
  boxed(
    "commitment A",
    `sha256(ciphertext) = ${sealedA.commitment}\nciphertext         = ${sealedA.sealedPayload.ciphertext.slice(0, 44)}…`,
    c.green,
  );
  boxed(
    "commitment B",
    `sha256(ciphertext) = ${sealedB.commitment}\nciphertext         = ${sealedB.sealedPayload.ciphertext.slice(0, 44)}…`,
    c.green,
  );
  console.log(
    `\n  ${c.dim}No price. No percentage. No date. And we hold no key that would change\n` +
      `  that — run ${c.reset}npm run inspect${c.dim} to read our actual store, live.${c.reset}`,
  );

  // ───────────────────────────────────── ③ the caveat, before anyone asks it
  console.log(`\n${c.yellow}${c.bold}  ③ WHERE THE PLAINTEXT STILL EXISTS${c.reset} ${c.dim}— said out loud${c.reset}`);
  console.log(
    `${c.dim}  Sealing does not make plaintext vanish; it moves WHERE it exists. A model\n` +
      `  must still read words, so inside the enclave the positions are in the clear.\n` +
      `  The claim is about WHO can see them, never that they stop existing.\n` +
      `  Overstating this is how the Q&A is lost (spec-03 §5).${c.reset}`,
  );

  // ──────────────────────────────────────────────────────── ④ same verdict
  console.log(`\n${c.magenta}${c.bold}  ④ THE VERDICT IS THE SAME EITHER WAY${c.reset}`);

  if (live) {
    const verdict = await askTheEnclave();
    if (verdict) {
      console.log(`\n  naive build : ${c.bold}${verdict}${c.reset} ${c.dim}— operator read both positions${c.reset}`);
      console.log(`  Seam        : ${c.bold}${verdict}${c.reset} ${c.dim}— operator read two hashes${c.reset}`);
    }
  } else {
    console.log(
      `${c.dim}  Not calling the model in this run. Re-run with ${c.reset}-- --live${c.dim} to have the real\n` +
        `  enclave judge this exact case and print its verdict here.${c.reset}`,
    );
  }

  console.log(`\n${c.bold}${rule("═")}${c.reset}`);
  console.log(
    `${c.bold}  Removing the enclave costs you nothing in output.${c.reset}\n` +
      `${c.bold}  It costs the users everything they were trying to protect.${c.reset}`,
  );
  console.log(`${c.dim}  That gap is the product — and it is why this is not already built.${c.reset}`);
  console.log(`${c.bold}${rule("═")}${c.reset}\n`);
}

/**
 * Ask the real enclave to judge this case, through the same code production uses.
 * Plumbing comes from `lib/sealed-model.ts`; the prompt, request body and
 * validation are the shared production modules, so this is the real path.
 */
async function askTheEnclave(): Promise<string | null> {
  const key = process.env.OG_WALLET_PRIVATE_KEY ?? "";
  if (!looksLikePrivateKey(key)) {
    console.log(
      `${c.yellow}  Skipped: OG_WALLET_PRIVATE_KEY is not set.${c.reset} ${c.dim}See npm run og:status.${c.reset}`,
    );
    return null;
  }

  try {
    const model = await buildSealedModel({ privateKey: key });
    const result = await evaluate(
      { ...CASE, consent: CONSENT },
      { model, pinnedModel: process.env.OG_MODEL },
    );

    if (!result.ok) {
      console.log(`${c.yellow}  The enclave declined: ${result.reason}${c.reset}`);
      return null;
    }
    console.log(`${c.dim}  served by ${result.model}${c.reset}`);
    return result.verdict;
  } catch (error) {
    console.log(
      `${c.yellow}  Could not reach the enclave: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
    );
    return null;
  }
}

void main();
