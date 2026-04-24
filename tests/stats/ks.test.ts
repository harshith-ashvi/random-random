import { describe, expect, test } from "bun:test";
import { ksUniformFromHistogram } from "@/lib/stats/ks";

describe("ksUniformFromHistogram", () => {
  test("perfect uniform histogram: stat = 0, p = 1", () => {
    const result = ksUniformFromHistogram([10, 10, 10, 10, 10]);
    expect(result.stat).toBeCloseTo(0, 10);
    expect(result.pValue).toBeCloseTo(1, 10);
  });

  test("all mass in last bucket: stat ≈ (k-1)/k", () => {
    const k = 20;
    const hist = new Array(k).fill(0);
    hist[k - 1] = 1000;
    const result = ksUniformFromHistogram(hist);
    expect(result.stat).toBeCloseTo((k - 1) / k, 6);
    expect(result.pValue).toBeLessThan(0.0001);
  });

  test("slight imbalance: p-value > 0.05", () => {
    const result = ksUniformFromHistogram([11, 10, 9, 10, 10]);
    expect(result.stat).toBeGreaterThan(0);
    expect(result.pValue).toBeGreaterThan(0.05);
  });

  test("empty input: safe", () => {
    const result = ksUniformFromHistogram([]);
    expect(result.pValue).toBe(1);
  });

  test("zero counts: safe", () => {
    const result = ksUniformFromHistogram([0, 0, 0]);
    expect(result.pValue).toBe(1);
  });
});
