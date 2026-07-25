"use client";

import { cn } from "@/lib/utils";
import { buildInviteText } from "@/lib/invite-text";

export interface ShareButtonProps {
  /** The counterpart's join link. */
  url: string;
  /** Their role name, for the labels and the message ("Seller", "Candidate"…). */
  roleLabel: string;
  /** The room's public deadline, woven into the invite text when known. */
  deadlineIso?: string;
  className?: string;
}

/**
 * M8 `share-button` (S3.15). Per-app share links shown as an icon row (team decision:
 * app logos side by side, uniform on every platform, no native share sheet — its
 * ordering is the OS's, not ours). Every app receives the SAME full invite text
 * (`buildInviteText`, mirrors docs/ux/invite-message.md).
 *
 * Icons are inline SVG glyphs (self-contained, no external assets). The message
 * carries role + link + public deadline only. Never the deal type, never any terms.
 */
export function ShareButton({ url, roleLabel, deadlineIso, className }: ShareButtonProps) {
  const text = buildInviteText({ roleLabel, url, ...(deadlineIso ? { deadlineIso } : {}) });
  const encoded = encodeURIComponent(text);

  const apps = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encoded}`,
      bg: "#25D366",
      glyph: (
        // Speech bubble with a handset silhouette.
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
          <path
            d="M12 3a9 9 0 0 0-7.7 13.7L3 21l4.4-1.2A9 9 0 1 0 12 3Z"
            stroke="white"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9 8.5c.3 2.5 3 5.2 5.5 5.5l1-1.4 1.8.9c-.3 1.6-1.5 2.2-3 1.9-2.9-.6-6.1-3.8-6.7-6.7-.3-1.5.3-2.7 1.9-3l.9 1.8L9 8.5Z"
            fill="white"
          />
        </svg>
      ),
    },
    {
      name: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encoded}`,
      bg: "#229ED9",
      glyph: (
        // Paper plane.
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
          <path d="M21 4 3 11.5l5.5 2L10 19l3-3.5 4.5 3L21 4Z" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M8.5 13.5 17 7l-7 7.5" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodeURIComponent("Overlap room invite")}&body=${encoded}`,
      bg: "#64748B",
      glyph: (
        // Envelope.
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
          <rect x="3" y="5.5" width="18" height="13" rx="2" stroke="white" strokeWidth="1.8" />
          <path d="m4 7 8 6 8-6" stroke="white" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <p className="text-xs font-medium text-muted-foreground">
        Send the invite to the {roleLabel}:
      </p>
      <div className="flex items-start justify-center gap-6">
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Share via ${app.name}`}
            className="flex flex-col items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-1"
          >
            <span
              className="flex size-11 items-center justify-center rounded-xl"
              style={{ backgroundColor: app.bg }}
            >
              {app.glyph}
            </span>
            <span className="text-xs text-muted-foreground">{app.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
