/**
 * S3.21(b) · per-key in-flight deduplication.
 *
 * Both sides usually have the verdict screen open at once, and each browser polls on its
 * own — so two (or more) `revealRoom()` calls for the same room race. The topic-level
 * guard in `run-reveal` (`already_published`) reads via Mirror Node, which indexes in
 * ~3 s: useless against anything faster than that. Proven live 26 Jul — one room got
 * THREE verdicts on the topic, three enclave calls paid for.
 *
 * This joins concurrent callers onto the SAME promise instead: the first call runs, the
 * rest await its result. The entry is dropped in `finally`, so a later poll (after the
 * verdict landed, or after a failure) starts fresh.
 *
 * ⚠️ Known limitation, not to be oversold: the map is per-process. With several
 * serverless instances, two instances can still race — truly closing that would need
 * the topic to arbitrate, and Mirror's ~3 s lag prevents it. Documented in S3.21.
 */
export function createInFlight<T>() {
  const inFlight = new Map<string, Promise<T>>();

  return {
    /** Run `task` for `key`, or join the run already in flight for that key. */
    run(key: string, task: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) return existing;
      const promise = task().finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
      return promise;
    },
    /** How many keys are currently in flight (for tests and diagnostics). */
    size(): number {
      return inFlight.size;
    },
  };
}
