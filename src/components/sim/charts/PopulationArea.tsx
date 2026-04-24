"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PopulationSample } from "@/lib/supabase/types";

type Props = {
  series: PopulationSample[];
  height?: number;
};

export function PopulationArea({ series, height = 180 }: Props) {
  const data = series.map((s) => ({
    t: Math.round(s.t / 100) / 10,
    rock: s.rock,
    paper: s.paper,
    scissors: s.scissors,
  }));

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border text-xs text-muted-foreground"
        style={{ height }}
      >
        Waiting for data…
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10 }}
          stroke="currentColor"
          tickFormatter={(v) => `${v}s`}
        />
        <YAxis tick={{ fontSize: 10 }} stroke="currentColor" allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelFormatter={(v) => `t = ${v}s`}
        />
        <Area
          type="monotone"
          dataKey="rock"
          stackId="1"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.7}
        />
        <Area
          type="monotone"
          dataKey="paper"
          stackId="1"
          stroke="var(--chart-2)"
          fill="var(--chart-2)"
          fillOpacity={0.7}
        />
        <Area
          type="monotone"
          dataKey="scissors"
          stackId="1"
          stroke="var(--chart-3)"
          fill="var(--chart-3)"
          fillOpacity={0.7}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
