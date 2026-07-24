import { assertFutureDeadline } from "@/session";
import type { ScheduleService, ArmedReveal } from "./service";

/**
 * Reveal orchestration (M5). The deadline clock is a timer **neither party owns** (D6):
 *  - `armReveal` arms the scheduled reveal at room creation, before any commitment
 *    (arm-before-work, RNF-M5-002) — and only for a future deadline.
 *  - `onRevealFired` is an idempotent trigger so evaluation fires **exactly once** (RF-M5-003).
 *  - `isDeadlineReached` is the server-side fallback that still honours the publicly committed
 *    deadline if the scheduled tx never fires (open decision DA5).
 */

export async function armReveal(
  input: { roomId: string; deadlineIso: string },
  deps: { service: ScheduleService; now?: () => Date },
): Promise<ArmedReveal> {
  const now = (deps.now ?? (() => new Date()))();
  // The reveal cannot be armed in the past; the deadline was already validated public by M1.
  assertFutureDeadline(input.deadlineIso, now);
  return deps.service.arm({ roomId: input.roomId, revealAt: input.deadlineIso });
}

/** Tracks which schedules have already triggered evaluation, so the trigger is idempotent. */
export interface RevealTriggerState {
  readonly fired: readonly string[];
}

export function initRevealTriggers(): RevealTriggerState {
  return { fired: [] };
}

/**
 * Register that `scheduleId` fired. Returns `triggered: true` only the first time — the caller
 * runs the evaluation only when `triggered` is true, guaranteeing exactly-once (RF-M5-003).
 */
export function onRevealFired(
  state: RevealTriggerState,
  scheduleId: string,
): { state: RevealTriggerState; triggered: boolean } {
  if (state.fired.includes(scheduleId)) {
    return { state, triggered: false };
  }
  return { state: { fired: [...state.fired, scheduleId] }, triggered: true };
}

/** Fallback: has the publicly committed deadline been reached? (DA5 server-side timer.) */
export function isDeadlineReached(deadlineIso: string, now: Date): boolean {
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) {
    throw new Error(`invalid deadline: ${deadlineIso}`);
  }
  return now.getTime() >= deadline.getTime();
}
