"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={cn("hidden text-sm sm:inline", active ? "font-medium" : "text-muted-foreground")}>{label}</span>
            {i < steps.length - 1 && <span className={cn("h-px w-6", done ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}