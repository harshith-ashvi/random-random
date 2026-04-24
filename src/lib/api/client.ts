"use client";

import type { LeaderboardRow, SimulationRow, SimulationSamplesRow } from "@/lib/supabase/types";
import type { RunSummary, SimConfig } from "@/lib/store";

export type SimulationListRow = Omit<SimulationRow, "client_id">;

export type SimulationDetail = {
  simulation: SimulationRow;
  samples: Omit<SimulationSamplesRow, "simulation_id"> | null;
};

export function buildSavePayload(result: RunSummary, clientId: string) {
  const config = result.config;
  return {
    simulation: {
      client_id: clientId,
      winner: result.winner,
      duration_ms: Math.round(result.durationMs),
      screen_w: result.screenW,
      screen_h: result.screenH,
      tick_count: result.tickCount,
      prng: config.prng,
      seed: config.prng === "mulberry32" ? config.seed : null,
      movement_mode: config.movementMode,
      step_px: config.stepPx,
      placement: config.placement,
      counts: {
        rock: config.countPerType,
        paper: config.countPerType,
        scissors: config.countPerType,
      },
      chaos_mode: config.chaosMode,
      predicted_winner: config.predictedWinner,
      min_population_of_winner: result.minPopulationOfWinner,
      chi_square_stat: result.chiSquareStat,
      chi_square_p: result.chiSquareP,
      ks_stat: result.ksStat,
      ks_p: result.ksP,
      direction_entropy_bits: result.directionEntropyBits,
      draws_total: result.drawsTotal,
    },
    samples: {
      draws_histogram: result.stats.drawsHist,
      direction_histogram: result.stats.dirHist,
      heatmap: result.stats.heatmap,
      population_series: result.stats.populationSeries,
    },
  };
}

export async function saveRun(
  result: RunSummary,
  clientId: string,
): Promise<{ id: string }> {
  const res = await fetch("/api/simulations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildSavePayload(result, clientId)),
  });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
    };
    throw new Error(error ?? `save failed (${res.status})`);
  }
  return res.json();
}

export async function fetchHistory(
  clientId: string,
  limit = 50,
): Promise<SimulationListRow[]> {
  const res = await fetch(
    `/api/simulations?client_id=${encodeURIComponent(clientId)}&limit=${limit}`,
  );
  if (!res.ok) throw new Error(`history fetch failed (${res.status})`);
  const body = (await res.json()) as { rows: SimulationListRow[] };
  return body.rows;
}

export async function fetchSimulation(
  id: string,
  clientId: string,
): Promise<SimulationDetail> {
  const res = await fetch(
    `/api/simulations/${encodeURIComponent(id)}?client_id=${encodeURIComponent(clientId)}`,
  );
  if (!res.ok) throw new Error(`detail fetch failed (${res.status})`);
  return res.json();
}

export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await fetch("/api/leaderboard");
  if (!res.ok) throw new Error(`leaderboard fetch failed (${res.status})`);
  const body = (await res.json()) as { rows: LeaderboardRow[] };
  return body.rows;
}

export type _SimConfig = SimConfig;
