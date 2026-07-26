import { cn } from "@/lib/utils";

export interface OverlapMarkProps {
  className?: string;
}

/**
 * The Overlap mark (S4.8, DA11): two chevrons — the two sides — converging on a lit
 * common bar, the overlap. Themes through the brand tokens (`--side-a`/`--side-b`/`--seam`),
 * so it works in light and dark. Inline SVG, no external asset. Decorative next to the
 * wordmark, hence aria-hidden — the wordmark carries the name.
 */
export function OverlapMark({ className }: OverlapMarkProps) {
  return (
    <svg
      viewBox="0 0 56 44"
      fill="none"
      aria-hidden="true"
      className={cn("h-5 w-auto", className)}
    >
      <path
        d="M9 8 L23 22 L9 36"
        stroke="var(--side-a)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M47 8 L33 22 L47 36"
        stroke="var(--side-b)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="25" y="13.5" width="6" height="17" rx="3" fill="var(--seam)" />
    </svg>
  );
}
