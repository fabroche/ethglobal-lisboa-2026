"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";

export interface RoomQrProps {
  roomId: string;
  joinUrl: string;
  className?: string;
}

/**
 * M8 `room-qr` (S3.1). Shows a room's scannable join QR (via `react-qr-code`, a self-contained
 * SVG — no external calls) plus the link with one-tap copy. The URL encodes only room id + side,
 * never any terms. The QR sits on a fixed white plate so it stays scannable in dark mode.
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
        aria-label={`Join QR for room ${roomId}`}
        className="rounded-lg bg-white p-3"
      >
        <QRCode value={joinUrl} size={160} style={{ height: "auto", width: 160, maxWidth: "100%" }} />
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

      <Link
        href={`/room/${roomId}/verdict`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        View countdown and verdict →
      </Link>
    </div>
  );
}
