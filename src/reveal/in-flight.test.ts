import { describe, it, expect, vi } from "vitest";
import { createInFlight } from "./in-flight";

describe("createInFlight (S3.21b — the per-room reveal lock)", () => {
  it("runs the task once for concurrent calls with the same key", async () => {
    const inFlight = createInFlight<string>();
    let resolve!: (v: string) => void;
    const task = vi.fn(() => new Promise<string>((r) => (resolve = r)));

    const first = inFlight.run("r_1", task);
    const second = inFlight.run("r_1", task);
    const third = inFlight.run("r_1", task);

    expect(task).toHaveBeenCalledTimes(1);
    resolve("verdict");
    await expect(first).resolves.toBe("verdict");
    await expect(second).resolves.toBe("verdict");
    await expect(third).resolves.toBe("verdict");
  });

  it("concurrent callers receive the SAME promise, not merely equal results", () => {
    const inFlight = createInFlight<string>();
    const task = () => new Promise<string>(() => {});
    expect(inFlight.run("r_1", task)).toBe(inFlight.run("r_1", task));
  });

  it("does not serialize different keys", async () => {
    const inFlight = createInFlight<string>();
    const taskA = vi.fn().mockResolvedValue("a");
    const taskB = vi.fn().mockResolvedValue("b");

    await expect(inFlight.run("r_a", taskA)).resolves.toBe("a");
    await expect(inFlight.run("r_b", taskB)).resolves.toBe("b");
    expect(taskA).toHaveBeenCalledTimes(1);
    expect(taskB).toHaveBeenCalledTimes(1);
  });

  it("clears the entry after resolution so a later poll starts fresh", async () => {
    const inFlight = createInFlight<string>();
    const task = vi.fn().mockResolvedValue("done");

    await inFlight.run("r_1", task);
    expect(inFlight.size()).toBe(0);
    await inFlight.run("r_1", task);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("clears the entry after a rejection — a failed reveal must not wedge the room", async () => {
    const inFlight = createInFlight<string>();
    const failing = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(inFlight.run("r_1", failing)).rejects.toThrow("boom");
    expect(inFlight.size()).toBe(0);

    const recovering = vi.fn().mockResolvedValue("recovered");
    await expect(inFlight.run("r_1", recovering)).resolves.toBe("recovered");
  });

  it("propagates the same rejection to every joined caller", async () => {
    const inFlight = createInFlight<string>();
    let reject!: (e: Error) => void;
    const task = () => new Promise<string>((_, r) => (reject = r));

    const first = inFlight.run("r_1", task);
    const second = inFlight.run("r_1", task);
    reject(new Error("attestation_invalid"));

    await expect(first).rejects.toThrow("attestation_invalid");
    await expect(second).rejects.toThrow("attestation_invalid");
  });
});
