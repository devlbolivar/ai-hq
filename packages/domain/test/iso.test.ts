import { describe, expect, it } from 'vitest';
import { gridToWorld, tileCenter, worldToGrid } from '../src/iso';
import type { Coord } from '../src/types';

const GRID = { cols: 16, rows: 12 };

function allTiles(): Coord[] {
  const tiles: Coord[] = [];
  for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) tiles.push({ x, y });
  return tiles;
}

describe('gridToWorld', () => {
  it('maps tiles to the top vertex of their diamond (64x32 tiles)', () => {
    expect(gridToWorld({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(gridToWorld({ x: 1, y: 0 })).toEqual({ x: 32, y: 16 });
    expect(gridToWorld({ x: 0, y: 1 })).toEqual({ x: -32, y: 16 });
    expect(gridToWorld({ x: 15, y: 11 })).toEqual({ x: 128, y: 416 });
  });

  it('accepts a custom tile size', () => {
    expect(gridToWorld({ x: 1, y: 0 }, { width: 100, height: 50 })).toEqual({ x: 50, y: 25 });
  });
});

describe('tileCenter', () => {
  it('is the center of the tile diamond', () => {
    expect(tileCenter({ x: 0, y: 0 })).toEqual({ x: 0, y: 16 });
    expect(tileCenter({ x: 1, y: 0 })).toEqual({ x: 32, y: 32 });
  });
});

describe('worldToGrid', () => {
  it('round-trips the top vertex of all 192 tiles (FR-002)', () => {
    const tiles = allTiles();
    expect(tiles).toHaveLength(192);
    for (const t of tiles) expect(worldToGrid(gridToWorld(t), GRID)).toEqual(t);
  });

  it('round-trips the center of all 192 tiles', () => {
    for (const t of allTiles()) expect(worldToGrid(tileCenter(t), GRID)).toEqual(t);
  });

  it('returns null for points outside the grid (FR-003)', () => {
    expect(worldToGrid({ x: 0, y: -1 }, GRID)).toBeNull();
    expect(worldToGrid({ x: -400, y: 16 }, GRID)).toBeNull();
    expect(worldToGrid({ x: 600, y: 200 }, GRID)).toBeNull();
    expect(worldToGrid({ x: 128, y: 449 }, GRID)).toBeNull();
  });

  it('resolves a point on the border between two tiles with the floor rule', () => {
    // Midpoint of the edge shared by (0,0) and (1,0).
    expect(worldToGrid({ x: 16, y: 24 }, GRID)).toEqual({ x: 1, y: 0 });
    // Midpoint of the edge shared by (0,0) and (0,1).
    expect(worldToGrid({ x: -16, y: 24 }, GRID)).toEqual({ x: 0, y: 1 });
  });

  it('honours a custom tile size', () => {
    const size = { width: 100, height: 50 };
    expect(worldToGrid(gridToWorld({ x: 3, y: 4 }, size), GRID, size)).toEqual({ x: 3, y: 4 });
  });
});
