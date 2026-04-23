import type { EntityType } from "@/lib/supabase/types";
import type { PRNG } from "./prng";
import type { Entity } from "./entity";
import { ENTITY_RADIUS } from "./entity";

const BEATS: Record<EntityType, EntityType> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

export const ALL_TYPES: EntityType[] = ["rock", "paper", "scissors"];

export function beats(a: EntityType, b: EntityType): boolean {
  return BEATS[a] === b;
}

export function overlaps(a: Entity, b: Entity): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r2 = (ENTITY_RADIUS * 2) ** 2;
  return dx * dx + dy * dy <= r2;
}

export type CollisionOutcome = {
  winnerId: number;
  loserId: number;
  prevType: EntityType;
  newType: EntityType;
};

/**
 * Resolve a collision between two entities. Returns the outcome if a transform
 * occurred, or null for same-type touches. `chaosProbability` ∈ [0, 1]: on hit,
 * with that probability the loser becomes a random type instead of the winner's type.
 */
export function resolveCollision(
  a: Entity,
  b: Entity,
  rng: PRNG,
  chaosProbability: number,
): CollisionOutcome | null {
  if (a.type === b.type) return null;

  let winner: Entity;
  let loser: Entity;
  if (beats(a.type, b.type)) {
    winner = a;
    loser = b;
  } else {
    winner = b;
    loser = a;
  }

  const prevType = loser.type;
  let newType = winner.type;

  if (chaosProbability > 0 && rng.next() < chaosProbability) {
    const idx = Math.floor(rng.next() * ALL_TYPES.length);
    newType = ALL_TYPES[idx]!;
  }

  return {
    winnerId: winner.id,
    loserId: loser.id,
    prevType,
    newType,
  };
}
