import type { EntityType, PopulationSample } from "@/lib/supabase/types";

export const DRAWS_BUCKETS = 20;
export const DIR_BUCKETS = 16;
export const HEATMAP_COLS = 32;
export const HEATMAP_ROWS = 32;
export const HEATMAP_SIZE = HEATMAP_COLS * HEATMAP_ROWS;
export const POPULATION_SAMPLE_INTERVAL_MS = 200;

const TWO_PI = Math.PI * 2;

export type Stats = {
  drawsHist: number[];
  dirHist: number[];
  heatmap: number[];
  populationSeries: PopulationSample[];
  populationMin: { rock: number; paper: number; scissors: number };
  lastSampleAtMs: number;
};

export function createStats(): Stats {
  return {
    drawsHist: new Array(DRAWS_BUCKETS).fill(0),
    dirHist: new Array(DIR_BUCKETS).fill(0),
    heatmap: new Array(HEATMAP_SIZE).fill(0),
    populationSeries: [],
    populationMin: { rock: Infinity, paper: Infinity, scissors: Infinity },
    lastSampleAtMs: -Infinity,
  };
}

export function recordDraw(stats: Stats, value: number): void {
  const idx = Math.min(DRAWS_BUCKETS - 1, Math.floor(value * DRAWS_BUCKETS));
  stats.drawsHist[idx]!++;
}

export function recordAngle(stats: Stats, angle: number): void {
  let a = angle % TWO_PI;
  if (a < 0) a += TWO_PI;
  const idx = Math.min(DIR_BUCKETS - 1, Math.floor((a / TWO_PI) * DIR_BUCKETS));
  stats.dirHist[idx]!++;
}

export function recordPosition(
  stats: Stats,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const cx = Math.min(HEATMAP_COLS - 1, Math.max(0, Math.floor((x / width) * HEATMAP_COLS)));
  const cy = Math.min(HEATMAP_ROWS - 1, Math.max(0, Math.floor((y / height) * HEATMAP_ROWS)));
  stats.heatmap[cy * HEATMAP_COLS + cx]!++;
}

export function sampleIfDue(
  stats: Stats,
  elapsedMs: number,
  counts: { rock: number; paper: number; scissors: number },
): void {
  if (elapsedMs - stats.lastSampleAtMs < POPULATION_SAMPLE_INTERVAL_MS) return;
  stats.lastSampleAtMs = elapsedMs;
  stats.populationSeries.push({
    t: elapsedMs,
    rock: counts.rock,
    paper: counts.paper,
    scissors: counts.scissors,
  });
  if (counts.rock > 0) stats.populationMin.rock = Math.min(stats.populationMin.rock, counts.rock);
  if (counts.paper > 0) stats.populationMin.paper = Math.min(stats.populationMin.paper, counts.paper);
  if (counts.scissors > 0)
    stats.populationMin.scissors = Math.min(stats.populationMin.scissors, counts.scissors);
}

export function populationMinOf(stats: Stats, type: EntityType): number {
  const v = stats.populationMin[type];
  return Number.isFinite(v) ? v : 0;
}
