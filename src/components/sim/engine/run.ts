import type { Counts, EntityType, MovementMode, Placement, Winner } from "@/lib/supabase/types";
import type { PRNG } from "./prng";
import type { Entity } from "./entity";
import type { Stats } from "./stats";
import type { World } from "./world";
import { ENTITY_RADIUS } from "./entity";
import { createWorld } from "./world";
import { createStats, populationMinOf } from "./stats";
import { step, type StepConfig } from "./step";

const TWO_PI = Math.PI * 2;

export type RunConfig = {
  screenW: number;
  screenH: number;
  counts: Counts;
  placement: Placement;
  movementMode: MovementMode;
  stepPx: number;
  turnProbability: number;
  turnAmount: number;
  chaosProbability: number;
  flashDurationMs: number;
  dtMs: number;
  maxMs: number;
};

export type RunResult = {
  winner: Winner;
  durationMs: number;
  screenW: number;
  screenH: number;
  tickCount: number;
  finalCounts: Counts;
  minPopulationOfWinner: number;
  stats: Stats;
};

const CORNERS: Record<EntityType, { x: number; y: number }> = {
  rock: { x: 0.2, y: 0.2 },
  paper: { x: 0.8, y: 0.2 },
  scissors: { x: 0.5, y: 0.8 },
};

const TYPES: EntityType[] = ["rock", "paper", "scissors"];

export function initWorld(config: RunConfig, rng: PRNG): World {
  const world = createWorld(config.screenW, config.screenH);
  let nextId = 0;

  for (const type of TYPES) {
    const n = config.counts[type];
    for (let i = 0; i < n; i++) {
      const position = placeEntity(type, config, rng);
      const entity: Entity = {
        id: nextId++,
        type,
        x: position.x,
        y: position.y,
        angle: rng.next() * TWO_PI,
        flashUntil: 0,
        transformedBy: null,
      };
      world.entities.push(entity);
    }
  }

  return world;
}

function placeEntity(
  type: EntityType,
  config: RunConfig,
  rng: PRNG,
): { x: number; y: number } {
  const pad = ENTITY_RADIUS;
  const w = config.screenW - pad * 2;
  const h = config.screenH - pad * 2;

  if (config.placement === "random") {
    return { x: pad + rng.next() * w, y: pad + rng.next() * h };
  }

  const cluster = CORNERS[type];
  const spread = Math.min(w, h) * 0.12;
  const cx = pad + cluster.x * w;
  const cy = pad + cluster.y * h;
  const r = rng.next() * spread;
  const a = rng.next() * TWO_PI;
  const x = Math.max(pad, Math.min(config.screenW - pad, cx + Math.cos(a) * r));
  const y = Math.max(pad, Math.min(config.screenH - pad, cy + Math.sin(a) * r));
  return { x, y };
}

export function toStepConfig(config: RunConfig): StepConfig {
  return {
    movementMode: config.movementMode,
    stepPx: config.stepPx,
    turnProbability: config.turnProbability,
    turnAmount: config.turnAmount,
    chaosProbability: config.chaosProbability,
    flashDurationMs: config.flashDurationMs,
  };
}

export function winnerOf(counts: Counts): EntityType | null {
  const alive = TYPES.filter((t) => counts[t] > 0);
  return alive.length === 1 ? alive[0]! : null;
}

export function runHeadless(config: RunConfig, rng: PRNG): RunResult {
  const world = initWorld(config, rng);
  const stats = createStats();
  const stepCfg = toStepConfig(config);

  let counts: Counts = {
    rock: config.counts.rock,
    paper: config.counts.paper,
    scissors: config.counts.scissors,
  };
  let winner: Winner = "timeout";

  while (world.elapsedMs < config.maxMs) {
    counts = step(world, stats, rng, stepCfg, config.dtMs);
    const w = winnerOf(counts);
    if (w) {
      winner = w;
      break;
    }
  }

  const minPopulationOfWinner =
    winner === "timeout" ? 0 : populationMinOf(stats, winner);

  return {
    winner,
    durationMs: world.elapsedMs,
    screenW: config.screenW,
    screenH: config.screenH,
    tickCount: world.tick,
    finalCounts: counts,
    minPopulationOfWinner,
    stats,
  };
}
