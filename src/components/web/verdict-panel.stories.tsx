import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { VerdictPanel } from "./verdict-panel";

const meta: Meta<typeof VerdictPanel> = {
  title: "web/VerdictPanel",
  component: VerdictPanel,
  parameters: { layout: "centered" },
};
export default meta;

type Story = StoryObj<typeof VerdictPanel>;

/**
 * Sealed, clock still running. **No spinner on purpose** (S3.19): nothing is executing yet,
 * and a room can sit here for days. The countdown above the panel is the honest indicator.
 */
export const Pending: Story = { args: { verdict: null, deadlineReached: false } };

/**
 * The deadline has passed and the lazy reveal is genuinely running — enclave call,
 * attestation check, topic write, Mirror indexing. This is the only state that spins, and
 * it is the one a judge watches during the demo, so it also states the fail-closed rule
 * while that rule is being exercised.
 */
export const Revealing: Story = { args: { verdict: null, deadlineReached: true } };
export const Workable: Story = { args: { verdict: "workable" } };
export const NotWorkable: Story = { args: { verdict: "not_workable" } };
export const GapSingle: Story = { args: { verdict: "gap:single" } };
export const GapMultiple: Story = { args: { verdict: "gap:multiple" } };

/**
 * S3.20 — the loud one. The attestation failed, so nothing was published: this is the
 * fail-closed guarantee WORKING, and the panel must make that readable as an outcome, not
 * mistakable for a hang. Terminal: polling has stopped, nothing spins.
 */
export const AttestationInvalid: Story = {
  args: { verdict: null, deadlineReached: true, blocked: { blocked: "attestation_invalid" } },
};

/** Terminal: the ciphertext store is per-process and a restart lost the sealed texts. */
export const CannotResolve: Story = {
  args: { verdict: null, deadlineReached: true, blocked: { blocked: "missing_sealed_payload" } },
};

/** Recoverable without us: the other side can still commit late. No spinner — nothing runs. */
export const WaitingForOtherSide: Story = {
  args: { verdict: null, deadlineReached: true, blocked: { blocked: "incomplete_commitments" } },
};

/** Transient: the reveal retries on the next poll, so the spinner stays and the reason is named. */
export const RetryingAfterTransientFailure: Story = {
  args: { verdict: null, deadlineReached: true, blocked: { blocked: "attestation_unavailable" } },
};
