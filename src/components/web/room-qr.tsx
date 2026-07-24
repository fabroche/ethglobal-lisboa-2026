"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface RoomQrProps {
  roomId: string;
  joinUrl: string;
  className?: string;
}

/**
 * M8 `room-qr` (S3.1). Shows a room's join link with one-tap copy. The scannable QR *image*
 * needs a `qrcode` dependency (integrator-owned `package.json`); until it's added this renders
 * the link + copy and a labelled slot for the image. The URL encodes only room id + side — no terms.
 */
export function RoomQr({ roomId, joinUrl, className }: RoomQrProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-semibold tracking-tight">Room ready</h2>
        <p className="text-sm text-muted-foreground">Share this link so the other side can join.</p>
      </div>

      <div
        role="img"
        aria-label={`Join QR placeholder for room ${roomId}`}
        className="flex aspect-square w-40 items-center justify-center rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground"
      >
        QR image pending (add qrcode dep)
      </div>

      <div className="flex w-full items-center gap-2">
        <input
          readOnly
          value={joinUrl}
          aria-label="Room join link"
          className="min-h-11 w-full flex-1 truncate rounded-lg border border-input bg-background px-3 text-sm"
        />
        <button
          type="button"
          onClick={copy}
          className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
