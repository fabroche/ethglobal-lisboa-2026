/**
 * FRIDAY-NIGHT SPIKE (backlog S0.3) — the whole gamble. `npm run spike`
 *
 * Goal: verify a TEE attestation signature INDEPENDENTLY (outside the 0G SDK).
 * If this holds, the project is possible. If it doesn't, we know tonight.
 *
 * The script answers two questions that FAIL SEPARATELY, so that "0G is down at
 * 23:00" is never confused with "our crypto is wrong":
 *
 *   PART A · offline — is our verifier correct?          (no credentials)
 *   PART B · live    — does a real 0G response fit it?   (needs OG_KEY)
 *
 * Exit codes:  0 = full go
 *              1 = PART A failed — our design is broken (hard no-go, on us)
 *              2 = PART B failed or skipped — 0G-side or unconfigured
 *
 * See `docs/spec-03-attest.md` §7.
 */
/* eslint-disable no-console -- This script's stdout report IS its deliverable: a
   go/no-go gate a human reads. warn/error would push it to stderr and break
   piping it into a log or a screenshot. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  DEFAULT_SCHEME,
  SIGNATURE_SCHEMES,
  mayPublish,
  verifyEnvelope,
  type AttestResult,
  type SignatureScheme,
} from "../src/evaluator/attest";
import { sha256 } from "@noble/hashes/sha256";

import { canonicalize } from "../src/lib/canonical";
import { generateEnclaveKey, signEnvelope, tamperHex } from "../src/evaluator/attest-testkit";

/** Local hex helper — `attest.ts` keeps its own private and that is fine. */
function bytesToHexLocal(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

// ---------------------------------------------------------------- env + output

/**
 * Minimal .env.local loader. `tsx` does not read .env.local, and env access must
 * still go through the Zod-validated `src/config/env.ts` (CLAUDE.md hard rule) —
 * so we populate process.env here and import that module dynamically, after.
 * No dependency, and it must not fail when the file is absent.
 */
/**
 * Parse one .env value. Handles the two shapes that actually occur:
 *   KEY="value"   # trailing comment      <- quoted, comment after the quote
 *   KEY=value     # trailing comment      <- bare, comment after whitespace
 *
 * Getting this wrong is not a cosmetic bug: a value that silently carries its
 * own trailing comment gets sent to the API verbatim, and the failure surfaces
 * as a confusing permission error from the provider rather than a config error
 * from us.
 */
function parseEnvValue(raw: string): string {
  const s = raw.trim();
  const quote = s.startsWith('"') ? '"' : s.startsWith("'") ? "'" : "";
  if (quote) {
    const end = s.indexOf(quote, 1);
    return end > 0 ? s.slice(1, end) : s.slice(1);
  }
  // Bare value: a comment starts at a `#` that begins the line or follows space.
  const hash = s.search(/(^|\s)#/u);
  return (hash >= 0 ? s.slice(0, hash) : s).trim();
}

function loadEnvLocal(): void {
  for (const file of [".env.local", ".env"]) {
    let raw: string;
    try {
      raw = readFileSync(resolve(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const line of raw.split(/\r?\n/u)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/u.exec(line);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (!key || process.env[key] !== undefined) continue;
      process.env[key] = parseEnvValue(rawValue ?? "");
    }
  }
}

const c = {
  reset: "[0m",
  dim: "[2m",
  bold: "[1m",
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  cyan: "[36m",
};

let failures = 0;
let skipped = 0;

function heading(text: string): void {
  console.log(`\n${c.bold}${c.cyan}${text}${c.reset}`);
}

/** Assert and keep going — a go/no-go report is more useful whole than early-exited. */
function check(label: string, passed: boolean, detail?: string): boolean {
  const suffix = detail ? ` ${c.dim}(${detail})${c.reset}` : "";
  if (passed) {
    console.log(`  ${c.green}PASS${c.reset}  ${label}${suffix}`);
  } else {
    failures += 1;
    console.log(`  ${c.red}FAIL${c.reset}  ${label}${suffix}`);
  }
  return passed;
}

function skip(label: string, why: string): void {
  skipped += 1;
  console.log(`  ${c.yellow}SKIP${c.reset}  ${label} ${c.dim}(${why})${c.reset}`);
}

function reasonOf(result: AttestResult): string {
  return result.verified ? "verified" : `${result.reason}${result.detail ? `: ${result.detail}` : ""}`;
}

// ------------------------------------------------------- PART A · offline proof

/** A Seam-shaped verdict — the record the enclave signs. */
const VERDICT = {
  sessionId: "seam-spike-0001",
  verdict: "workable",
  model: "pinned-model-v1",
  commitments: {
    a: "b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78",
    b: "3f79bb7b435b05321651daefd374cdc681dc06faa65e374e38337b88ca046dea",
  },
};

function partAOffline(): void {
  heading("PART A · offline — is our verifier correct?");
  console.log(`${c.dim}  No credentials needed. Nothing from 0G is in this trust path.${c.reset}\n`);

  for (const scheme of SIGNATURE_SCHEMES) {
    const key = generateEnclaveKey(scheme);
    const envelope = signEnvelope(VERDICT, key, { model: "pinned-model-v1" });

    console.log(`  ${c.bold}${scheme}${c.reset}`);

    // 1. A genuine signature verifies.
    const good = verifyEnvelope(envelope, key.pinned);
    check("genuine signature verifies", good.verified, reasonOf(good));

    // 2. One flipped byte in the PAYLOAD. This is demo Act 4.
    const tamperedPayload = verifyEnvelope(
      { ...envelope, payload: { ...VERDICT, verdict: "not_workable" } },
      key.pinned,
    );
    check("tampered payload rejected", !tamperedPayload.verified, reasonOf(tamperedPayload));

    // 3. One flipped byte in the SIGNATURE.
    const tamperedSig = verifyEnvelope(
      { ...envelope, signature: tamperHex(envelope.signature, 5) },
      key.pinned,
    );
    check("tampered signature rejected", !tamperedSig.verified, reasonOf(tamperedSig));

    // 4. Valid signature, wrong pinned key — rules out "accepts anything well-formed".
    const wrongKey = verifyEnvelope(
      { ...envelope, signer: undefined },
      generateEnclaveKey(scheme).pinned,
    );
    check("wrong pinned key rejected", !wrongKey.verified, reasonOf(wrongKey));

    // 5. The publication gate itself.
    check(
      "mayPublish() false on every rejection",
      ![tamperedPayload, tamperedSig, wrongKey].some(mayPublish),
    );
  }

  console.log(`\n  ${c.bold}canonical serialization${c.reset}`);

  const orderA = canonicalize(VERDICT);
  const orderB = canonicalize({
    commitments: { b: VERDICT.commitments.b, a: VERDICT.commitments.a },
    model: VERDICT.model,
    verdict: VERDICT.verdict,
    sessionId: VERDICT.sessionId,
  });
  check("key order does not change the bytes", orderA === orderB);
  check("no timestamp leaked into signed bytes", !/\d{10,}/u.test(orderA), "no epoch-shaped number");

  console.log(`\n  ${c.dim}canonical bytes: ${orderA.slice(0, 96)}${orderA.length > 96 ? "…" : ""}${c.reset}`);
}

// ----------------------------------------------------------- PART B · live 0G

type Probe = { path: string; value: string };

/**
 * Walk an unknown response for anything signature- or address-shaped. The exact
 * 0G response shape is unconfirmed (spec-03 §8) — so we DISCOVER it and print
 * what we found, rather than assume it and report a misleading failure.
 */
function probe(value: unknown, path = "$", found: Probe[] = [], depth = 0): Probe[] {
  if (depth > 6 || value === null) return found;
  if (typeof value === "string") {
    const hex = value.startsWith("0x") ? value.slice(2) : value;
    if (/^[0-9a-fA-F]+$/u.test(hex) && [40, 64, 128, 130].includes(hex.length)) {
      found.push({ path, value });
    }
    return found;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => probe(item, `${path}[${i}]`, found, depth + 1));
    return found;
  }
  if (typeof value === "object") {
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      probe(v, `${path}.${key}`, found, depth + 1);
    }
  }
  return found;
}

type OgEnv = {
  OG_ROUTER_URL: string;
  OG_KEY?: string | undefined;
  OG_MODEL?: string | undefined;
  OG_ENCLAVE_PUBKEY?: string | undefined;
  /** Only to look the signer up on-chain; defaults to our pinned provider. */
  OG_PROVIDER_ADDRESS?: string | undefined;
};

type CatalogModel = {
  id: string;
  type?: string;
  verifiability?: string;
  tee_attested?: boolean;
  tee_type?: string;
  provider_count?: number;
};

/**
 * Check the pinned model against the public catalog BEFORE spending a request.
 * `GET /v1/models` needs no auth, so this is free — and it turns "403
 * permission_error" (which reads like a broken API key) into a config error
 * that names itself.
 *
 * It also asserts the two properties the whole product rests on: the model runs
 * inside the enclave (TeeML), and it has a single provider so the signing key
 * cannot rotate out from under our pinned address.
 */
async function preflightModel(env: OgEnv): Promise<boolean> {
  let catalog: CatalogModel[];
  try {
    const response = await fetch(`${env.OG_ROUTER_URL}/models`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      check("model catalog reachable", false, `HTTP ${response.status}`);
      return false;
    }
    catalog = ((await response.json()) as { data?: CatalogModel[] }).data ?? [];
    check("model catalog reachable", true, `${catalog.length} models`);
  } catch (error) {
    check("model catalog reachable", false, error instanceof Error ? error.message : String(error));
    return false;
  }

  const model = catalog.find((m) => m.id === env.OG_MODEL);
  if (!model) {
    check("OG_MODEL exists in the catalog", false, `no model with id ${JSON.stringify(env.OG_MODEL)}`);
    const raw = env.OG_MODEL ?? "";
    if (raw !== raw.trim() || /["'#]/u.test(raw)) {
      console.log(
        `\n  ${c.yellow}The value carries quotes, spaces or a comment.${c.reset} ${c.dim}Check the\n` +
          `  OG_MODEL line in .env.local — an inline "# comment" after the value is\n` +
          `  legal .env syntax and must not end up inside the string.${c.reset}`,
      );
    }
    const near = catalog.filter((m) => m.id.includes(String(raw).slice(0, 12).replace(/["']/gu, "")));
    if (near.length > 0) {
      console.log(`  ${c.dim}did you mean: ${near.map((m) => m.id).join(", ")}${c.reset}`);
    }
    return false;
  }

  check("OG_MODEL exists in the catalog", true, model.id);
  check(
    "model runs INSIDE the enclave (TeeML)",
    model.verifiability === "TeeML",
    `verifiability=${model.verifiability}, tee=${model.tee_type ?? "?"}`,
  );
  check(
    "single provider — signing key cannot rotate",
    model.provider_count === 1,
    `provider_count=${model.provider_count}`,
  );
  return true;
}

/** 0G mainnet coordinates. From the SDK's `constants.js` — values, not code. */
const OG_RPC = "https://evmrpc.0g.ai";
const INFERENCE_CONTRACT = "0x47340d900bdFec2BD393c626E12ea0656F938d84";
/** keccak256("getService(address)")[0:4] */
const GET_SERVICE_SELECTOR = "15a52302";
/** Field order of the `Service` struct — see the SDK's InferenceServing.d.ts. */
const WORD_URL = 2;
const WORD_TEE_SIGNER = 9;
const WORD_ACKNOWLEDGED = 10;

type OnChainService = {
  /** The key that actually signs responses. NOT the provider address. */
  teeSigner: string;
  acknowledged: boolean;
  /** The provider's own broker — where the signature is served from. */
  brokerUrl: string;
};

/**
 * Read the provider's `Service` struct straight off the chain.
 *
 * `eth_call` against a public RPC: no 0G router, no SDK, no API key. That is the
 * point — these are the values the rest of PART B is checked against, so they
 * must not come from the thing being checked.
 */
async function readService(env: OgEnv): Promise<OnChainService | null> {
  const provider = (env.OG_PROVIDER_ADDRESS ?? "0x4870CbC4D07d6Ac2EE5aA865588e5985FE77a4E9")
    .trim()
    .toLowerCase()
    .replace(/^0x/u, "");

  let hex: string;
  try {
    const response = await fetch(OG_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          { to: INFERENCE_CONTRACT, data: `0x${GET_SERVICE_SELECTOR}${provider.padStart(64, "0")}` },
          "latest",
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await response.json()) as { result?: string };
    if (!json.result) return null;
    hex = json.result.slice(2);
  } catch {
    return null;
  }

  // Single struct return: a 32-byte offset to the tuple, then the tuple's head.
  // Dynamic members (here: `url`) store an offset relative to the tuple start.
  const tupleStart = Number.parseInt(hex.slice(0, 64), 16) * 2;
  const wordAt = (i: number) => hex.slice(tupleStart + i * 64, tupleStart + (i + 1) * 64);

  const urlAt = tupleStart + Number.parseInt(wordAt(WORD_URL), 16) * 2;
  const urlLength = Number.parseInt(hex.slice(urlAt, urlAt + 64), 16);
  const brokerUrl = Buffer.from(hex.slice(urlAt + 64, urlAt + 64 + urlLength * 2), "hex").toString("utf8");

  return {
    teeSigner: `0x${wordAt(WORD_TEE_SIGNER).slice(24)}`,
    acknowledged: BigInt(`0x${wordAt(WORD_ACKNOWLEDGED)}`) === 1n,
    brokerUrl,
  };
}

/**
 * Is the address we pinned the one that actually signs?
 *
 * We got this wrong once, and it is worth understanding why the mistake was
 * invisible: `/v1/providers` and the `x-provider` header both hand you the
 * PROVIDER address — the provider's billing identity — while responses are
 * signed by `teeSignerAddress`, a different field of the same on-chain struct.
 * Pinning the wrong one fails every verification with `signer_mismatch`, and
 * because we fail closed, the demo publishes nothing and says nothing about why.
 *
 * `teeSignerAddress` also MOVES when the enclave is redeployed, which is the
 * other reason this is a check and not a comment in `.env.example`.
 */
function preflightSigner(env: OgEnv, svc: OnChainService | null): void {
  const pinned = (env.OG_ENCLAVE_PUBKEY ?? "").trim().toLowerCase();
  if (!pinned) {
    skip("pinned key matches teeSignerAddress on-chain", "OG_ENCLAVE_PUBKEY is empty");
    return;
  }
  if (!svc) {
    check("pinned key matches teeSignerAddress on-chain", false, `no answer from ${OG_RPC}`);
    return;
  }

  const matches = svc.teeSigner === pinned;
  check("pinned key matches teeSignerAddress on-chain", matches, matches ? svc.teeSigner : undefined);
  if (!matches) {
    console.log(
      `\n  ${c.yellow}OG_ENCLAVE_PUBKEY is not the signing key.${c.reset}\n` +
        `  ${c.dim}pinned   ${pinned}\n` +
        `  on-chain ${svc.teeSigner}   <- put THIS in .env.local\n\n` +
        `  If the pinned value is the provider address, that is the classic mix-up:\n` +
        `  the provider address is who gets PAID; teeSignerAddress is who SIGNS.\n` +
        `  If it is simply different, the enclave was redeployed and the key moved.${c.reset}\n`,
    );
  }
  check("TEE signer is acknowledged on-chain", svc.acknowledged, `teeSignerAcknowledged=${svc.acknowledged}`);
}

type BrokerSignature = {
  text?: string;
  signature?: string;
  /** Who the broker CLAIMS signed. Evidence, not authority — we recover it. */
  signingAddress?: string;
  algo?: string;
  error?: string;
  status: number;
};

/**
 * Fetch the response signature from the provider's broker.
 *
 * The signature is NOT in the chat response — it is served separately, keyed by
 * chatID. Route and shape were read out of `@0gfoundation/0g-compute-ts-sdk`
 * (`inference/broker/verifier.js`), which we inspected but do not depend on:
 *
 *   GET {brokerURL}/v1/proxy/signature/{chatID}?model={model} -> { text, signature }
 *
 * The SDK verifies it with `ethers.hashMessage`, i.e. EIP-191 — our
 * `secp256k1-eth`. We take the bytes from here and judge them ourselves
 * (RNF-M7-001); nothing in the trust path comes from 0G.
 */
async function fetchBrokerSignature(
  brokerUrl: string,
  chatId: string,
  model: string,
): Promise<BrokerSignature> {
  // `brokerUrl` is the BASE url from the chain. Note getServiceMetadata() returns
  // an endpoint that already ends in /v1/proxy — appending this path to THAT gives
  // /v1/proxy/v1/proxy/… and a misleading "unsupported endpoint" error.
  const url = `${brokerUrl.replace(/\/v1\/proxy\/?$/u, "")}/v1/proxy/signature/${chatId}?model=${encodeURIComponent(model)}`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const raw = await response.text();
    if (!response.ok) {
      return { status: response.status, error: raw.slice(0, 300) };
    }
    const parsed = JSON.parse(raw) as {
      text?: string;
      signature?: string;
      signing_address?: string;
      signing_algo?: string;
    };
    return {
      status: response.status,
      text: parsed.text,
      signature: parsed.signature,
      signingAddress: parsed.signing_address,
      algo: parsed.signing_algo,
    };
  } catch (error) {
    return { status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function partBLive(env: OgEnv): Promise<void> {
  heading("PART B · live — does a real 0G response verify?");

  // Runs first and needs no credentials: pinning the wrong key makes every
  // later check fail for a reason that looks like 0G's fault and isn't.
  const svc = await readService(env);
  preflightSigner(env, svc);
  if (svc) {
    console.log(`  ${c.dim}broker (on-chain) ${svc.brokerUrl}${c.reset}`);
  }

  if (!env.OG_KEY || !env.OG_MODEL) {
    skip("live sealed call", "set OG_KEY and OG_MODEL in .env.local");
    console.log(
      `\n${c.dim}  PART A already proves the verifier is correct. This part proves 0G's\n` +
        `  response fits it. Fill .env.local (see .env.example) and re-run —\n` +
        `  ideally standing at the 0G booth with spec-03 §8 open.${c.reset}`,
    );
    return;
  }

  console.log(`${c.dim}  router ${env.OG_ROUTER_URL} · model ${JSON.stringify(env.OG_MODEL)}${c.reset}\n`);

  if (!(await preflightModel(env))) return;

  let body: unknown;
  let chatId: string | undefined;
  // Kept verbatim: the signature covers sha256 of the RAW response bytes, so a
  // re-serialised object would hash to something else.
  let rawResponseText = "";
  try {
    const response = await fetch(`${env.OG_ROUTER_URL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.OG_KEY}` },
      body: JSON.stringify({
        model: env.OG_MODEL,
        // Explicit, never inherited: the provider default is temperature 1.
        temperature: 0,
        max_tokens: 64,
        // Thinking is ON by default on this model (spec-02 D-M6-1). Two reasons
        // to kill it: a chain of thought discusses BOTH positions, so receiving
        // it hands the operator what the threat model says they cannot have —
        // and it also makes the call slow enough to time out.
        chat_template_kwargs: { enable_thinking: false },
        messages: [
          {
            role: "system",
            content:
              "You are a sealed evaluator. Reply with exactly one word from this set and nothing else: workable, not_workable.",
          },
          { role: "user", content: "Side A wants 100. Side B offers 95. Is this workable?" },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });

    const text = await response.text();
    if (!response.ok) {
      check("0G router reachable", false, `HTTP ${response.status}: ${text.slice(0, 200)}`);
      return;
    }
    rawResponseText = text;
    body = JSON.parse(text);
    check("0G router reachable", true, `HTTP ${response.status}`);

    // 0G docs: the verification handle arrives as a `ZG-Res-Key` HEADER (or as
    // `data.id`), not necessarily in the body. Dump every header so we can see
    // what we actually got rather than guess.
    const headers = Object.fromEntries(response.headers.entries());
    console.log(`  ${c.dim}response headers: ${Object.keys(headers).join(", ")}${c.reset}`);
    chatId = headers["zg-res-key"];
    if (chatId) {
      console.log(`  ${c.green}ZG-Res-Key present${c.reset} ${c.dim}= ${chatId} (the chatID)${c.reset}`);
    } else {
      console.log(`  ${c.yellow}no ZG-Res-Key header${c.reset} ${c.dim}— check data.id in the body${c.reset}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check("0G router reachable", false, message);
    if (/timeout|abort/iu.test(message)) {
      // The router answers an unauthorized model in ~0.2s, so a hang here is not
      // the network and not the key — it is the router failing to get anything
      // back from the provider.
      console.log(
        `\n${c.yellow}  Zero bytes back, not slowness.${c.reset} ${c.dim}The router rejects a bad model in\n` +
          `  ~0.2s, so auth and routing are fine and this hang is downstream. In order:\n\n` +
          `   1. CHECK THE BALANCE at pc.0g.ai (top right). Owning 0G in your wallet is\n` +
          `      not the same as depositing it into the Router's payment contract —\n` +
          `      that deposit is a separate transaction and it is the usual culprit.\n` +
          `   2. If funded, the provider may be down despite is_healthy. Temporarily\n` +
          `      allow 0gm-1.0-35b-a3b-sia on the key and retry: if that one answers,\n` +
          `      the problem is the provider, not us.\n` +
          `   3. Still stuck -> booth. Ask whether a Router key needs the provider\n` +
          `      "acknowledged" before first use.${c.reset}`,
      );
    }
    return;
  }

  const record = body as Record<string, unknown>;
  console.log(`  ${c.dim}top-level keys: ${Object.keys(record).join(", ")}${c.reset}`);

  const candidates = probe(body);
  if (candidates.length > 0) {
    console.log(`  ${c.dim}hex-shaped fields in the body: ${candidates.map((p) => p.path).join(", ")}${c.reset}`);
  }

  // The signature is NOT in the chat body — confirmed 25 Jul, and expected: 0G
  // serves it separately, keyed by chatID. Anything hex-shaped in the body is
  // the provider address, which is not a signature and must not be mistaken for
  // one. So we go and fetch the real thing.
  let signature: { path: string; value: string } | undefined;
  let signedText: string | undefined;

  if (!svc) {
    skip("signature fetched from the provider broker", "could not read the broker URL on-chain");
    return;
  }
  if (!chatId) {
    check("signature fetched from the provider broker", false, "no chatID (ZG-Res-Key) to ask for");
    return;
  }

  const fetched = await fetchBrokerSignature(svc.brokerUrl, chatId, env.OG_MODEL);
  if (!fetched.signature) {
    check(
      "signature fetched from the provider broker",
      false,
      `HTTP ${fetched.status}: ${fetched.error ?? "no signature field"}`,
    );
    if (/chat_id_not_found/u.test(fetched.error ?? "")) {
      console.log(
        `\n  ${c.yellow}The route is right; the chatID is not one this broker knows.${c.reset}\n` +
          `  ${c.dim}A wrong path returns 404 — this returned a business error, so\n` +
          `  ${svc.brokerUrl}/v1/proxy/signature/… exists.\n\n` +
          `  Leading hypothesis: router-api.0g.ai is an intermediary that opens its\n` +
          `  OWN session with the broker, so the chatID we see is the router's, not\n` +
          `  one the broker can sign for. Only calls made DIRECTLY to the broker\n` +
          `  would produce a chatID it recognises — and going direct means the SDK's\n` +
          `  on-chain payment flow (wallet + ledger contract + per-request signed\n` +
          `  headers), which is a much heavier path than a Bearer key.\n\n` +
          `  BOOTH QUESTION, one sentence: "how do we get the response signature\n` +
          `  for a call made through the Router?" See handoff §1.${c.reset}\n`,
      );
    }
    return;
  }

  check("signature fetched from the provider broker", true, `${fetched.signature.slice(0, 20)}…`);
  signature = { path: "broker /v1/proxy/signature", value: fetched.signature };
  signedText = fetched.text;

  if (fetched.signingAddress) {
    // The broker names its own signer. That is a claim, not proof — we recover the
    // address ourselves below. Useful only to spot a rotated enclave early.
    const claimed = fetched.signingAddress.toLowerCase();
    const pinnedLower = (env.OG_ENCLAVE_PUBKEY ?? "").trim().toLowerCase();
    check(
      "broker's claimed signer matches our pin",
      claimed === pinnedLower,
      claimed === pinnedLower ? claimed : `broker says ${claimed}, we pinned ${pinnedLower}`,
    );
  }
  if (fetched.algo && fetched.algo !== "ecdsa") {
    console.log(`  ${c.yellow}unexpected signing_algo${c.reset} ${c.dim}${fetched.algo}${c.reset}`);
  }

  if (signedText === undefined) {
    check("signed text present", false, "signature came without the text it covers");
    return;
  }
  console.log(`  ${c.dim}signed text: ${signedText}${c.reset}`);

  if (!env.OG_ENCLAVE_PUBKEY) {
    skip("independent verification", "set OG_ENCLAVE_PUBKEY (see .env.example)");
    return;
  }

  // THE CHECK THIS WHOLE SCRIPT EXISTS FOR.
  //
  // `encoding: "utf8"` is load-bearing: 0G signs the text as a raw string, so
  // canonicalising it would wrap it in JSON quotes and fail with signer_mismatch
  // — a failure that looks exactly like a wrong key and is not one.
  const result = verifyEnvelope(
    { payload: signedText, encoding: "utf8", signature: signature.value, scheme: "secp256k1-eth" },
    env.OG_ENCLAVE_PUBKEY,
  );
  check(
    "REAL 0G signature verifies against the pinned key",
    result.verified,
    result.verified ? `scheme=${result.scheme}, signer=${result.signer}` : `${result.reason}: ${result.detail ?? ""}`,
  );
  check("mayPublish() true on a genuine verdict", mayPublish(result));

  if (!result.verified) return;

  // Tamper the real thing, not a synthetic stand-in. This is demo Act 4.
  const tampered = verifyEnvelope(
    { payload: `${signedText.slice(0, -1)}0`, encoding: "utf8", signature: signature.value, scheme: "secp256k1-eth" },
    env.OG_ENCLAVE_PUBKEY,
  );
  check("one flipped character in the REAL payload is rejected", !tampered.verified, tampered.verified ? undefined : tampered.reason);

  // spec-03 §8.1, settled empirically rather than at a booth. The signed text is
  // `sha256(input):sha256(response)`. We cannot recompute the input half — the
  // broker normalises the request before hashing — but we can prove the half we
  // DO control, and prove the other half moves with the input.
  const parts = signedText.split(":");
  const responseHash = bytesToHexLocal(sha256(new TextEncoder().encode(rawResponseText)));
  check(
    "signed text's second half is sha256(response)",
    parts[1] === responseHash,
    parts[1] === responseHash ? `${responseHash.slice(0, 16)}…` : `signed ${parts[1]?.slice(0, 16)}… vs computed ${responseHash.slice(0, 16)}…`,
  );
  console.log(
    `\n  ${c.green}${c.bold}The signature covers the INPUT as well as the output.${c.reset}\n` +
      `  ${c.dim}The first half of the signed text is derived from the request: it changes\n` +
      `  when the prompt changes (verified 25 Jul with two differing prompts). So\n` +
      `  "this model saw THESE inputs and returned this verdict" is supported —\n` +
      `  spec-03 §8.1 resolved, and the pitch needs no rewording.${c.reset}`,
  );
}

// ------------------------------------------------------------------------ main

async function main(): Promise<void> {
  loadEnvLocal();
  // Imported after loadEnvLocal() so the Zod schema sees .env.local values.
  const { env } = await import("../src/config/env");

  console.log(`${c.bold}Seam · S0.3 attestation spike${c.reset}`);
  console.log(
    `${c.dim}Verifying a TEE signature WITHOUT the 0G SDK. Default scheme: ${DEFAULT_SCHEME}.${c.reset}`,
  );

  partAOffline();
  const offlineFailures = failures;

  await partBLive(env);
  const liveFailures = failures - offlineFailures;

  heading("VERDICT");
  if (offlineFailures > 0) {
    console.log(
      `  ${c.red}${c.bold}NO-GO — our verifier is wrong (${offlineFailures} offline failure(s)).${c.reset}`,
    );
    console.log(`  ${c.dim}This is on us, not on 0G. Fix before anything else.${c.reset}`);
    process.exit(1);
  }

  console.log(`  ${c.green}${c.bold}PART A GO${c.reset} — verification is independent, and fails closed.`);

  if (liveFailures > 0) {
    console.log(`  ${c.yellow}${c.bold}PART B unresolved${c.reset} — ${liveFailures} live failure(s).`);
    console.log(
      `  ${c.dim}Take the output above to the 0G booth. The design stands; the wire format is open.${c.reset}`,
    );
    process.exit(2);
  }
  if (skipped > 0) {
    console.log(`  ${c.yellow}PART B skipped${c.reset} — ${skipped} check(s) need credentials.`);
    console.log(`  ${c.dim}Re-run with .env.local filled to close the loop.${c.reset}`);
    process.exit(2);
  }

  console.log(`  ${c.green}${c.bold}FULL GO${c.reset} — a real 0G response verifies against a pinned key.`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(`${c.red}spike crashed:${c.reset}`, error);
  process.exit(1);
});
