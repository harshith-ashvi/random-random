import type {
  EntityType,
  MovementMode,
  Placement,
  PopulationSample,
  PrngKind,
  SimulationInsert,
  SimulationSamplesInsert,
  Winner,
} from "@/lib/supabase/types";
import { DRAWS_BUCKETS, DIR_BUCKETS, HEATMAP_SIZE } from "@/components/sim/engine";

export type SavePayload = {
  simulation: SimulationInsert;
  samples: Omit<SimulationSamplesInsert, "simulation_id">;
};

const WINNERS: Winner[] = ["rock", "paper", "scissors", "timeout"];
const PRNGS: PrngKind[] = ["math-random", "crypto-random", "mulberry32"];
const MOVEMENTS: MovementMode[] = ["jitter", "persistent"];
const PLACEMENTS: Placement[] = ["random", "grouped"];
const ENTITY_TYPES: EntityType[] = ["rock", "paper", "scissors"];

export class ValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.field = field;
  }
}

function reqNumber(v: unknown, field: string, min?: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new ValidationError(field, "must be a finite number");
  }
  if (min !== undefined && v < min) {
    throw new ValidationError(field, `must be >= ${min}`);
  }
  return v;
}

function reqInt(v: unknown, field: string, min?: number): number {
  const n = reqNumber(v, field, min);
  if (!Number.isInteger(n)) {
    throw new ValidationError(field, "must be an integer");
  }
  return n;
}

function reqString(v: unknown, field: string, allowed?: readonly string[]): string {
  if (typeof v !== "string" || v.length === 0) {
    throw new ValidationError(field, "must be a non-empty string");
  }
  if (allowed && !allowed.includes(v)) {
    throw new ValidationError(field, `must be one of ${allowed.join(", ")}`);
  }
  return v;
}

function optEnum<T extends string>(
  v: unknown,
  field: string,
  allowed: readonly T[],
): T | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string" || !allowed.includes(v as T)) {
    throw new ValidationError(field, `must be one of ${allowed.join(", ")} or null`);
  }
  return v as T;
}

function reqIntArray(v: unknown, field: string, length: number): number[] {
  if (!Array.isArray(v) || v.length !== length) {
    throw new ValidationError(field, `must be an integer array of length ${length}`);
  }
  const out = new Array<number>(length);
  for (let i = 0; i < length; i++) {
    const n = v[i];
    if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
      throw new ValidationError(field, `index ${i} must be a non-negative integer`);
    }
    out[i] = n;
  }
  return out;
}

function parseCounts(v: unknown): { rock: number; paper: number; scissors: number } {
  if (!v || typeof v !== "object") {
    throw new ValidationError("counts", "must be an object");
  }
  const obj = v as Record<string, unknown>;
  return {
    rock: reqInt(obj.rock, "counts.rock", 0),
    paper: reqInt(obj.paper, "counts.paper", 0),
    scissors: reqInt(obj.scissors, "counts.scissors", 0),
  };
}

function parsePopulationSeries(v: unknown): PopulationSample[] {
  if (!Array.isArray(v)) {
    throw new ValidationError("population_series", "must be an array");
  }
  const out: PopulationSample[] = [];
  for (let i = 0; i < v.length; i++) {
    const s = v[i] as Record<string, unknown>;
    out.push({
      t: reqNumber(s?.t, `population_series[${i}].t`, 0),
      rock: reqInt(s?.rock, `population_series[${i}].rock`, 0),
      paper: reqInt(s?.paper, `population_series[${i}].paper`, 0),
      scissors: reqInt(s?.scissors, `population_series[${i}].scissors`, 0),
    });
  }
  return out;
}

export function parseSavePayload(raw: unknown): SavePayload {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("body", "must be a JSON object");
  }
  const body = raw as Record<string, unknown>;

  const sim = (body.simulation ?? {}) as Record<string, unknown>;
  const samples = (body.samples ?? {}) as Record<string, unknown>;

  const simulation: SimulationInsert = {
    client_id: reqString(sim.client_id, "simulation.client_id"),
    winner: reqString(sim.winner, "simulation.winner", WINNERS) as Winner,
    duration_ms: reqInt(sim.duration_ms, "simulation.duration_ms", 0),
    screen_w: reqInt(sim.screen_w, "simulation.screen_w", 1),
    screen_h: reqInt(sim.screen_h, "simulation.screen_h", 1),
    tick_count: sim.tick_count == null ? null : reqInt(sim.tick_count, "simulation.tick_count", 0),
    prng: reqString(sim.prng, "simulation.prng", PRNGS) as PrngKind,
    seed: sim.seed == null ? null : reqInt(sim.seed, "simulation.seed"),
    movement_mode: reqString(sim.movement_mode, "simulation.movement_mode", MOVEMENTS) as MovementMode,
    step_px: reqNumber(sim.step_px, "simulation.step_px", 0),
    placement: reqString(sim.placement, "simulation.placement", PLACEMENTS) as Placement,
    counts: parseCounts(sim.counts),
    chaos_mode: Boolean(sim.chaos_mode),
    predicted_winner: optEnum(sim.predicted_winner, "simulation.predicted_winner", ENTITY_TYPES),
    min_population_of_winner:
      sim.min_population_of_winner == null
        ? null
        : reqInt(sim.min_population_of_winner, "simulation.min_population_of_winner", 0),
    chi_square_stat: sim.chi_square_stat == null ? null : reqNumber(sim.chi_square_stat, "simulation.chi_square_stat"),
    chi_square_p: sim.chi_square_p == null ? null : reqNumber(sim.chi_square_p, "simulation.chi_square_p"),
    ks_stat: sim.ks_stat == null ? null : reqNumber(sim.ks_stat, "simulation.ks_stat"),
    ks_p: sim.ks_p == null ? null : reqNumber(sim.ks_p, "simulation.ks_p"),
    direction_entropy_bits:
      sim.direction_entropy_bits == null
        ? null
        : reqNumber(sim.direction_entropy_bits, "simulation.direction_entropy_bits"),
    draws_total: sim.draws_total == null ? null : reqInt(sim.draws_total, "simulation.draws_total", 0),
  };

  const sampleRow: Omit<SimulationSamplesInsert, "simulation_id"> = {
    draws_histogram: reqIntArray(samples.draws_histogram, "samples.draws_histogram", DRAWS_BUCKETS),
    direction_histogram: reqIntArray(
      samples.direction_histogram,
      "samples.direction_histogram",
      DIR_BUCKETS,
    ),
    heatmap: reqIntArray(samples.heatmap, "samples.heatmap", HEATMAP_SIZE),
    population_series: parsePopulationSeries(samples.population_series),
  };

  return { simulation, samples: sampleRow };
}
