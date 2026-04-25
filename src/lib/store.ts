"use client";

import { create } from "zustand";
import type {
  Counts,
  EntityType,
  MovementMode,
  Placement,
  PrngKind,
  Winner,
} from "@/lib/supabase/types";
import type { PopulationSample } from "@/lib/supabase/types";
import type { TransformEvent } from "@/components/sim/engine";

export type RunStatus = "idle" | "running" | "paused" | "ended";

export type SimConfig = {
  countPerType: number;
  placement: Placement;
  movementMode: MovementMode;
  stepPx: number;
  turnProbability: number;
  turnAmount: number;
  speed: 0.5 | 1 | 2 | 4;
  prng: PrngKind;
  seed: number | null;
  chaosMode: boolean;
  chaosProbability: number;
  predictedWinner: EntityType | null;
  flashDurationMs: number;
  maxMs: number;
};

export type LiveStatsSnapshot = {
  tick: number;
  elapsedMs: number;
  counts: Counts;
  drawsHist: number[];
  dirHist: number[];
  heatmap: number[];
  populationSeries: PopulationSample[];
  drawsTotal: number;
  transformLog: TransformEvent[];
  finalSurvivors: { id: number; type: EntityType }[];
};

export type RunSummary = {
  winner: Winner;
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
  stats: LiveStatsSnapshot;
  config: SimConfig;
};

type SimStore = {
  config: SimConfig;
  status: RunStatus;
  liveStats: LiveStatsSnapshot | null;
  lastResult: RunSummary | null;
  lastFrameDataUrl: string | null;
  uiHidden: boolean;
  analyticsOpen: boolean;
  aboutOpen: boolean;
  controlsOpen: boolean;
  muted: boolean;
  trailsOn: boolean;

  setConfig: (patch: Partial<SimConfig>) => void;
  setStatus: (s: RunStatus) => void;
  setLiveStats: (snap: LiveStatsSnapshot | null) => void;
  setLastResult: (r: RunSummary | null) => void;
  setLastFrameDataUrl: (v: string | null) => void;
  toggleUi: () => void;
  setUiHidden: (v: boolean) => void;
  setAnalyticsOpen: (v: boolean) => void;
  setAboutOpen: (v: boolean) => void;
  setControlsOpen: (v: boolean) => void;
  toggleMuted: () => void;
  setTrailsOn: (v: boolean) => void;
};

export const DEFAULT_CONFIG: SimConfig = {
  countPerType: 20,
  placement: "random",
  movementMode: "jitter",
  stepPx: 3,
  turnProbability: 0.05,
  turnAmount: Math.PI / 6,
  speed: 1,
  prng: "math-random",
  seed: null,
  chaosMode: false,
  chaosProbability: 0.1,
  predictedWinner: null,
  flashDurationMs: 150,
  maxMs: 15 * 60_000,
};

export const useSimStore = create<SimStore>((set) => ({
  config: DEFAULT_CONFIG,
  status: "idle",
  liveStats: null,
  lastResult: null,
  lastFrameDataUrl: null,
  uiHidden: false,
  analyticsOpen: false,
  aboutOpen: false,
  controlsOpen: true,
  muted: true,
  trailsOn: true,

  setConfig: (patch) => set((s) => ({ config: { ...s.config, ...patch } })),
  setStatus: (status) => set({ status }),
  setLiveStats: (liveStats) => set({ liveStats }),
  setLastResult: (lastResult) => set({ lastResult }),
  setLastFrameDataUrl: (lastFrameDataUrl) => set({ lastFrameDataUrl }),
  toggleUi: () => set((s) => ({ uiHidden: !s.uiHidden })),
  setUiHidden: (uiHidden) => set({ uiHidden }),
  setAnalyticsOpen: (analyticsOpen) => set({ analyticsOpen }),
  setAboutOpen: (aboutOpen) => set({ aboutOpen }),
  setControlsOpen: (controlsOpen) => set({ controlsOpen }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  setTrailsOn: (trailsOn) => set({ trailsOn }),
}));

export function countsFromConfig(config: SimConfig): Counts {
  return {
    rock: config.countPerType,
    paper: config.countPerType,
    scissors: config.countPerType,
  };
}
