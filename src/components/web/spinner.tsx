import { cn } from "@/lib/utils";

/**
 * M8 `spinner` — the only indeterminate progress indicator in Overlap.
 *
 * Deliberately dumb: it carries no text and is `aria-hidden`. The meaning always lives in
 * the label beside it, inside whatever `role="status"` region owns the state — a screen
 * reader should hear "Revealing the verdict", not "image, loading spinner".
 *
 * **Honours `prefers-reduced-motion`.** For a user who has asked the OS to stop things
 * moving, a permanently rotating element is not a small annoyance: it can trigger
 * vestibular symptoms. `motion-reduce:animate-none` leaves a static ring, which still reads
 * as "something is in progress" next to its label.
 *
 * Use it only where work is ACTUALLY happening. A spinner shown while nothing runs is a
 * lie the user can't check — see `verdict-panel`, where the pre-deadline wait deliberately
 * gets a countdown instead.
 */
export interface SpinnerProps {
  /** `sm` inline with text, `md` (default) beside a heading. */
  size?: "sm" | "md";
  className?: string;
}

const SIZES = {
  sm: "size-4 border-2",
  md: "size-6 border-[3px]",
} as const;

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      data-testid="spinner"
      className={cn(
        "inline-block shrink-0 animate-spin rounded-full motion-reduce:animate-none",
        // The transparent top edge is what makes the rotation visible; with reduced
        // motion it degrades to a ring with a gap, which still reads as "in progress".
        "border-current border-t-transparent opacity-70",
        SIZES[size],
        className,
      )}
    />
  );
}
