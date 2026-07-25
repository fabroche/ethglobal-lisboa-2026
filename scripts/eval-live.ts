/**
 * `npm run eval:live` — S2.2 acceptance against the REAL enclave.
 *
 * The unit tests prove the logic against a fake model; this proves the adapter
 * and the prompt work on the actual pinned model. They fail for different reasons
 * and both matter: a green test suite with a prompt the model ignores is a module
 * that passes CI and loses the demo.
 *
 * Costs a few real calls (~0.0005 0G each). Read-only with respect to the topic:
 * nothing is published, this only asks the enclave for verdicts.
 */
/* eslint-disable no-console -- The stdout report IS the deliverable, same as the
   spike: a human reads this to decide whether the prompt actually works. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Static, because the SDK's ESM bundle breaks under dynamic import ("does not
// provide an export named 'C'"). Safe here: neither of these reads env at import
// time, so loading .env.local below still happens before anything needs it.
import { createZGComputeNetworkBroker } from "@0gfoundation/0g-compute-ts-sdk";
import { ethers } from "ethers";

import { evaluate } from "../src/evaluator/evaluate";
import { buildChatRequest, readChatCompletion, signatureBaseFrom } from "../src/evaluator/og-request";

/** Load .env.local BEFORE src/config/env.ts is imported (Zod, fail-fast). */
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

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

/**
 * Cases with an unambiguous right answer, so a wrong verdict means the prompt is
 * broken rather than the negotiation being genuinely close. Judging the model's
 * taste is not what this script is for.
 */
const CASES = [
  {
    name: "workable · overlapping ranges",
    expect: "workable",
    positionA: "I won't sell below €390,000. I need the deed within 90 days.",
    positionB: "I can pay up to €400,000 and I'd like the deed within 60 days.",
  },
  {
    name: "not workable · price cannot meet",
    expect: "not_workable",
    positionA: "I won't sell below €500,000. Deed within 30 days.",
    positionB: "I can pay at most €300,000, and I need at least 12 months.",
  },
  {
    name: "not workable · only timing blocks",
    expect: "not_workable",
    positionA: "€400,000 firm, but the deed must close within 30 days.",
    positionB: "Happy to pay €400,000. I cannot complete for at least 10 months.",
  },
] as const;

let failures = 0;

function report(label: string, passed: boolean, detail?: string): void {
  if (!passed) failures += 1;
  const tag = passed ? `${c.green}PASS${c.reset}` : `${c.red}FAIL${c.reset}`;
  console.log(`  ${tag}  ${label}${detail ? ` ${c.dim}(${detail})${c.reset}` : ""}`);
}

async function main(): Promise<void> {
  console.log(`\n${c.bold}S2.2 · evaluator against the live enclave${c.reset}`);
  console.log(`${c.dim}Nothing is published — this only asks for verdicts.${c.reset}\n`);

  // The client is built INLINE rather than imported from `og-client.ts`, which is
  // marked `server-only` and throws under tsx. Same pattern as `inspect.ts` and
  // `seed-room.ts`. The privacy-critical part is not duplicated: the request body
  // comes from the same `buildChatRequest` the real adapter uses, so what runs here
  // is what runs in production.
  const key = (process.env.OG_WALLET_PRIVATE_KEY ?? "").trim();
  if (!/^(0x)?[0-9a-fA-F]{64}$/u.test(key)) {
    console.log(`${c.red}OG_WALLET_PRIVATE_KEY missing or malformed.${c.reset} ${c.dim}Run npm run og:status.${c.reset}\n`);
    process.exit(1);
  }

  let endpoint: string;
  let model: string;
  let broker: Awaited<ReturnType<typeof createZGComputeNetworkBroker>>;
  const provider = "0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9";
  try {
    const wallet = new ethers.Wallet(
      key.startsWith("0x") ? key : `0x${key}`,
      new ethers.JsonRpcProvider("https://evmrpc.0g.ai"),
    );
    broker = await createZGComputeNetworkBroker(wallet);
    ({ endpoint, model } = await broker.inference.getServiceMetadata(provider));
  } catch (error) {
    console.log(`${c.red}Could not reach the broker.${c.reset} ${error instanceof Error ? error.message : String(error)}`);
    console.log(`${c.dim}Run npm run og:status — the compute ledger is separate from the wallet.${c.reset}\n`);
    process.exit(1);
  }
  console.log(`${c.dim}broker ${signatureBaseFrom(endpoint)} · model ${model}${c.reset}\n`);

  let lastChatId: string | undefined;
  const client = {
    async complete(request: { system: string; user: string; responseFormat: Record<string, unknown> }) {
      const headers = await broker.inference.getRequestHeaders(provider);
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(headers as unknown as Record<string, string>) },
        body: JSON.stringify(buildChatRequest({ model, ...request })),
        signal: AbortSignal.timeout(120_000),
      });
      const raw = await response.text();
      if (!response.ok) throw new Error(`0G broker HTTP ${response.status}: ${raw.slice(0, 200)}`);
      const parsed = JSON.parse(raw) as Parameters<typeof readChatCompletion>[0];
      lastChatId = response.headers.get("zg-res-key") ?? parsed.id;
      return readChatCompletion(parsed);
    },
  };

  const deps = { model: client, pinnedModel: process.env.OG_MODEL };

  // ---------------------------------------------- bare verdicts (no gap consent)
  console.log(`${c.cyan}${c.bold}No gap consent — only the two bare verdicts are permitted${c.reset}`);
  for (const testCase of CASES) {
    const result = await evaluate(
      {
        positionA: testCase.positionA,
        positionB: testCase.positionB,
        useCase: "property",
        consent: { a: false, b: false },
      },
      deps,
    );

    if (!result.ok) {
      report(testCase.name, false, `${result.reason}: ${result.detail ?? ""}`);
      continue;
    }
    report(testCase.name, result.verdict === testCase.expect, `got ${result.verdict}`);
    // The leak control, checked on real output: with no consent the enclave must
    // not return a gap value at all.
    report(`  └ no gap value without consent`, !result.verdict.startsWith("gap:"), result.verdict);
  }

  // ------------------------------------------------ gap verdicts (both consented)
  console.log(`\n${c.cyan}${c.bold}Both sides consented — gap:single / gap:multiple permitted${c.reset}`);
  for (const testCase of CASES.filter((t) => t.expect === "not_workable")) {
    const result = await evaluate(
      {
        positionA: testCase.positionA,
        positionB: testCase.positionB,
        useCase: "property",
        consent: { a: true, b: true },
      },
      deps,
    );

    if (!result.ok) {
      report(testCase.name, false, `${result.reason}: ${result.detail ?? ""}`);
      continue;
    }
    // Either a bare not_workable or a gap is acceptable — the model deciding it
    // cannot cleanly attribute the blocker is the CORRECT behaviour, not a bug
    // (D9 as amended). What must never happen is `workable`.
    report(testCase.name, result.verdict !== "workable", `got ${result.verdict}`);
  }

  console.log(`\n${c.bold}${failures === 0 ? `${c.green}GO` : `${c.yellow}${failures} failure(s)`}${c.reset}`);
  if (failures > 0) {
    console.log(
      `${c.dim}A wrong verdict on these cases means the PROMPT is wrong, not the model:\n` +
        `the cases are deliberately unambiguous. Check src/evaluator/prompt.ts.${c.reset}\n`,
    );
  }
  process.exit(failures === 0 ? 0 : 1);
}

void main();
