"use client";

import { useEffect, useState } from "react";
import { createLocalBookmarkStore } from "@/lib/room-bookmarks-local";
import type { BookmarkLabel } from "@/lib/room-bookmarks";
import type { Side } from "@/session";
import { RememberRoom } from "./remember-room";
import { RoomQr } from "./room-qr";

export interface ShareViewProps {
  roomId: string;
  /** Side A's join URL (absolute). */
  urlA: string;
  /** Side B's join URL (absolute). */
  urlB: string;
  /** Preset side labels when the deal type is known (topic or query). */
  labels?: { A: string; B: string };
  about?: string;
  /** The room's public deadline, forwarded into the invite text. */
  deadlineIso?: string;
  /** The creator's declared side from the create redirect — highest-priority source. */
  queryMe?: Side;
  /** Deal type for the bookmark label (creator's redirect only). */
  bookmarkLabel?: BookmarkLabel;
}

/**
 * Resolves WHICH side the viewer is before rendering the share screen.
 *
 * Root cause this fixes (live testing): the declared side only rode the creator's
 * redirect query, so "← Back to QR" (a bare `/share` link) lost it and the screen
 * fell back to "creator = A" — the old wrong view. The durable sources are:
 *   1. the redirect query (`me`) right after creation — also (re)saves the bookmark;
 *   2. the device's room bookmark (S3.9) on every later visit;
 *   3. only then the "A" default — same behaviour as a stranger opening the link.
 * Resolution is local and fast; nothing renders until it's done to avoid flashing
 * the wrong role.
 */
export function ShareView({
  roomId,
  urlA,
  urlB,
  labels,
  about,
  deadlineIso,
  queryMe,
  bookmarkLabel,
}: ShareViewProps) {
  const [mySide, setMySide] = useState<Side | null>(queryMe ?? null);

  useEffect(() => {
    if (queryMe) return; // declared side wins; RememberRoom below persists it
    let cancelled = false;
    void createLocalBookmarkStore()
      .list()
      .then((bookmarks) => {
        if (cancelled) return;
        setMySide(bookmarks.find((b) => b.roomId === roomId)?.side ?? "A");
      })
      .catch(() => {
        if (!cancelled) setMySide("A");
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, queryMe]);

  if (!mySide) return null;

  const otherSide: Side = mySide === "A" ? "B" : "A";
  const myUrl = mySide === "A" ? urlA : urlB;
  const theirUrl = mySide === "A" ? urlB : urlA;

  return (
    <>
      {/* Save only when the side was DECLARED (creator redirect). Saving the resolved
          side again would overwrite a good bookmark with the "A" default on the one
          visit where resolution failed. */}
      {queryMe ? (
        <RememberRoom
          roomId={roomId}
          side={queryMe}
          {...(bookmarkLabel ? { label: bookmarkLabel } : {})}
        />
      ) : null}
      <RoomQr
        roomId={roomId}
        joinUrl={theirUrl}
        ownUrl={myUrl}
        {...(labels ? { theirLabel: labels[otherSide], yourLabel: labels[mySide] } : {})}
        {...(about ? { about } : {})}
        {...(deadlineIso ? { deadlineIso } : {})}
        writeUrl={`/room/${roomId}/write?side=${mySide}`}
      />
    </>
  );
}
