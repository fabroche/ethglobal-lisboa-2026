"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { seal, type SealedPayload } from "@/seal";
import type { Side, UseCasePreset } from "@/session";
import type { WorldProof } from "@/worldid";
import { PositionChecklist } from "./position-checklist";
import { SelfieCheckGate } from "./selfie-check-gate";

export interface SubmitCommitmentInput {
  roomId: string;
  side: Side;
  sealedPayload: SealedPayload;
  commitment: string;
  worldProof: WorldProof;
  gapOptIn: boolean;
}

export interface SealPositionFormProps {
  roomId: string;
  side: Side;
  /** The room's use-case preset (D16) — placeholder, checklist, side labels. */
  preset: UseCasePreset;
  /** `OG_ENCLAVE_SEAL_PUBKEY`; `null` renders the sealing step config-gated. */
  enclaveSealKey: string | null;
  /** `WORLD_APP_ID`; `null` gates the Selfie Check. */
  worldAppId: string | null;
  /** Server Action (M3 claimSeat + M4 publishCommitment). Injected for tests/stories.
   * Typed result — thrown errors get digest-masked by Next in production. */
  submitCommitment: (
    input: SubmitCommitmentInput,
  ) => Promise<{ ok: true; sequenceNumber: number } | { ok: false; message: string }>;
  className?: string;
}

/**
 * M8 `seal-position-form` (S3.2). Write a free-form position (preset placeholder + soft
 * checklist, D16 — the checklist NEVER blocks sealing), run Selfie Check (one seat per side),
 * choose this side's gap consent (D9 as amended), then seal in-browser and submit only
 * `{ ciphertext, sha256, proof, consent }`. The plaintext never leaves this component's state.
 */
export function SealPositionForm({
  roomId,
  side,
  preset,
  enclaveSealKey,
  worldAppId,
  submitCommitment,
  className,
}: SealPositionFormProps) {
  const [position, setPosition] = useState("");
  const [gapOptIn, setGapOptIn] = useState(false);
  const [proof, setProof] = useState<WorldProof | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [committed, setCommitted] = useState<{ commitment: string } | null>(null);

  const sealReady = enclaveSealKey != null;
  const canSubmit = sealReady && proof != null && !pending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (position.trim().length === 0) {
      setError("Write your position first — it can be a single sentence.");
      return;
    }
    if (!enclaveSealKey) {
      setError("Sealing isn’t configured yet (enclave key missing).");
      return;
    }
    if (!proof) {
      setError("Run the Selfie Check first — it’s what enforces one seat per side.");
      return;
    }

    setPending(true);
    try {
      const { sealedPayload, commitment } = await seal(position, enclaveSealKey);
      const result = await submitCommitment({
        roomId,
        side,
        sealedPayload,
        commitment,
        worldProof: proof,
        gapOptIn,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCommitted({ commitment });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not seal and submit.");
    } finally {
      setPending(false);
    }
  }

  if (committed) {
    return (
      <div
        role="status"
        className={cn(
          "flex w-full max-w-md flex-col gap-3 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
          className,
        )}
      >
        <p className="text-lg font-semibold tracking-tight text-primary">Sealed and committed</p>
        <p className="text-sm text-muted-foreground">
          Only the fingerprint of your sealed position is public. Your words never left this
          browser unencrypted.
        </p>
        <p className="truncate font-mono text-xs text-muted-foreground" title={committed.commitment}>
          sha256 · {committed.commitment}
        </p>
        <a
          href={`/room/${roomId}/verdict`}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          Go to the countdown
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      aria-label={`Write and seal your position as ${preset.sideLabels[side]}`}
      className={cn(
        "flex w-full max-w-md flex-col gap-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold tracking-tight">
          Your position — {preset.sideLabels[side]}
        </h2>
        <p className="text-sm text-muted-foreground">
          Plain language. It’s sealed <span className="serif-accent">in this browser</span> to the
          enclave key — the other side and the operator never see it.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Position
        {/* S3.7 (P0): the BROWSER can leak this field — form history saves it to disk
            keyed by `name` (and suggests it to the next person on the machine), and
            Chrome's Enhanced spell check / Edge's Microsoft Editor SEND the text to
            Google/Microsoft. Every attribute below closes one of those doors; the
            field deliberately has no `name` so nothing keys a history entry. */}
        <textarea
          rows={5}
          value={position}
          placeholder={preset.placeholder}
          onChange={(event) => setPosition(event.target.value)}
          aria-invalid={error != null}
          aria-label="Position"
          autoComplete="off"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          data-1p-ignore
          data-lpignore="true"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-xs font-normal text-muted-foreground">
          Spellcheck is off on purpose — your text never leaves this browser.
        </span>
      </label>

      <PositionChecklist items={preset.checklist} />

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={gapOptIn}
          onChange={(event) => setGapOptIn(event.target.checked)}
          className="mt-0.5 size-4 accent-primary focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-muted-foreground">
          If there’s no deal, allow revealing whether one issue or several block it — never which.
          Both sides must opt in.
        </span>
      </label>

      <SelfieCheckGate
        roomId={roomId}
        side={side}
        appId={worldAppId}
        verified={proof != null}
        onVerified={setProof}
      />

      {!sealReady ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Sealing isn’t configured yet (<code className="font-mono">OG_ENCLAVE_SEAL_PUBKEY</code>).
          You can draft your position; sealing unlocks the moment the enclave key lands.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "min-h-11 rounded-full bg-primary px-6 font-medium text-primary-foreground transition",
          "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        )}
      >
        {pending ? "Sealing…" : "Seal and commit"}
      </button>
    </form>
  );
}
