"use client";

import { Check } from "lucide-react";

export type StepStatus = "pending" | "in_progress" | "completed";

interface StepBadgeProps {
  number: number;
  status: StepStatus;
}

export function StepBadge({ number, status }: StepBadgeProps) {
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold font-mono transition-all ${
        status === "completed"
          ? "border-foreground bg-foreground text-background"
          : status === "in_progress"
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-muted/50 text-muted-foreground"
      }`}
    >
      {status === "completed" ? (
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      ) : (
        number
      )}
    </div>
  );
}
