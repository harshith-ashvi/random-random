import { describe, expect, test } from "bun:test";
import { shannonEntropyBits } from "@/lib/stats/entropy";

describe("shannonEntropyBits", () => {
  test("uniform over k buckets ⇒ log2(k) bits", () => {
    for (const k of [2, 4, 8, 16, 32]) {
      const counts = new Array(k).fill(100);
      const result = shannonEntropyBits(counts);
      expect(result.bits).toBeCloseTo(Math.log2(k), 10);
      expect(result.maxBits).toBeCloseTo(Math.log2(k), 10);
      expect(result.normalized).toBeCloseTo(1, 10);
    }
  });

  test("all mass in one bucket ⇒ 0 bits", () => {
    const counts = [1000, 0, 0, 0];
    const result = shannonEntropyBits(counts);
    expect(result.bits).toBeCloseTo(0, 10);
    expect(result.normalized).toBeCloseTo(0, 10);
  });

  test("50/50 split ⇒ 1 bit", () => {
    const result = shannonEntropyBits([50, 50]);
    expect(result.bits).toBeCloseTo(1, 10);
  });

  test("zero counts: safe", () => {
    const result = shannonEntropyBits([0, 0, 0]);
    expect(result.bits).toBe(0);
  });

  test("empty: safe", () => {
    const result = shannonEntropyBits([]);
    expect(result.bits).toBe(0);
    expect(result.maxBits).toBe(0);
  });
});
