"use client";

import { HEATMAP_COLS, HEATMAP_ROWS } from "@/components/sim/engine";

type Props = {
  values: number[];
  cols?: number;
  rows?: number;
};

export function Heatmap({ values, cols = HEATMAP_COLS, rows = HEATMAP_ROWS }: Props) {
  const max = values.reduce((m, v) => (v > m ? v : m), 0) || 1;

  return (
    <div
      className="grid gap-px overflow-hidden rounded-md border bg-border"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        aspectRatio: `${cols} / ${rows}`,
      }}
      aria-label="Position density heatmap"
    >
      {values.map((v, i) => {
        const intensity = Math.pow(v / max, 0.6);
        return (
          <div
            key={i}
            style={{
              background: `color-mix(in oklch, var(--chart-1) ${Math.round(intensity * 100)}%, transparent)`,
            }}
          />
        );
      })}
    </div>
  );
}
