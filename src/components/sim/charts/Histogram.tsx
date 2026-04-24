"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  counts: number[];
  height?: number;
  fill?: string;
  labelFormatter?: (index: number) => string;
  showExpected?: boolean;
};

export function Histogram({
  counts,
  height = 160,
  fill = "var(--chart-2)",
  labelFormatter,
  showExpected = true,
}: Props) {
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = counts.length > 0 ? total / counts.length : 0;
  const data = counts.map((v, i) => ({
    bucket: labelFormatter ? labelFormatter(i) : String(i),
    value: v,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 9 }}
          stroke="currentColor"
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 10 }} stroke="currentColor" allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "var(--muted)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        {showExpected && expected > 0 && (
          <ReferenceLine
            y={expected}
            stroke="var(--chart-4)"
            strokeDasharray="4 3"
            ifOverflow="extendDomain"
          />
        )}
        <Bar dataKey="value" fill={fill} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
