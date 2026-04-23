import { describe, expect, test } from "bun:test";
import { createPRNG } from "@/components/sim/engine/prng";
import { runHeadless, type RunConfig } from "@/components/sim/engine/run";

function baseConfig(): RunConfig {
  return {
    screenW: 800,
    screenH: 600,
    counts: { rock: 6, paper: 6, scissors: 6 },
    placement: "random",
    movementMode: "jitter",
    stepPx: 3,
    turnProbability: 0.05,
    turnAmount: Math.PI / 8,
    chaosProbability: 0,
    flashDurationMs: 150,
    dtMs: 16,
    maxMs: 60_000,
  };
}

describe("determinism", () => {
  test("same mulberry32 seed ⇒ identical outcome and tick-by-tick entity state", () => {
    const seed = 12345;
    const rngA = createPRNG("mulberry32", seed);
    const rngB = createPRNG("mulberry32", seed);

    const resultA = runHeadless(baseConfig(), rngA);
    const resultB = runHeadless(baseConfig(), rngB);

    expect(resultA.winner).toBe(resultB.winner);
    expect(resultA.durationMs).toBe(resultB.durationMs);
    expect(resultA.tickCount).toBe(resultB.tickCount);
    expect(resultA.finalCounts).toEqual(resultB.finalCounts);
    expect(resultA.stats.drawsHist).toEqual(resultB.stats.drawsHist);
    expect(resultA.stats.dirHist).toEqual(resultB.stats.dirHist);
    expect(resultA.stats.heatmap).toEqual(resultB.stats.heatmap);
  });

  test("different seeds ⇒ different draw histograms", () => {
    const a = runHeadless(baseConfig(), createPRNG("mulberry32", 1));
    const b = runHeadless(baseConfig(), createPRNG("mulberry32", 999));
    expect(a.stats.drawsHist).not.toEqual(b.stats.drawsHist);
  });
});
