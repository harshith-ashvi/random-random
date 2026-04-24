export type KSResult = {
  stat: number;
  pValue: number;
  n: number;
};

function kolmogorovQ(lambda: number): number {
  if (lambda <= 0) return 1;
  let sum = 0;
  for (let j = 1; j <= 101; j++) {
    const term = (j % 2 === 1 ? 1 : -1) * Math.exp(-2 * j * j * lambda * lambda);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return Math.min(1, Math.max(0, 2 * sum));
}

/**
 * KS goodness-of-fit against Uniform(0,1) using a bucketed histogram.
 * Empirical CDF is evaluated at bucket boundaries; the KS statistic is the
 * max absolute gap between the empirical CDF and the uniform CDF.
 */
export function ksUniformFromHistogram(observed: number[]): KSResult {
  const k = observed.length;
  if (k < 2) return { stat: 0, pValue: 1, n: 0 };
  let n = 0;
  for (let i = 0; i < k; i++) n += observed[i]!;
  if (n <= 0) return { stat: 0, pValue: 1, n: 0 };

  let cumulative = 0;
  let maxGap = 0;
  for (let i = 0; i < k; i++) {
    cumulative += observed[i]!;
    const empirical = cumulative / n;
    const expected = (i + 1) / k;
    const gap = Math.abs(empirical - expected);
    if (gap > maxGap) maxGap = gap;
  }

  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * maxGap;
  const pValue = kolmogorovQ(lambda);
  return { stat: maxGap, pValue, n };
}
