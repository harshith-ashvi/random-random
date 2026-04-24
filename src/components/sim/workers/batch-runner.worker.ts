/// <reference lib="webworker" />

import type { SimConfig } from "@/lib/store";
import type { Counts, PopulationSample } from "@/lib/supabase/types";
import {
  createPRNG,
  runHeadless,
  populationMinOf,
  type RunConfig,
} from "@/components/sim/engine";
import { chiSquareUniform } from "@/lib/stats/chi-square";
import { ksUniformFromHistogram } from "@/lib/stats/ks";
import { shannonEntropyBits } from "@/lib/stats/entropy";

export type BatchWorkerStart = {
  type: "start";
  config: SimConfig;
  count: number;
  screenW: number;
  screenH: number;
};

export type BatchWorkerCancel = { type: "cancel" };
export type BatchWorkerMessageIn = BatchWorkerStart | BatchWorkerCancel;

export type BatchRunSummary = {
  winner: string;
  durationMs: number;
  screenW: number;
  screenH: number;
  tickCount: number;
  finalCounts: Counts;
  minPopulationOfWinner: number;
  chiSquareStat: number | null;
  chiSquareP: number | null;
  ksStat: number | null;
  ksP: number | null;
  directionEntropyBits: number | null;
  drawsTotal: number;
  drawsHist: number[];
  dirHist: number[];
  heatmap: number[];
  populationSeries: PopulationSample[];
  configSeed: number | null;
  configPrng: SimConfig["prng"];
};

export type BatchWorkerProgress = {
  type: "progress";
  completed: number;
  total: number;
  lastWinner: string;
  lastDurationMs: number;
};

export type BatchWorkerResult = {
  type: "result";
  index: number;
  summary: BatchRunSummary;
};

export type BatchWorkerDone = { type: "done" };
export type BatchWorkerCancelled = { type: "cancelled"; completed: number };
export type BatchWorkerError = { type: "error"; message: string };
export type BatchWorkerMessageOut =
  | BatchWorkerProgress
  | BatchWorkerResult
  | BatchWorkerDone
  | BatchWorkerCancelled
  | BatchWorkerError;

let cancelRequested = false;

self.addEventListener("message", (e: MessageEvent<BatchWorkerMessageIn>) => {
  const data = e.data;
  if (data.type === "cancel") {
    cancelRequested = true;
    return;
  }
  if (data.type === "start") {
    cancelRequested = false;
    runBatch(data).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      post({ type: "error", message: msg });
    });
  }
});

function post(m: BatchWorkerMessageOut) {
  (self as unknown as Worker).postMessage(m);
}

async function runBatch(start: BatchWorkerStart) {
  const { config, count, screenW, screenH } = start;
  const counts: Counts = {
    rock: config.countPerType,
    paper: config.countPerType,
    scissors: config.countPerType,
  };

  for (let i = 0; i < count; i++) {
    if (cancelRequested) {
      post({ type: "cancelled", completed: i });
      return;
    }

    const seedForRun =
      config.prng === "mulberry32"
        ? ((config.seed ?? Date.now()) + i) >>> 0
        : null;

    const rng = createPRNG(config.prng, seedForRun);
    const runCfg: RunConfig = {
      screenW,
      screenH,
      counts,
      placement: config.placement,
      movementMode: config.movementMode,
      stepPx: config.stepPx,
      turnProbability: config.turnProbability,
      turnAmount: config.turnAmount,
      chaosProbability: config.chaosMode ? config.chaosProbability : 0,
      flashDurationMs: config.flashDurationMs,
      dtMs: 16,
      maxMs: config.maxMs,
    };

    const result = runHeadless(runCfg, rng);
    const chi = chiSquareUniform(result.stats.drawsHist);
    const ks = ksUniformFromHistogram(result.stats.drawsHist);
    const ent = shannonEntropyBits(result.stats.dirHist);

    const minPop =
      result.winner === "timeout"
        ? 0
        : populationMinOf(result.stats, result.winner);

    const summary: BatchRunSummary = {
      winner: result.winner,
      durationMs: result.durationMs,
      screenW: result.screenW,
      screenH: result.screenH,
      tickCount: result.tickCount,
      finalCounts: result.finalCounts,
      minPopulationOfWinner: minPop,
      chiSquareStat: chi.stat,
      chiSquareP: chi.pValue,
      ksStat: ks.stat,
      ksP: ks.pValue,
      directionEntropyBits: ent.bits,
      drawsTotal: rng.drawCount(),
      drawsHist: result.stats.drawsHist,
      dirHist: result.stats.dirHist,
      heatmap: result.stats.heatmap,
      populationSeries: result.stats.populationSeries,
      configSeed: seedForRun,
      configPrng: config.prng,
    };

    post({ type: "result", index: i, summary });
    post({
      type: "progress",
      completed: i + 1,
      total: count,
      lastWinner: result.winner,
      lastDurationMs: result.durationMs,
    });

    if (i % 10 === 9) await new Promise((r) => setTimeout(r, 0));
  }

  post({ type: "done" });
}
