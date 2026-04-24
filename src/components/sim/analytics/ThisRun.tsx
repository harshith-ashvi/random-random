"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimStore } from "@/lib/store";
import { chiSquareUniform } from "@/lib/stats/chi-square";
import { ksUniformFromHistogram } from "@/lib/stats/ks";
import { shannonEntropyBits } from "@/lib/stats/entropy";
import { PopulationArea } from "@/components/sim/charts/PopulationArea";
import { Histogram } from "@/components/sim/charts/Histogram";
import { Heatmap } from "@/components/sim/charts/Heatmap";
import { Scorecard, type ScoreTile } from "@/components/sim/charts/Scorecard";

const DRAWS_LABEL = (i: number) => {
  const lo = (i / 20).toFixed(2);
  const hi = ((i + 1) / 20).toFixed(2);
  return `${lo}–${hi}`;
};

const DIR_LABEL = (i: number) => {
  const deg = Math.round((i / 16) * 360);
  return `${deg}°`;
};

export function ThisRunTab() {
  const liveStats = useSimStore((s) => s.liveStats);
  const lastResult = useSimStore((s) => s.lastResult);
  const status = useSimStore((s) => s.status);
  const config = useSimStore((s) => s.config);

  const source = status === "ended" && lastResult ? lastResult.stats : liveStats;

  const derived = useMemo(() => {
    if (!source) return null;
    const chi = chiSquareUniform(source.drawsHist);
    const ks = ksUniformFromHistogram(source.drawsHist);
    const ent = shannonEntropyBits(source.dirHist);
    return { chi, ks, ent };
  }, [source]);

  if (!source || !derived) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No data yet. Hit Start to begin a run.
      </div>
    );
  }

  const tiles: ScoreTile[] = [
    {
      label: "Tick",
      value: source.tick.toLocaleString(),
    },
    {
      label: "Elapsed",
      value: `${(source.elapsedMs / 1000).toFixed(1)}s`,
    },
    {
      label: "Draws",
      value: source.drawsTotal.toLocaleString(),
      hint: "Total random numbers pulled from the PRNG this run.",
    },
    {
      label: "Alive",
      value: `${source.counts.rock} / ${source.counts.paper} / ${source.counts.scissors}`,
      hint: "🪨 / 📄 / ✂️ — entities still present.",
    },
    {
      label: "χ² stat",
      value: derived.chi.stat.toFixed(2),
      hint: "Chi-square goodness-of-fit vs. uniform on 20 buckets over [0, 1).",
    },
    {
      label: "χ² p-value",
      value: derived.chi.pValue.toFixed(3),
      tone: derived.chi.pValue < 0.05 ? "warn" : "good",
      hint: "Probability the bucket counts came from a truly uniform stream. Low p (< 0.05) = suspicious.",
    },
    {
      label: "KS D",
      value: derived.ks.stat.toFixed(3),
      hint: "Largest gap between the empirical CDF of draws and the uniform CDF.",
    },
    {
      label: "KS p-value",
      value: derived.ks.pValue.toFixed(3),
      tone: derived.ks.pValue < 0.05 ? "warn" : "good",
      hint: "Same rule: low p = unlikely to be uniform.",
    },
    {
      label: "Dir entropy",
      value: `${derived.ent.bits.toFixed(3)} bits`,
      hint: `Shannon entropy over 16 angular buckets. Max is ${derived.ent.maxBits.toFixed(2)} bits (perfect uniform).`,
    },
    {
      label: "PRNG",
      value: config.prng,
    },
  ];

  return (
    <div className="space-y-4 pb-6">
      <Scorecard tiles={tiles} />

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Population over time</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <PopulationArea series={source.populationSeries} height={180} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">
              Draws histogram (20 buckets)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Histogram
              counts={source.drawsHist}
              labelFormatter={DRAWS_LABEL}
              fill="var(--chart-2)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">
              Direction histogram (16 buckets)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Histogram
              counts={source.dirHist}
              labelFormatter={DIR_LABEL}
              fill="var(--chart-3)"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium">Position heatmap (32×32)</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <Heatmap values={source.heatmap} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
