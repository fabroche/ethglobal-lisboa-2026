"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Is this URL reachable from another device?
 *
 * A QR pointing at `localhost` is worse than useless: a phone resolves `localhost`
 * to ITSELF, so it looks like a broken app rather than a misconfiguration. And this
 * is the default in `.env.local`, which means the failure surfaces exactly when
 * someone points a phone at the screen — during a demo. Cheap to detect, so we do.
 */
export function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
  } catch {
    return false;
  }
}

/**
 * `idle` → `copied` when the Clipboard API worked.
 * `selected` when it was unavailable and we selected the text instead — the
 * fallback that always works, since the user can then press Ctrl/⌘+C.
 * `failed` only when even that was impossible, and it is SHOWN rather than swallowed.
 */
type CopyState = "idle" | "copied" | "selected" | "failed";

const RESET_AFTER_MS = 2000;

const LABEL: Record<CopyState, string> = {
  idle: "Copy",
  copied: "Copied",
  selected: "Press Ctrl+C",
  failed: "Copy failed",
};

export function RoomQr({ roomId, joinUrl, className }: RoomQrProps) {
  const [state, setState] = useState<CopyState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset so the feedback is REPEATABLE. Without this the button reads "Copied"
  // forever and a second copy gives no signal that anything happened.
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), RESET_AFTER_MS);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    // `navigator.clipboard` exists ONLY in a secure context: HTTPS or localhost.
    // Serve over a LAN IP so a phone can scan the QR — which is the whole point of
    // the QR — and it is `undefined`. Optional-chained rather than try/caught,
    // because "the API is missing" is a different situation from "the write failed"
    // and only the first one has a useful fallback.
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(joinUrl);
        setState("copied");
        return;
      } catch {
        // Permission denied, or the document lost focus. Fall through: selecting
        // the text still lets the user copy it by hand.
      }
    }

    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
      setState("selected");
      return;
    }

    // Nothing left to try. Say so — a silent no-op reads as a broken button.
    setState("failed");
  }

  const unreachable = isLoopbackUrl(joinUrl);

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

      {unreachable ? (
        <p
          role="status"
          className="w-full rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
        >
          <span className="font-semibold">This QR points at localhost.</span> A phone that scans it
          will look for the app on itself and find nothing. Set <code>APP_URL</code> to this machine&apos;s
          LAN address (e.g. <code>http://10.0.0.5:3000</code>) and restart the dev server.
        </p>
      ) : null}

      <div className="flex w-full items-center gap-2">
        <input
          ref={inputRef}
          readOnly
          value={joinUrl}
          aria-label="Room join link"
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full flex-1 truncate rounded-lg border border-input bg-background px-3 text-sm"
        />
        {/* No aria-label: the visible text already names the action, and the
            live region below announces the outcome. An aria-label here would also
            shadow the input's, since both would contain "join link". */}
        <button
          type="button"
          onClick={copy}
          className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {LABEL[state]}
        </button>
      </div>

      {/* Announced to screen readers, which the button's own text change is not. */}
      <p aria-live="polite" className="sr-only">
        {state === "copied" ? "Link copied to clipboard." : null}
        {state === "selected" ? "Link selected. Press Control or Command plus C to copy." : null}
        {state === "failed" ? "Could not copy the link. Select it manually." : null}
      </p>

      <Link
        href={`/room/${roomId}/verdict`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        View countdown and verdict →
      </Link>
    </div>
  );
}
