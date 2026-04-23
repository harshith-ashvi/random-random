import { describe, expect, test } from "bun:test";
import { createPRNG } from "@/components/sim/engine/prng";
import { runHeadless, winnerOf, type RunConfig } from "@/components/sim/engine/run";

function cfg(overrides: Partial<RunConfig> = {}): RunConfig {
  return {
    screenW: 600,
    screenH: 400,
    counts: { rock: 4, paper: 4, scissors: 4 },
    placement: "random",
    movementMode: "jitter",
    stepPx: 4,
    turnProbability: 0.05,
    turnAmount: Math.PI / 8,
    chaosProbability: 0,
    flashDurationMs: 150,
    dtMs: 16,
    maxMs: 60_000,
    ...overrides,
  };
}

describe("winnerOf", () => {
  test("returns the sole survivor type", () => {
    expect(winnerOf({ rock: 0, paper: 5, scissors: 0 })).toBe("paper");
  });
  test("returns null when multiple types alive", () => {
    expect(winnerOf({ rock: 1, paper: 1, scissors: 0 })).toBeNull();
  });
  test("returns null when all zero", () => {
    expect(winnerOf({ rock: 0, paper: 0, scissors: 0 })).toBeNull();
  });
});

describe("runHeadless", () => {
  test("RunResult contains the four required fields", () => {
    const result = runHeadless(cfg(), createPRNG("mulberry32", 99));
    expect(result).toHaveProperty("winner");
    expect(result).toHaveProperty("durationMs");
    expect(result).toHaveProperty("screenW");
    expect(result).toHaveProperty("screenH");
    expect(result.screenW).toBe(600);
    expect(result.screenH).toBe(400);
    expect(typeof result.durationMs).toBe("number");
    expect(["rock", "paper", "scissors", "timeout"]).toContain(result.winner);
  });

  test("converges within generous timeout", () => {
    const result = runHeadless(cfg({ maxMs: 5 * 60_000 }), createPRNG("mulberry32", 99));
    expect(result.winner).not.toBe("timeout");
    expect(result.minPopulationOfWinner).toBeGreaterThanOrEqual(1);
  });

  test("hits timeout when maxMs is tiny", () => {
    const result = runHeadless(cfg({ maxMs: 100 }), createPRNG("mulberry32", 1));
    expect(result.winner).toBe("timeout");
    expect(result.minPopulationOfWinner).toBe(0);
  });

  test("winner's finalCounts sum matches total entities", () => {
    const c = cfg();
    const total = c.counts.rock + c.counts.paper + c.counts.scissors;
    const result = runHeadless(c, createPRNG("mulberry32", 42));
    const sum = result.finalCounts.rock + result.finalCounts.paper + result.finalCounts.scissors;
    expect(sum).toBe(total);
  });
});
