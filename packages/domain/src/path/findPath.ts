import { isWalkable } from '../scene/walkability';
import type { Coord, PathResult, WalkabilityGrid } from '../types';

const STEPS: readonly Coord[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

interface SearchNode {
  tile: Coord;
  cost: number;
  remaining: number;
  previous: SearchNode | null;
}

function key(tile: Coord): string {
  return `${tile.x},${tile.y}`;
}

function distance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function comesBefore(a: SearchNode, b: SearchNode): boolean {
  const aTotal = a.cost + a.remaining;
  const bTotal = b.cost + b.remaining;
  return aTotal < bTotal || (aTotal === bTotal && a.remaining < b.remaining);
}

export function findPath(walk: WalkabilityGrid, from: Coord, to: Coord): PathResult {
  if (walk[from.y]?.[from.x] === undefined || walk[to.y]?.[to.x] === undefined) {
    return { ok: false, reason: 'out-of-bounds' };
  }
  if (!isWalkable(walk, from) || !isWalkable(walk, to)) {
    return { ok: false, reason: 'blocked' };
  }

  const start = { tile: from, cost: 0, remaining: distance(from, to), previous: null };
  const open: SearchNode[] = [start];
  const bestCost = new Map([[key(from), 0]]);

  while (open.length > 0) {
    // The first node wins equal priorities because entries are appended in discovery order.
    let bestIndex = 0;
    for (let index = 1; index < open.length; index++) {
      if (comesBefore(open[index]!, open[bestIndex]!)) bestIndex = index;
    }

    const current = open.splice(bestIndex, 1)[0]!;
    if (current.cost !== bestCost.get(key(current.tile))) continue;
    if (current.remaining === 0) {
      const path: Coord[] = [];
      for (let node: SearchNode | null = current; node; node = node.previous) {
        path.push(node.tile);
      }
      return { ok: true, path: path.reverse() };
    }

    const cost = current.cost + 1;
    for (const step of STEPS) {
      const tile = { x: current.tile.x + step.x, y: current.tile.y + step.y };
      if (!isWalkable(walk, tile)) continue;
      const tileKey = key(tile);
      if (cost >= (bestCost.get(tileKey) ?? Infinity)) continue;

      bestCost.set(tileKey, cost);
      open.push({ tile, cost, remaining: distance(tile, to), previous: current });
    }
  }

  return { ok: false, reason: 'unreachable' };
}
