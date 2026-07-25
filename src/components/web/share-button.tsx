"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ShareButtonProps {
  /** The counterpart's join link. */
  url: string;
  /** Their role name, for the button label and the message ("Seller", "Candidate"…). */
  roleLabel: string;
  className?: string;
}

/**
 * M8 `share-button` (S3.15). On phones, opens the OS's native share sheet via the
 * Web Share API (WhatsApp, Telegram, Mail, AirDrop — whatever is installed). Where
 * the API is missing (most desktops), a small menu of direct share links appears
 * instead. Requires a secure context, which the HTTPS tunnel provides.
 *
 * The prefilled message carries the room link and the invited ROLE only. Never the
 * deal type, never any terms (the same rule as the QR).
 */
export function ShareButton({ url, roleLabel, className }: ShareButtonProps) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Feature-detect after mount: `navigator` does not exist during SSR.
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const text = `Join our Overlap room as the ${roleLabel}: ${url}`;

  async function nativeShare() {
    try {
      await navigator.share({ title: "Overlap room", text, url });
    } catch {
      // The user closed the sheet. Not an error, nothing to say.
    }
  }

  if (canNativeShare) {
    return (
      <button
        type="button"
        onClick={nativeShare}
        className={cn(
          "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        Send to the {roleLabel}…
      </button>
    );
  }

  const encoded = encodeURIComponent(text);
  const fallbackLinks = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encoded}` },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(
        `Join our Overlap room as the ${roleLabel}`,
      )}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent("Overlap room invite")}&body=${encoded}`,
    },
  ];

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <button
        type="button"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Send to the {roleLabel}…
      </button>
      {menuOpen ? (
        <div className="flex flex-col overflow-hidden rounded-lg border border-input">
          {fallbackLinks.map((link) => (
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
