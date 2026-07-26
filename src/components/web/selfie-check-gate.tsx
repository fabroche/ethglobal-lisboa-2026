"use client";

import { IDKitWidget, VerificationLevel, type ISuccessResult } from "idkit2";
import { cn } from "@/lib/utils";
import type { Side } from "@/session";
import { roomActionId, worldProofSchema, type WorldProof } from "@/worldid";

export interface SelfieCheckGateProps {
  roomId: string;
  side: Side;
  /** `WORLD_APP_ID` — public identifier; `null` renders the config-gated state. */
  appId: string | null;
  /** Called with the widget's proof; server-side verification happens on submit (M3). */
  onVerified: (proof: WorldProof) => void;
  /** Set once this side already holds the seat (proof captured). */
  verified: boolean;
  /** E2E ONLY: server-passed runtime flag (env.E2E_FAKE_WORLD) — swaps the widget for a
   * fixture-proof button. Never set by the demo/prod server. */
  e2eBypass?: boolean;
  className?: string;
}

/**
 * M8 `selfie-check-gate` (S3.2 / M3). Mounts the World Selfie Check widget with the action
 * scoped **per room per side** (`overlap-<roomId>-<side>`, RF-M3-001) — one seat per side. The
 * widget only yields a proof; the fail-closed verification runs server-side in `claimSeat`.
 */
export function SelfieCheckGate({
  roomId,
  side,
  appId,
  onVerified,
  verified,
  e2eBypass,
  className,
}: SelfieCheckGateProps) {
  if (!appId) {
    return (
      <p className={cn("rounded-lg bg-muted p-3 text-sm text-muted-foreground", className)}>
        World Selfie Check isn’t configured yet (<code className="font-mono">WORLD_APP_ID</code>).
        One seat per side can’t be enforced until it is.
      </p>
    );
  }

  // E2E ONLY (S3.4): a headless browser cannot drive the real World App, so when the
  // server (which reads env at request time) passes `e2eBypass`, the gate is a plain
  // button yielding a fixture proof. Runtime-gated, so one build serves demo AND E2E;
  // the demo server never sets E2E_FAKE_WORLD. Never enable in a real deploy.
  if (e2eBypass) {
    return (
      <button
        type="button"
        onClick={() =>
          onVerified(
            worldProofSchema.parse({
              merkle_root: "0xe2e",
              nullifier_hash: `0xe2e-${roomId}-${side}`,
              proof: "0xe2e",
              verification_level: "device",
            }),
          )
        }
        disabled={verified}
        className={cn(
          "min-h-11 rounded-full border border-input px-6 text-sm font-medium",
          className,
        )}
      >
        {verified ? "Verified (E2E)" : "Verify (E2E fixture)"}
      </button>
    );
  }

  if (verified) {
    return (
      <p
        role="status"
        className={cn("rounded-lg bg-muted p-3 text-sm", className)}
      >
        <span className="font-medium text-primary">Selfie Check passed</span> — your seat for side{" "}
        {side} is reserved when you seal.
      </p>
    );
  }

  return (
    <IDKitWidget
      app_id={appId as `app_${string}`}
      action={roomActionId(roomId, side)}
      verification_level={VerificationLevel.Device}
      onSuccess={(result: ISuccessResult) => {
        onVerified(worldProofSchema.parse(result));
      }}
    >
      {({ open }) => (
        <button
          type="button"
          onClick={open}
          className={cn(
            "min-h-11 rounded-full border border-input px-6 text-sm font-medium transition",
            "hover:border-primary focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          Run Selfie Check (one seat per side)
        </button>
      )}
    </IDKitWidget>
  );
}
