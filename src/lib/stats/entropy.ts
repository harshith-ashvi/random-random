export type EntropyResult = {
  bits: number;
  maxBits: number;
  normalized: number;
};

const LN2 = Math.log(2);

export function shannonEntropyBits(counts: number[]): EntropyResult {
  const k = counts.length;
  const maxBits = k > 1 ? Math.log2(k) : 0;
  if (k === 0) return { bits: 0, maxBits, normalized: 0 };

  let total = 0;
  for (let i = 0; i < k; i++) total += counts[i]!;
  if (total <= 0) return { bits: 0, maxBits, normalized: 0 };

  let h = 0;
  for (let i = 0; i < k; i++) {
    const c = counts[i]!;
    if (c <= 0) continue;
    const p = c / total;
    h -= (p * Math.log(p)) / LN2;
  }
  return { bits: h, maxBits, normalized: maxBits > 0 ? h / maxBits : 0 };
}
