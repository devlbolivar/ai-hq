import type { Coord, OfficeLayout, OfficeObject, WalkabilityGrid } from '../types';

/** Every tile covered by an object's footprint (may include tiles outside the grid). */
export function footprint(obj: OfficeObject): Coord[] {
  const tiles: Coord[] = [];
  for (let dy = 0; dy < obj.size.h; dy++) {
    for (let dx = 0; dx < obj.size.w; dx++) {
      tiles.push({ x: obj.origin.x + dx, y: obj.origin.y + dy });
    }
  }
  return tiles;
}

export function isWalkable(walk: WalkabilityGrid, t: Coord): boolean {
  return walk[t.y]?.[t.x] === true;
}

/** Tiles covered by blocking objects are not walkable (FR-020). */
export function walkability(layout: OfficeLayout): WalkabilityGrid {
  const { cols, rows } = layout.grid;
  const walk = Array.from({ length: rows }, () => Array<boolean>(cols).fill(true));
  for (const obj of layout.objects) {
    if (!obj.blocking) continue;
    for (const t of footprint(obj)) {
      const row = walk[t.y];
      if (row && t.x >= 0 && t.x < cols) row[t.x] = false;
    }
  }
  return walk;
}

const STEPS: readonly Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** 4-direction flood fill from `start` over walkable tiles; `reach[y][x]`. */
export function reachableFrom(walk: WalkabilityGrid, start: Coord): boolean[][] {
  const reach = walk.map((row) => row.map(() => false));
  if (!isWalkable(walk, start)) return reach;
  const queue: Coord[] = [start];
  reach[start.y]![start.x] = true;
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i]!;
    for (const s of STEPS) {
      const next = { x: cur.x + s.x, y: cur.y + s.y };
      if (isWalkable(walk, next) && !reach[next.y]![next.x]) {
        reach[next.y]![next.x] = true;
        queue.push(next);
      }
    }
  }
  return reach;
}
