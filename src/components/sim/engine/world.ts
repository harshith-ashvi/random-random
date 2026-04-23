import type { Entity } from "./entity";
import { ENTITY_RADIUS } from "./entity";

const CELL = ENTITY_RADIUS * 2;

export class SpatialHash {
  private cells = new Map<number, Entity[]>();
  private cols: number;

  constructor(width: number, height: number) {
    this.cols = Math.max(1, Math.ceil(width / CELL));
    void height;
  }

  private key(cx: number, cy: number): number {
    return cy * this.cols + cx;
  }

  private cellOf(x: number, y: number): [number, number] {
    return [Math.floor(x / CELL), Math.floor(y / CELL)];
  }

  clear(): void {
    this.cells.clear();
  }

  insert(entity: Entity): void {
    const [cx, cy] = this.cellOf(entity.x, entity.y);
    const k = this.key(cx, cy);
    const bucket = this.cells.get(k);
    if (bucket) bucket.push(entity);
    else this.cells.set(k, [entity]);
  }

  neighbours(entity: Entity): Entity[] {
    const [cx, cy] = this.cellOf(entity.x, entity.y);
    const out: Entity[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const bucket = this.cells.get(this.key(cx + dx, cy + dy));
        if (bucket) out.push(...bucket);
      }
    }
    return out;
  }
}

export type World = {
  width: number;
  height: number;
  entities: Entity[];
  hash: SpatialHash;
  tick: number;
  elapsedMs: number;
};

export function createWorld(width: number, height: number): World {
  return {
    width,
    height,
    entities: [],
    hash: new SpatialHash(width, height),
    tick: 0,
    elapsedMs: 0,
  };
}

export function rebuildHash(world: World): void {
  world.hash.clear();
  for (const e of world.entities) world.hash.insert(e);
}
