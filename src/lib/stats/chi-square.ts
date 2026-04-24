import { gammaQ } from "./gamma";

export type ChiSquareResult = {
  stat: number;
  df: number;
  pValue: number;
  total: number;
};

export function chiSquareUniform(observed: number[]): ChiSquareResult {
  const k = observed.length;
  if (k < 2) {
    return { stat: 0, df: 0, pValue: 1, total: 0 };
  }
  let total = 0;
  for (let i = 0; i < k; i++) total += observed[i]!;
  if (total <= 0) {
    return { stat: 0, df: k - 1, pValue: 1, total: 0 };
  }
  const expected = total / k;
  let stat = 0;
  for (let i = 0; i < k; i++) {
    const diff = observed[i]! - expected;
    stat += (diff * diff) / expected;
  }
  const df = k - 1;
  const pValue = gammaQ(df / 2, stat / 2);
  return { stat, df, pValue, total };
}
