import { describe, expect, test } from "bun:test";
import { createPRNG } from "@/components/sim/engine/prng";
import { createWorld } from "@/components/sim/engine/world";
import { createStats } from "@/components/sim/engine/stats";
import { step, type StepConfig } from "@/components/sim/engine/step";
import { ENTITY_RADIUS } from "@/components/sim/engine/entity";

const baseStepCfg: StepConfig = {
  movementMode: "persistent",
  stepPx: 3,
  turnProbability: 0,
  turnAmount: 0,
  chaosProbability: 0,
  flashDurationMs: 150,
};

describe("step / wall bounce", () => {
  test("hits left wall and reflects x component", () => {
    const world = createWorld(200, 200);
    world.entities.push({
      id: 0,
      type: "rock",
      x: ENTITY_RADIUS + 1,
      y: 100,
      angle: Math.PI,
      flashUntil: 0,
      transformedBy: null,
    });
    const stats = createStats();
    const rng = createPRNG("mulberry32", 1);
    step(world, stats, rng, baseStepCfg, 16);
    const e = world.entities[0]!;
    expect(e.x).toBeGreaterThanOrEqual(ENTITY_RADIUS);
    expect(Math.cos(e.angle)).toBeGreaterThan(0);
  });

  test("hits right wall and reflects", () => {
    const world = createWorld(200, 200);
    world.entities.push({
      id: 0,
      type: "rock",
      x: 200 - ENTITY_RADIUS - 1,
      y: 100,
      angle: 0,
      flashUntil: 0,
      transformedBy: null,
    });
    const stats = createStats();
    step(world, stats, createPRNG("mulberry32", 1), baseStepCfg, 16);
    const e = world.entities[0]!;
    expect(e.x).toBeLessThanOrEqual(200 - ENTITY_RADIUS);
    expect(Math.cos(e.angle)).toBeLessThan(0);
  });

  test("hits top wall and reflects y", () => {
    const world = createWorld(200, 200);
    world.entities.push({
      id: 0,
      type: "rock",
      x: 100,
      y: ENTITY_RADIUS + 1,
      angle: -Math.PI / 2,
      flashUntil: 0,
      transformedBy: null,
    });
    const stats = createStats();
    step(world, stats, createPRNG("mulberry32", 1), baseStepCfg, 16);
    const e = world.entities[0]!;
    expect(e.y).toBeGreaterThanOrEqual(ENTITY_RADIUS);
    expect(Math.sin(e.angle)).toBeGreaterThan(0);
  });

  test("hits bottom wall and reflects y", () => {
    const world = createWorld(200, 200);
    world.entities.push({
      id: 0,
      type: "rock",
      x: 100,
      y: 200 - ENTITY_RADIUS - 1,
      angle: Math.PI / 2,
      flashUntil: 0,
      transformedBy: null,
    });
    const stats = createStats();
    step(world, stats, createPRNG("mulberry32", 1), baseStepCfg, 16);
    const e = world.entities[0]!;
    expect(e.y).toBeLessThanOrEqual(200 - ENTITY_RADIUS);
    expect(Math.sin(e.angle)).toBeLessThan(0);
  });
});

describe("step / transforms", () => {
  test("overlapping rock + paper ⇒ rock becomes paper", () => {
    const world = createWorld(400, 400);
    world.entities.push(
      { id: 0, type: "rock", x: 100, y: 100, angle: 0, flashUntil: 0, transformedBy: null },
      { id: 1, type: "paper", x: 100, y: 100, angle: Math.PI, flashUntil: 0, transformedBy: null },
    );
    const stats = createStats();
    const counts = step(world, stats, createPRNG("mulberry32", 1), baseStepCfg, 16);
    expect(counts.paper).toBe(2);
    expect(counts.rock).toBe(0);
    expect(world.entities.every((e) => e.type === "paper")).toBe(true);
  });

  test("rock + paper + scissors triple overlap: rock does NOT become scissors in one tick", () => {
    const world = createWorld(400, 400);
    world.entities.push(
      { id: 0, type: "rock", x: 100, y: 100, angle: 0, flashUntil: 0, transformedBy: null },
      { id: 1, type: "paper", x: 100, y: 100, angle: Math.PI, flashUntil: 0, transformedBy: null },
      { id: 2, type: "scissors", x: 100, y: 100, angle: Math.PI / 2, flashUntil: 0, transformedBy: null },
    );
    const stats = createStats();
    step(world, stats, createPRNG("mulberry32", 1), baseStepCfg, 16);
    expect(world.entities[0]!.type).toBe("paper");
  });

  test("overlapping same-type pair ⇒ no change", () => {
    const world = createWorld(400, 400);
    world.entities.push(
      { id: 0, type: "rock", x: 100, y: 100, angle: 0, flashUntil: 0, transformedBy: null },
      { id: 1, type: "rock", x: 100, y: 100, angle: Math.PI, flashUntil: 0, transformedBy: null },
    );
    const stats = createStats();
    const counts = step(world, stats, createPRNG("mulberry32", 1), baseStepCfg, 16);
    expect(counts.rock).toBe(2);
    expect(counts.paper).toBe(0);
    expect(counts.scissors).toBe(0);
  });
});

describe("step / stats totals", () => {
  test("heatmap sum = ticks × entities; dirHist sum = ticks × entities", () => {
    const world = createWorld(400, 400);
    for (let i = 0; i < 5; i++) {
      world.entities.push({
        id: i,
        type: "rock",
        x: 50 + i * 60,
        y: 200,
        angle: 0,
        flashUntil: 0,
        transformedBy: null,
      });
    }
    const stats = createStats();
    const rng = createPRNG("mulberry32", 42);
    const TICKS = 30;
    for (let i = 0; i < TICKS; i++) {
      step(world, stats, rng, { ...baseStepCfg, movementMode: "jitter" }, 16);
    }
    const heatSum = stats.heatmap.reduce((a, b) => a + b, 0);
    const dirSum = stats.dirHist.reduce((a, b) => a + b, 0);
    expect(heatSum).toBe(TICKS * 5);
    expect(dirSum).toBe(TICKS * 5);
  });

  test("jitter mode: draws histogram records at least one draw per entity per tick", () => {
    const world = createWorld(400, 400);
    for (let i = 0; i < 3; i++) {
      world.entities.push({
        id: i,
        type: "rock",
        x: 50 + i * 60,
        y: 200,
        angle: 0,
        flashUntil: 0,
        transformedBy: null,
      });
    }
    const stats = createStats();
    const TICKS = 10;
    for (let i = 0; i < TICKS; i++) {
      step(world, stats, createPRNG("mulberry32", 7), { ...baseStepCfg, movementMode: "jitter" }, 16);
    }
    const drawsSum = stats.drawsHist.reduce((a, b) => a + b, 0);
    expect(drawsSum).toBeGreaterThanOrEqual(TICKS * 3);
  });
});
