/* Temp diagnostic (not for commit): does a price-only overlap yield workable? */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
function loadEnvLocal(): void {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/u)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?/u.exec(line);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!;
  }
}
loadEnvLocal();

async function main() {
  const { evaluate } = await import("../src/evaluator/evaluate");
  const { buildSealedModel } = await import("./lib/sealed-model");
  const cases = [
    { name: "price-only overlap ", a: "I won't sell below 400000 EUR.", b: "I can pay up to 420000 EUR." },
    { name: "price-only miss    ", a: "I won't sell below 400000 EUR.", b: "I can pay at most 350000 EUR." },
    { name: "4 dimensions align ",
      a: "Selling at 400000 EUR minimum, 10% at CPCV, CPCV by 30 August, deed within 90 days after.",
      b: "Buying at up to 420000 EUR, fine with 10% at CPCV, CPCV in August, deed within 3 months." },
  ];
  const model = await buildSealedModel({ privateKey: process.env.OG_WALLET_PRIVATE_KEY! });
  for (const t of cases) {
    const res = await evaluate(
      { positionA: t.a, positionB: t.b, useCase: "property", consent: { a: true, b: true } },
      { model },
    );
    console.log(t.name, "→", JSON.stringify(res));
  }
}
void main();
