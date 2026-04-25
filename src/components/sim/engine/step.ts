import type { Counts, MovementMode } from "@/lib/supabase/types";
import type { PRNG } from "./prng";
import type { World } from "./world";
import type { Stats } from "./stats";
import { ENTITY_RADIUS } from "./entity";
import { rebuildHash } from "./world";
import { overlaps, resolveCollision } from "./collision";
import { recordAngle, recordDraw, recordPosition, recordTransform, sampleIfDue } from "./stats";

const TWO_PI = Math.PI * 2;

export type StepConfig = {
  movementMode: MovementMode;
  stepPx: number;
  turnProbability: number;
  turnAmount: number;
  chaosProbability: number;
  flashDurationMs: number;
};

export function step(
  world: World,
  stats: Stats,
  rng: PRNG,
  config: StepConfig,
  dtMs: number,
): Counts {
  world.tick++;
  world.elapsedMs += dtMs;

  const { width, height, entities } = world;

  for (const e of entities) {
    if (config.movementMode === "jitter") {
      const r = rng.next();
      recordDraw(stats, r);
      e.angle = r * TWO_PI;
    } else if (rng.next() < config.turnProbability) {
      const r = rng.next();
      recordDraw(stats, r);
      e.angle = (e.angle + (r - 0.5) * 2 * config.turnAmount) % TWO_PI;
      if (e.angle < 0) e.angle += TWO_PI;
    }

    recordAngle(stats, e.angle);

    e.x += Math.cos(e.angle) * config.stepPx;
    e.y += Math.sin(e.angle) * config.stepPx;

    if (e.x < ENTITY_RADIUS) {
      e.x = ENTITY_RADIUS;
      e.angle = Math.PI - e.angle;
    } else if (e.x > width - ENTITY_RADIUS) {
      e.x = width - ENTITY_RADIUS;
      e.angle = Math.PI - e.angle;
    }
    if (e.y < ENTITY_RADIUS) {
      e.y = ENTITY_RADIUS;
      e.angle = -e.angle;
    } else if (e.y > height - ENTITY_RADIUS) {
      e.y = height - ENTITY_RADIUS;
      e.angle = -e.angle;
    }

    e.angle = ((e.angle % TWO_PI) + TWO_PI) % TWO_PI;

    recordPosition(stats, e.x, e.y, width, height);
  }

  rebuildHash(world);

  const resolvedPairs = new Set<number>();
  const lockedThisTick = new Set<number>();
  for (const a of entities) {
    if (lockedThisTick.has(a.id)) continue;
    const neighbours = world.hash.neighbours(a);
    for (const b of neighbours) {
      if (a.id >= b.id) continue;
      if (lockedThisTick.has(b.id)) continue;
      const key = a.id * 0x10000 + b.id;
      if (resolvedPairs.has(key)) continue;
      if (!overlaps(a, b)) continue;

      const outcome = resolveCollision(a, b, rng, config.chaosProbability);
      resolvedPairs.add(key);
      if (!outcome) continue;

      const loser = a.id === outcome.loserId ? a : b;
      loser.type = outcome.newType;
      loser.flashUntil = world.elapsedMs + config.flashDurationMs;
      loser.transformedBy = outcome.winnerId;
      recordTransform(stats, {
        atMs: world.elapsedMs,
        loserId: outcome.loserId,
        winnerId: outcome.winnerId,
        prevType: outcome.prevType,
        newType: outcome.newType,
      });
      lockedThisTick.add(loser.id);
      if (a.id === loser.id) break;
    }
  }

  const counts: Counts = { rock: 0, paper: 0, scissors: 0 };
  for (const e of entities) counts[e.type]++;

  sampleIfDue(stats, world.elapsedMs, counts);

  return counts;
}
