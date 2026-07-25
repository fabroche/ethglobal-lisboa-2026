"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";
import { ShareButton } from "./share-button";

export interface RoomQrProps {
  roomId: string;
  /** The link to hand to the OTHER side. This is what the QR encodes. */
  joinUrl: string;
  /**
   * The creator's own link (`?side=A`), when there is one.
   *
   * Shown because without it the creator has no way back in — the room is
   * reachable only by URL, and the create screen used to display B's link alone.
   * They could not even return to write their own position (S3.8).
   *
   * NOT a secret, and the UI must not imply otherwise: `buildJoinUrl` is
   * deterministic and public, so anyone holding the room id can construct either
   * side's link. What actually keeps a seat is World Selfie Check — one per side,
   * per room. The `side` parameter is a routing hint, never an authorisation.
   */
  ownUrl?: string;
  /**
   * Role framing (both required together). When present, the layout speaks in roles —
   * "For the Seller — have them scan this" / "You — the Buyer" — instead of positional
   * join/own language. Fixes the live failure where a Buyer-creator used the join link
   * themselves and both humans entered side B.
   */
  theirLabel?: string;
  yourLabel?: string;
  /** Context anchor from the create form (announcement URL or one line). */
  about?: string;
  /** The creator's direct write link (`/room/<id>/write?side=X`) — rendered as the primary CTA. */
  writeUrl?: string;
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

/** One read-only URL with its own copy button and its own feedback state. */
function CopyRow({ url, label }: { url: string; label: string }) {
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
        await navigator.clipboard.writeText(url);
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

  return (
    <>
      <div className="flex w-full items-center gap-2">
        <input
          ref={inputRef}
          readOnly
          value={url}
          aria-label={label}
          onFocus={(event) => event.currentTarget.select()}
          className="min-h-11 w-full flex-1 truncate rounded-lg border border-input bg-background px-3 text-sm"
        />
        {/* The aria-label is STATIC and names the action; the visible text carries
            the state and the live region announces it. A control whose accessible
            NAME changes as you use it is disorienting with a screen reader — the
            thing you just found stops being called what it was called. */}
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          {LABEL[state]}
        </button>
      </div>

      {/* Announced to screen readers, which a button relabelling itself is not. */}
      <p aria-live="polite" className="sr-only">
        {state === "copied" ? `${label} copied to clipboard.` : null}
        {state === "selected" ? `${label} selected. Press Control or Command plus C to copy.` : null}
        {state === "failed" ? `Could not copy ${label}. Select it manually.` : null}
      </p>
    </>
  );
}

export function RoomQr({
  roomId,
  joinUrl,
  ownUrl,
  theirLabel,
  yourLabel,
  about,
  writeUrl,
  className,
}: RoomQrProps) {
  const unreachable = isLoopbackUrl(joinUrl);
  const roleMode = Boolean(theirLabel && yourLabel);

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-6 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-semibold tracking-tight">Room ready</h2>
        {about ? (
          <p className="max-w-full truncate text-xs text-primary" title={about}>
            About:{" "}
            {/^https?:\/\//.test(about) ? (
              <a href={about} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {about}
              </a>
            ) : (
              about
            )}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {roleMode
            ? `For the ${theirLabel}: have them scan this.`
            : "Share this link so the other side can join."}
        </p>
      </div>

      <div
        role="img"
        aria-label={`Join QR for room ${roomId}`}
        className="rounded-lg bg-white p-3"
      >
        <QRCode value={joinUrl} size={160} style={{ height: "auto", width: 160, maxWidth: "100%" }} />
      </div>

      {roleMode ? (
        <p className="text-xs text-muted-foreground">
          The QR and the link below are the same door: the {theirLabel}&apos;s.
        </p>
      ) : null}

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

      <CopyRow url={joinUrl} label="Room join link" />

      {roleMode && theirLabel ? <ShareButton url={joinUrl} roleLabel={theirLabel} /> : null}

      {ownUrl ? (
        <div className="flex w-full flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          {roleMode ? (
            <p className="text-xs font-semibold">You (the {yourLabel})</p>
          ) : null}
          {roleMode && writeUrl ? (
            <Link
              href={writeUrl}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              Write your position
            </Link>
          ) : null}
          <p className="text-xs">
            <span className="font-semibold">Your own link.</span> The room has no accounts and no
            sign-in, so this URL is how you get back to write your position and read the verdict.{" "}
            <span className="font-semibold">Save it now</span> — close this page without it and you
            would need the full address to return.
          </p>
          <CopyRow url={ownUrl} label="Your own link" />
        </div>
      ) : null}

      <Link
        href={`/room/${roomId}/verdict`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        View countdown and verdict →
      </Link>
    </div>
  );
}
