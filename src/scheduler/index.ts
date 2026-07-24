/**
 * M5 · `scheduler` — the deadline clock, a timer neither party owns (D6). Arm the Hedera
 * scheduled reveal at room creation, then detect when it fires and trigger evaluation exactly
 * once. See `docs/modules/M5-scheduler.md`.
 */
export {
  armReveal,
  onRevealFired,
  initRevealTriggers,
  isDeadlineReached,
  type RevealTriggerState,
} from "./reveal";
export { type ScheduleService, type ArmedReveal } from "./service";
export { hederaScheduleService } from "./hedera-schedule";
