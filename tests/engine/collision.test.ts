import { describe, expect, test } from "bun:test";
import { createPRNG } from "@/components/sim/engine/prng";
import { resolveCollision, beats, ALL_TYPES } from "@/components/sim/engine/collision";
import type { Entity } from "@/components/sim/engine/entity";
import type { EntityType } from "@/lib/supabase/types";

function makeEntity(id: number, type: EntityType, x = 0, y = 0): Entity {
  return { id, type, x, y, angle: 0, flashUntil: 0, transformedBy: null };
}

describe("collision", () => {
  test("BEATS relationships", () => {
    expect(beats("rock", "scissors")).toBe(true);
    expect(beats("scissors", "paper")).toBe(true);
    expect(beats("paper", "rock")).toBe(true);
    expect(beats("rock", "paper")).toBe(false);
    expect(beats("scissors", "rock")).toBe(false);
    expect(beats("paper", "scissors")).toBe(false);
  });

  test("rock + paper ⇒ rock becomes paper (paper wins)", () => {
    const rock = makeEntity(1, "rock");
    const paper = makeEntity(2, "paper");
    const rng = createPRNG("mulberry32", 1);
    const outcome = resolveCollision(rock, paper, rng, 0);
    expect(outcome).not.toBeNull();
    expect(outcome!.winnerId).toBe(paper.id);
    expect(outcome!.loserId).toBe(rock.id);
    expect(outcome!.prevType).toBe("rock");
    expect(outcome!.newType).toBe("paper");
  });

  test("rock + scissors ⇒ scissors becomes rock", () => {
    const rock = makeEntity(1, "rock");
    const scissors = makeEntity(2, "scissors");
    const outcome = resolveCollision(rock, scissors, createPRNG("mulberry32", 1), 0);
    expect(outcome!.newType).toBe("rock");
    expect(outcome!.loserId).toBe(scissors.id);
  });

  test("paper + scissors ⇒ paper becomes scissors", () => {
    const paper = makeEntity(1, "paper");
    const scissors = makeEntity(2, "scissors");
    const outcome = resolveCollision(paper, scissors, createPRNG("mulberry32", 1), 0);
    expect(outcome!.newType).toBe("scissors");
    expect(outcome!.loserId).toBe(paper.id);
  });

  test("same-type touch ⇒ null (no change)", () => {
    const a = makeEntity(1, "rock");
    const b = makeEntity(2, "rock");
    const outcome = resolveCollision(a, b, createPRNG("mulberry32", 1), 0);
    expect(outcome).toBeNull();
  });

  test("chaos=1 always picks a random type from ALL_TYPES", () => {
    const seen = new Set<EntityType>();
    for (let i = 0; i < 100; i++) {
      const rock = makeEntity(1, "rock");
      const paper = makeEntity(2, "paper");
      const outcome = resolveCollision(rock, paper, createPRNG("mulberry32", i + 1), 1);
      expect(outcome).not.toBeNull();
      expect(ALL_TYPES).toContain(outcome!.newType);
      seen.add(outcome!.newType);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
