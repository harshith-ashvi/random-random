"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getClientId } from "@/lib/client-id";
import { fetchHistory, type SimulationListRow } from "@/lib/api/client";
import type { PrngKind, Winner } from "@/lib/supabase/types";
import { Scorecard, type ScoreTile } from "@/components/sim/charts/Scorecard";

const PRNGS: PrngKind[] = ["math-random", "crypto-random", "mulberry32"];
const WINNERS: Winner[] = ["rock", "paper", "scissors", "timeout"];

const WINNER_EMOJI: Record<Winner, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
  timeout: "⏱️",
};

const WINNER_INDEX: Record<Winner, number> = {
  rock: 0,
  paper: 1,
  scissors: 2,
  timeout: 3,
};

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

const WINNER_COLOR: Record<Winner, string> = {
  rock: "var(--chart-1)",
  paper: "var(--chart-2)",
  scissors: "var(--chart-3)",
  timeout: "var(--chart-5)",
};

const PRNG_COLOR: Record<PrngKind, string> = {
  "math-random": "var(--chart-1)",
  "crypto-random": "var(--chart-2)",
  mulberry32: "var(--chart-3)",
};

type Summary = {
  total: number;
  timeoutRate: number;
  avgDurationMs: number;
  avgDraws: number;
  avgEntropy: number | null;
  winnerTotals: Array<{ winner: Winner; count: number }>;
  winnerByPrng: Array<{ prng: PrngKind; rock: number; paper: number; scissors: number; timeout: number }>;
  medianByPrng: Array<{ prng: PrngKind; median: number; runs: number }>;
  chiPValueHist: number[];
  entropySeries: Array<{ index: number; prng: PrngKind; entropy: number }>;
  durationBuckets: Array<{ range: string; count: number; lo: number; hi: number }>;
  winnerByDuration: Array<{ winner: Winner; durationSec: number; durationMs: number }>;
  fastestWin: { winner: Winner; durationMs: number } | null;
  slowestWin: { winner: Winner; durationMs: number } | null;
  predictionHitRate: { correct: number; predicted: number } | null;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function computeSummary(rows: SimulationListRow[]): Summary {
  const total = rows.length;
  const timeouts = rows.filter((r) => r.winner === "timeout").length;
  const avgDurationMs = total > 0 ? rows.reduce((s, r) => s + r.duration_ms, 0) / total : 0;
  const drawsRows = rows.filter((r) => r.draws_total != null);
  const avgDraws =
    drawsRows.length > 0
      ? drawsRows.reduce((s, r) => s + (r.draws_total ?? 0), 0) / drawsRows.length
      : 0;
  const entropyRows = rows.filter((r) => r.direction_entropy_bits != null);
  const avgEntropy =
    entropyRows.length > 0
      ? entropyRows.reduce((s, r) => s + (r.direction_entropy_bits ?? 0), 0) /
        entropyRows.length
      : null;

  const winnerTotals = WINNERS.map((w) => ({
    winner: w,
    count: rows.filter((r) => r.winner === w).length,
  }));

  const winnerByPrng = PRNGS.map((p) => {
    const row = { prng: p, rock: 0, paper: 0, scissors: 0, timeout: 0 };
    for (const r of rows) {
      if (r.prng !== p) continue;
      row[r.winner]++;
    }
    return row;
  });

  const medianByPrng = PRNGS.map((p) => {
    const durations = rows.filter((r) => r.prng === p).map((r) => r.duration_ms);
    return { prng: p, median: median(durations), runs: durations.length };
  });

  const chiPValueHist = new Array(10).fill(0);
  for (const r of rows) {
    if (r.chi_square_p == null) continue;
    const idx = Math.min(9, Math.max(0, Math.floor(r.chi_square_p * 10)));
    chiPValueHist[idx]++;
  }

  const ordered = [...rows].reverse();
  const entropySeries = ordered
    .map((r, i) =>
      r.direction_entropy_bits == null
        ? null
        : { index: i + 1, prng: r.prng, entropy: r.direction_entropy_bits },
    )
    .filter((v): v is { index: number; prng: PrngKind; entropy: number } => v !== null);

  const decided = rows.filter((r) => r.winner !== "timeout");
  const durations = decided.map((r) => r.duration_ms);
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const bucketCount = 8;
  const step = maxDuration > 0 ? maxDuration / bucketCount : 1;
  const durationBuckets = new Array(bucketCount).fill(0).map((_, i) => {
    const lo = step * i;
    const hi = step * (i + 1);
    return {
      range: `${(lo / 1000).toFixed(1)}–${(hi / 1000).toFixed(1)}s`,
      count: 0,
      lo,
      hi,
    };
  });
  for (const d of durations) {
    const idx = Math.min(bucketCount - 1, Math.floor(d / step));
    durationBuckets[idx]!.count++;
  }

  const winnerByDuration = decided.map((r) => ({
    winner: r.winner,
    durationMs: r.duration_ms,
    durationSec: r.duration_ms / 1000,
  }));

  const fastestWin =
    decided.length > 0
      ? decided.reduce((a, b) => (a.duration_ms <= b.duration_ms ? a : b))
      : null;
  const slowestWin =
    decided.length > 0
      ? decided.reduce((a, b) => (a.duration_ms >= b.duration_ms ? a : b))
      : null;

  const predicted = rows.filter((r) => r.predicted_winner != null);
  const correct = predicted.filter((r) => r.predicted_winner === r.winner).length;
  const predictionHitRate = predicted.length > 0 ? { correct, predicted: predicted.length } : null;

  return {
    total,
    timeoutRate: total > 0 ? timeouts / total : 0,
    avgDurationMs,
    avgDraws,
    avgEntropy,
    winnerTotals,
    winnerByPrng,
    medianByPrng,
    chiPValueHist,
    entropySeries,
    durationBuckets,
    winnerByDuration,
    fastestWin: fastestWin
      ? { winner: fastestWin.winner, durationMs: fastestWin.duration_ms }
      : null,
    slowestWin: slowestWin
      ? { winner: slowestWin.winner, durationMs: slowestWin.duration_ms }
      : null,
    predictionHitRate,
  };
}

export function AggregateTab() {
  const [rows, setRows] = useState<SimulationListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const clientId = getClientId();
    if (!clientId) return;
    setError(null);
    try {
      const data = await fetchHistory(clientId, 1000);
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    }
  }, []);

  useEffect(() => {
    load();
    const onSaved = () => load();
    window.addEventListener("rr:run-saved", onSaved);
    return () => window.removeEventListener("rr:run-saved", onSaved);
  }, [load]);

  const summary = useMemo(() => (rows ? computeSummary(rows) : null), [rows]);

  if (error) {
    return (
      <div className="py-10 text-center text-sm text-destructive">
        {error}
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!rows || !summary) {
    return (
      <div className="space-y-2 py-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No saved runs yet. Complete a run and it&apos;ll show up here.
      </div>
    );
  }

  const tiles: ScoreTile[] = [
    { label: "Total runs", value: summary.total.toLocaleString() },
    {
      label: "Timeout rate",
      value: `${(summary.timeoutRate * 100).toFixed(1)}%`,
      tone: summary.timeoutRate > 0.2 ? "warn" : "default",
      hint: "Share of runs that hit the 15-minute safety cap without converging.",
    },
    {
      label: "Avg duration",
      value: `${(summary.avgDurationMs / 1000).toFixed(1)}s`,
    },
    {
      label: "Fastest win",
      value: summary.fastestWin
        ? `${WINNER_EMOJI[summary.fastestWin.winner]} ${fmtDuration(summary.fastestWin.durationMs)}`
        : "—",
      hint: "Shortest decided run on record.",
    },
    {
      label: "Slowest win",
      value: summary.slowestWin
        ? `${WINNER_EMOJI[summary.slowestWin.winner]} ${fmtDuration(summary.slowestWin.durationMs)}`
        : "—",
      hint: "Longest decided run on record (ignores timeouts).",
    },
    {
      label: "Prediction hit-rate",
      value:
        summary.predictionHitRate == null
          ? "—"
          : `${((summary.predictionHitRate.correct / summary.predictionHitRate.predicted) * 100).toFixed(0)}% (${summary.predictionHitRate.correct}/${summary.predictionHitRate.predicted})`,
      hint: "How often your pre-run guess matched the actual winner.",
    },
    {
      label: "Avg draws / run",
      value: Math.round(summary.avgDraws).toLocaleString(),
      hint: "Mean number of random numbers pulled per run.",
    },
    {
      label: "Avg dir entropy",
      value:
        summary.avgEntropy == null
          ? "—"
          : `${summary.avgEntropy.toFixed(3)} bits`,
      hint: "Average Shannon entropy across all runs. 4.000 is perfect over 16 angular buckets.",
    },
  ];

  const winnerByPrngData = summary.winnerByPrng.map((r) => ({
    prng: r.prng,
    rock: r.rock,
    paper: r.paper,
    scissors: r.scissors,
    timeout: r.timeout,
  }));

  const medianByPrngData = summary.medianByPrng.map((r) => ({
    prng: r.prng,
    median: r.median / 1000,
    runs: r.runs,
  }));

  const chiData = summary.chiPValueHist.map((v, i) => ({
    bucket: `${(i / 10).toFixed(1)}–${((i + 1) / 10).toFixed(1)}`,
    count: v,
  }));

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Aggregated from {summary.total.toLocaleString()} saved run
          {summary.total === 1 ? "" : "s"}
        </div>
        <Button size="sm" variant="ghost" onClick={load}>
          <RefreshCw className="mr-1 h-3 w-3" /> Refresh
        </Button>
      </div>

      <Scorecard tiles={tiles} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Overall winner share</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={summary.winnerTotals.filter((w) => w.count > 0)}
                  dataKey="count"
                  nameKey="winner"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  isAnimationActive={false}
                  label={(props) => {
                    const w = (props as { winner?: Winner }).winner;
                    const c = (props as { count?: number }).count;
                    return w && c != null ? `${WINNER_EMOJI[w]} ${c}` : "";
                  }}
                  labelLine={false}
                >
                  {summary.winnerTotals
                    .filter((w) => w.count > 0)
                    .map((w) => (
                      <Cell key={w.winner} fill={WINNER_COLOR[w.winner]} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">
              Convergence-time distribution (decided runs)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={summary.durationBuckets}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                  vertical={false}
                />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 9 }}
                  stroke="currentColor"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">
              Winner vs. duration (each dot is one run)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  type="number"
                  dataKey="durationSec"
                  name="Duration"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  unit="s"
                />
                <YAxis
                  type="number"
                  dataKey={(d: { winner: Winner }) => WINNER_INDEX[d.winner]}
                  name="Winner"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  domain={[-0.5, 2.5]}
                  ticks={[0, 1, 2]}
                  tickFormatter={(v: number) => {
                    const w = (Object.keys(WINNER_INDEX) as Winner[]).find(
                      (k) => WINNER_INDEX[k] === v,
                    );
                    return w ? WINNER_EMOJI[w] : "";
                  }}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v, name) => {
                    if (name === "Duration") return `${Number(v).toFixed(2)}s`;
                    if (name === "Winner") {
                      const w = (Object.keys(WINNER_INDEX) as Winner[]).find(
                        (k) => WINNER_INDEX[k] === Number(v),
                      );
                      return w ?? String(v);
                    }
                    return String(v);
                  }}
                />
                <Scatter data={summary.winnerByDuration} isAnimationActive={false}>
                  {summary.winnerByDuration.map((d, i) => (
                    <Cell key={i} fill={WINNER_COLOR[d.winner]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Winner share by PRNG</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={winnerByPrngData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="prng" tick={{ fontSize: 10 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {WINNERS.map((w) => (
                  <Bar
                    key={w}
                    dataKey={w}
                    stackId="winners"
                    fill={WINNER_COLOR[w]}
                    radius={w === "timeout" ? [2, 2, 0, 0] : 0}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Median duration by PRNG (s)</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={medianByPrngData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis dataKey="prng" tick={{ fontSize: 10 }} stroke="currentColor" />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => `${Number(v).toFixed(1)}s`}
                />
                <Bar dataKey="median" radius={[2, 2, 0, 0]}>
                  {medianByPrngData.map((d) => (
                    <Cell key={d.prng} fill={PRNG_COLOR[d.prng]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">
              χ² p-value distribution (should be flat)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chiData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 9 }}
                  stroke="currentColor"
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="currentColor" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--chart-4)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Direction entropy over time</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={summary.entropySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="index"
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  label={{ value: "Run #", fontSize: 10, position: "insideBottom", offset: -2 }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  stroke="currentColor"
                  domain={[0, 4]}
                  tickCount={5}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => `${Number(v).toFixed(3)} bits`}
                />
                <Line
                  type="monotone"
                  dataKey="entropy"
                  stroke="var(--chart-2)"
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
