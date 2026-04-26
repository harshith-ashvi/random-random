"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getClientId } from "@/lib/client-id";
import { fetchSimulation, type SimulationDetail } from "@/lib/api/client";
import { PopulationArea } from "@/components/sim/charts/PopulationArea";
import { Histogram } from "@/components/sim/charts/Histogram";
import { Heatmap } from "@/components/sim/charts/Heatmap";
import { Scorecard, type ScoreTile } from "@/components/sim/charts/Scorecard";

type Props = {
  id: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RunDetailDialog({ id, open, onOpenChange }: Props) {
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !open) return;
    const clientId = getClientId();
    if (!clientId) return;
    let cancelled = false;
    fetchSimulation(id, clientId)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "failed");
      });
    return () => {
      cancelled = true;
      setDetail(null);
      setError(null);
    };
  }, [id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {detail ? (
              <span className="capitalize">
                {winnerEmoji(detail.simulation.winner)} {detail.simulation.winner} •
                {" "}
                {(detail.simulation.duration_ms / 1000).toFixed(1)}s
              </span>
            ) : (
              "Run detail"
            )}
          </DialogTitle>
          <DialogDescription>
            {detail
              ? new Date(detail.simulation.created_at).toLocaleString()
              : "Loading stored run…"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="py-4 text-center text-sm text-destructive">{error}</div>
        )}

        {!error && !detail && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {detail && (
          <RunDetailBody detail={detail} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function winnerEmoji(w: string) {
  return w === "rock" ? "🪨" : w === "paper" ? "📄" : w === "scissors" ? "✂️" : "⏱️";
}

function RunDetailBody({ detail }: { detail: SimulationDetail }) {
  const sim = detail.simulation;
  const samples = detail.samples;

  const tiles: ScoreTile[] = [
    { label: "Ticks", value: (sim.tick_count ?? 0).toLocaleString() },
    { label: "Draws", value: (sim.draws_total ?? 0).toLocaleString() },
    { label: "Screen", value: `${sim.screen_w}×${sim.screen_h}` },
    { label: "Step px", value: sim.step_px.toFixed(1) },
    {
      label: "χ² p",
      value: sim.chi_square_p == null ? "—" : sim.chi_square_p.toFixed(3),
      tone: sim.chi_square_p != null && sim.chi_square_p < 0.05 ? "warn" : "good",
    },
    {
      label: "KS p",
      value: sim.ks_p == null ? "—" : sim.ks_p.toFixed(3),
      tone: sim.ks_p != null && sim.ks_p < 0.05 ? "warn" : "good",
    },
    {
      label: "Dir entropy",
      value:
        sim.direction_entropy_bits == null
          ? "—"
          : `${sim.direction_entropy_bits.toFixed(3)} bits`,
    },
    {
      label: "Min pop",
      value: sim.min_population_of_winner == null ? "—" : String(sim.min_population_of_winner),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{sim.prng}</Badge>
        <Badge variant="outline">{sim.movement_mode}</Badge>
        <Badge variant="outline">{sim.placement}</Badge>
        {sim.chaos_mode && <Badge variant="outline">chaos</Badge>}
        {sim.seed != null && <Badge variant="outline">seed {sim.seed}</Badge>}
        {sim.predicted_winner && (
          <Badge variant="outline">predicted {sim.predicted_winner}</Badge>
        )}
      </div>

      <Scorecard tiles={tiles} />

      {samples && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-2">
            <div className="mb-1 text-xs font-medium">Population</div>
            <PopulationArea series={samples.population_series} height={160} />
          </div>
          <div className="rounded-md border p-2">
            <div className="mb-1 text-xs font-medium">Draws histogram</div>
            <Histogram counts={samples.draws_histogram} fill="var(--chart-2)" />
          </div>
          <div className="rounded-md border p-2">
            <div className="mb-1 text-xs font-medium">Direction histogram</div>
            <Histogram counts={samples.direction_histogram} fill="var(--chart-3)" />
          </div>
          <div className="rounded-md border p-2">
            <div className="mb-1 text-xs font-medium">Position heatmap</div>
            <Heatmap values={samples.heatmap} />
          </div>
        </div>
      )}
    </div>
  );
}
