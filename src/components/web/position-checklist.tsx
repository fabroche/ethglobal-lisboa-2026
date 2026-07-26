import { cn } from "@/lib/utils";

export interface PositionChecklistProps {
  /** Guidance items from the room's use-case preset (D16). */
  items: string[];
  className?: string;
}

/**
 * M8 `position-checklist` (S3.2, D16/DA8). Soft guidance next to the position field:
 * "consider covering …". Static text only, and NEVER a validation rule — an incomplete
 * position seals just fine. The plaintext is not read by this component at all.
 */
export function PositionChecklist({ items, className }: PositionChecklistProps) {
  return (
    <aside
      aria-label="Suggested points to cover"
      className={cn(
        "rounded-lg border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <p className="mb-1.5 font-medium text-foreground">Consider covering</p>
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span aria-hidden="true" className="text-primary">
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs">
        Guidance only. You can seal whatever you write. Nothing here is required.
      </p>
    </aside>
  );
}
