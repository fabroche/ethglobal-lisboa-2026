"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { buildInviteText } from "@/lib/invite-text";

export interface ShareButtonProps {
  /** The counterpart's join link. */
  url: string;
  /** Their role name, for the button label and the message ("Seller", "Candidate"…). */
  roleLabel: string;
  /** The room's public deadline, woven into the invite text when known. */
  deadlineIso?: string;
  className?: string;
}

/**
 * M8 `share-button` (S3.15). Per-app share links only, by team decision: one uniform
 * mechanism on every platform (each app's official share URL), no native share sheet.
 * The OS sheet was rejected because its contents and ordering are the OS's, not ours
 * (AirDrop first on iOS, uncontrollable).
 *
 * The message is the invite copy from `buildInviteText`: role + link + public deadline
 * only. Never the deal type, never any terms (the same rule as the QR).
 */
export function ShareButton({ url, roleLabel, deadlineIso, className }: ShareButtonProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const text = buildInviteText({ roleLabel, url, ...(deadlineIso ? { deadlineIso } : {}) });
  const encodedText = encodeURIComponent(text);

  const moreLinks = [
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
        `Join our Overlap room as the ${roleLabel}`,
      )}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Overlap room invite")}&body=${encodedText}`,
    },
  ];

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <a
        href={`https://wa.me/?text=${encodedText}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Send via WhatsApp to the {roleLabel}
      </a>

      <button
        type="button"
        aria-expanded={moreOpen}
        onClick={() => setMoreOpen((open) => !open)}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-input px-6 text-sm font-medium transition hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      >
        More options…
      </button>
      {moreOpen ? (
        <div className="flex flex-col overflow-hidden rounded-lg border border-input">
          {moreLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 border-b border-input px-4 py-2.5 text-sm last:border-b-0 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
