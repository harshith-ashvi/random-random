export { createPRNG } from "./prng";
export type { PRNG } from "./prng";

export { ENTITY_RADIUS } from "./entity";
export type { Entity } from "./entity";

export { SpatialHash, createWorld, rebuildHash } from "./world";
export type { World } from "./world";

export { ALL_TYPES, beats, overlaps, resolveCollision } from "./collision";
export type { CollisionOutcome } from "./collision";

export {
  DRAWS_BUCKETS,
  DIR_BUCKETS,
  HEATMAP_COLS,
  HEATMAP_ROWS,
  HEATMAP_SIZE,
  POPULATION_SAMPLE_INTERVAL_MS,
  TRANSFORM_LOG_CAP,
  createStats,
  populationMinOf,
  recordAngle,
  recordDraw,
  recordPosition,
  recordTransform,
  sampleIfDue,
} from "./stats";
export type { Stats, TransformEvent } from "./stats";

export { step } from "./step";
export type { StepConfig } from "./step";

export { initWorld, runHeadless, toStepConfig, winnerOf } from "./run";
export type { RunConfig, RunResult } from "./run";
