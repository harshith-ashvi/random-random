import type { PrngKind } from "@/lib/supabase/types";

export interface PRNG {
  readonly kind: PrngKind;
  readonly seed: number | null;
  next(): number;
  nextAngle(): number;
  drawCount(): number;
}

class MathRandomPRNG implements PRNG {
  readonly kind: PrngKind = "math-random";
  readonly seed = null;
  private draws = 0;

  next(): number {
    this.draws++;
    return Math.random();
  }

  nextAngle(): number {
    return this.next() * Math.PI * 2;
  }

  drawCount(): number {
    return this.draws;
  }
}

class CryptoRandomPRNG implements PRNG {
  readonly kind: PrngKind = "crypto-random";
  readonly seed = null;
  private draws = 0;
  private buffer = new Uint32Array(256);
  private cursor = this.buffer.length;

  private refill() {
    crypto.getRandomValues(this.buffer);
    this.cursor = 0;
  }

  next(): number {
    if (this.cursor >= this.buffer.length) this.refill();
    const raw = this.buffer[this.cursor++]!;
    this.draws++;
    return raw / 0x1_0000_0000;
  }

  nextAngle(): number {
    return this.next() * Math.PI * 2;
  }

  drawCount(): number {
    return this.draws;
  }
}

class Mulberry32PRNG implements PRNG {
  readonly kind: PrngKind = "mulberry32";
  readonly seed: number;
  private state: number;
  private draws = 0;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  next(): number {
    this.draws++;
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  }

  nextAngle(): number {
    return this.next() * Math.PI * 2;
  }

  drawCount(): number {
    return this.draws;
  }
}

export function createPRNG(kind: PrngKind, seed?: number | null): PRNG {
  switch (kind) {
    case "math-random":
      return new MathRandomPRNG();
    case "crypto-random":
      return new CryptoRandomPRNG();
    case "mulberry32":
      return new Mulberry32PRNG(seed ?? Date.now());
  }
}
