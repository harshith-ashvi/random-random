"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ScoreTile = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn" | "good";
};

export function Scorecard({ tiles }: { tiles: ScoreTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={cn(
            "rounded-md border p-2",
            t.tone === "warn" && "border-[color:var(--chart-4)]/60",
            t.tone === "good" && "border-[color:var(--chart-3)]/60",
          )}
        >
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {t.label}
            {t.hint && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex text-muted-foreground/70 hover:text-foreground"
                    aria-label={`${t.label} explainer`}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[240px] text-xs leading-relaxed">
                  {t.hint}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="mt-0.5 text-base font-medium tabular-nums text-foreground">
            {t.value}
          </div>
        </div>
      ))}
    </div>
  );
}
