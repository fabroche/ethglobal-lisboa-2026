"use client";

import { cn } from "@/lib/utils";
import { USE_CASES, USE_CASE_IDS, type UseCaseId } from "@/session";

export interface UseCasePickerProps {
  value: UseCaseId;
  onChange: (id: UseCaseId) => void;
  className?: string;
}

/**
 * M8 `use-case-picker` (S3.5, D16). Three cards, one per preset — picking one sets the
 * side labels and the guidance the write screen shows. Radio-group semantics so it reads
 * correctly to a screen reader; cards stay ≥44px touch targets (mobile-first).
 */
export function UseCasePicker({ value, onChange, className }: UseCasePickerProps) {
  return (
    <fieldset className={cn("flex flex-col gap-1.5", className)}>
      <legend className="text-sm font-medium">Use case</legend>
      <div role="radiogroup" aria-label="Use case" className="flex flex-col gap-2 sm:flex-row">
        {USE_CASE_IDS.map((id) => {
          const preset = USE_CASES[id];
          const selected = id === value;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              className={cn(
                "min-h-11 flex-1 rounded-lg border px-3 py-2.5 text-left transition",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-input bg-background hover:border-muted-foreground/40",
              )}
            >
              <span className="block text-sm font-medium">{preset.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {preset.sideLabels.A} · {preset.sideLabels.B}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
