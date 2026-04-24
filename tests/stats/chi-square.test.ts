import { describe, expect, test } from "bun:test";
import { chiSquareUniform } from "@/lib/stats/chi-square";

describe("chiSquareUniform", () => {
  test("textbook die example: stat = 4, df = 5", () => {
    const observed = [10, 14, 8, 12, 6, 10];
    const result = chiSquareUniform(observed);
    expect(result.stat).toBeCloseTo(4, 10);
    expect(result.df).toBe(5);
    expect(result.total).toBe(60);
    expect(result.pValue).toBeGreaterThan(0.5);
    expect(result.pValue).toBeLessThan(0.6);
  });

  test("perfect uniform: stat = 0, p = 1", () => {
    const result = chiSquareUniform([10, 10, 10, 10, 10]);
    expect(result.stat).toBeCloseTo(0, 10);
    expect(result.pValue).toBeCloseTo(1, 10);
  });

  test("extreme imbalance: low p-value", () => {
    const result = chiSquareUniform([100, 0, 0, 0]);
    expect(result.stat).toBeGreaterThan(200);
    expect(result.pValue).toBeLessThan(0.0001);
  });

  test("empty input: safe return", () => {
    const result = chiSquareUniform([]);
    expect(result.total).toBe(0);
    expect(result.pValue).toBe(1);
  });

  test("all zeros: safe return", () => {
    const result = chiSquareUniform([0, 0, 0]);
    expect(result.total).toBe(0);
    expect(result.pValue).toBe(1);
  });
});
