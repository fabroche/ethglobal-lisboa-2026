/**
 * The Schedule Service boundary (M5). `reveal.ts` depends only on this narrow port, so the
 * arm/fire logic is unit-testable with a fake and the Hedera SDK stays confined to
 * `hedera-schedule.ts`.
 */

export interface ArmedReveal {
  scheduleId: string;
  /** ISO-8601 instant the reveal is set to fire — the publicly committed deadline. */
  revealAt: string;
}

export interface ScheduleService {
  /** Arm a scheduled reveal to fire at `revealAt`. Returns the created schedule id. */
  arm(input: { roomId: string; revealAt: string }): Promise<ArmedReveal>;
  /** Has the scheduled reveal executed yet? */
  status(scheduleId: string): Promise<{ executed: boolean; executedAt?: string }>;
}
