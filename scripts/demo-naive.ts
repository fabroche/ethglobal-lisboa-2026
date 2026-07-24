export {};
/**
 * DEMO script (backlog S4.2). The SAME product WITHOUT the enclave: a plain
 * server that sees both positions in the clear. This is the "break it" act —
 * it shows exactly why nobody has built this and why 0G is load-bearing.
 *
 * Run: npm run demo:naive
 */
async function main(): Promise<void> {
  console.warn("[demo-naive] not implemented yet (S4.2).");
  // TODO(S4.2): take two positions, compare in plaintext, print both — the leak.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
