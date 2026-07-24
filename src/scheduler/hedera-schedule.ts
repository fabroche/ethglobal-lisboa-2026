import "server-only";
import {
  Client,
  AccountId,
  ScheduleCreateTransaction,
  ScheduleInfoQuery,
  ScheduleId,
  Timestamp,
  type Transaction,
} from "@hashgraph/sdk";
import { env, requireEnv } from "@/config/env";
import { parseOperatorKey } from "@/lib/hedera-key";
import type { ScheduleService } from "./service";

/**
 * The Hedera Schedule Service adapter — the only file here that imports the SDK, isolated so
 * the reveal logic and its tests never pull it. `server-only`: signs with our account (D8).
 *
 * A long-term scheduled transaction with `expirationTime = deadline` and `waitForExpiry(true)`
 * executes at the deadline, so the reveal time is enforced by Hedera, not by us or either party
 * (RNF-M5-001). The transaction that actually fires (the verdict write) is injected once M6/M7
 * exist — this module only owns arming and detecting the clock.
 */
export function hederaScheduleService(buildRevealTx: () => Transaction): ScheduleService {
  const accountId = requireEnv("HEDERA_ACCOUNT_ID");
  const privateKey = requireEnv("HEDERA_PRIVATE_KEY");
  const client = Client.forName(env.HEDERA_NETWORK).setOperator(
    AccountId.fromString(accountId),
    parseOperatorKey(privateKey),
  );

  return {
    async arm({ revealAt }) {
      const submit = await new ScheduleCreateTransaction()
        .setScheduledTransaction(buildRevealTx())
        .setExpirationTime(Timestamp.fromDate(new Date(revealAt)))
        .setWaitForExpiry(true)
        .execute(client);
      const receipt = await submit.getReceipt(client);
      if (!receipt.scheduleId) {
        throw new Error("schedule creation returned no scheduleId");
      }
      return { scheduleId: receipt.scheduleId.toString(), revealAt };
    },

    async status(scheduleId) {
      const info = await new ScheduleInfoQuery()
        .setScheduleId(ScheduleId.fromString(scheduleId))
        .execute(client);
      const executedAt = info.executed;
      return {
        executed: executedAt != null,
        executedAt: executedAt ? executedAt.toDate().toISOString() : undefined,
      };
    },
  };
}
