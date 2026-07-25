import { describe, it, expect, vi } from "vitest";
import {
  armReveal,
  onRevealFired,
  initRevealTriggers,
  isDeadlineReached,
} from "./reveal";
import type { ScheduleService } from "./service";

function fakeService(): ScheduleService & { armed: { roomId: string; revealAt: string }[] } {
  const armed: { roomId: string; revealAt: string }[] = [];
  return {
    armed,
    async arm(input) {
      armed.push(input);
      return { scheduleId: "0.0.777", revealAt: input.revealAt };
    },
    async status() {
      return { executed: false };
    },
  };
}

const NOW = new Date("2026-07-26T06:00:00Z");

describe("armReveal", () => {
  it("arms the reveal at the future deadline", async () => {
    const service = fakeService();
    const armed = await armReveal(
      { roomId: "r_1", deadlineIso: "2026-07-26T09:00:00Z" },
      { service, now: () => NOW },
    );
    expect(armed.scheduleId).toBe("0.0.777");
    expect(service.armed[0]).toEqual({ roomId: "r_1", revealAt: "2026-07-26T09:00:00Z" });
  });

  it("refuses to arm a past deadline (and does not call the service)", async () => {
    const service = fakeService();
    const spy = vi.spyOn(service, "arm");
    await expect(
      armReveal({ roomId: "r_1", deadlineIso: "2026-07-26T05:00:00Z" }, { service, now: () => NOW }),
    ).rejects.toThrow(/future/);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("onRevealFired", () => {
  it("triggers evaluation exactly once per schedule", () => {
    let state = initRevealTriggers();

    const first = onRevealFired(state, "0.0.777");
    expect(first.triggered).toBe(true);
    state = first.state;

    const second = onRevealFired(state, "0.0.777");
    expect(second.triggered).toBe(false);
  });

  it("tracks distinct schedules independently", () => {
    const a = onRevealFired(initRevealTriggers(), "0.0.1");
    const b = onRevealFired(a.state, "0.0.2");
    expect(b.triggered).toBe(true);
  });
});

describe("isDeadlineReached", () => {
  it("is false before and true at/after the deadline", () => {
    expect(isDeadlineReached("2026-07-26T09:00:00Z", NOW)).toBe(false);
    expect(isDeadlineReached("2026-07-26T06:00:00Z", NOW)).toBe(true);
    expect(isDeadlineReached("2026-07-26T05:00:00Z", NOW)).toBe(true);
  });

  it("throws on an invalid deadline", () => {
    expect(() => isDeadlineReached("nope", NOW)).toThrow();
  });
});
