import type { Coord, GridSize, Point, TileSize } from '../types';

export const DEFAULT_TILE: TileSize = { width: 64, height: 32 };

/** Top vertex of the tile diamond, in world px. */
export function gridToWorld(tile: Coord, tileSize: TileSize = DEFAULT_TILE): Point {
  return {
    x: ((tile.x - tile.y) * tileSize.width) / 2,
    y: ((tile.x + tile.y) * tileSize.height) / 2,
  };
}

/** Center of the tile diamond, in world px. */
export function tileCenter(tile: Coord, tileSize: TileSize = DEFAULT_TILE): Point {
  const top = gridToWorld(tile, tileSize);
  return { x: top.x, y: top.y + tileSize.height / 2 };
}

/** Tile containing a world point (floor rule on borders), or null outside the grid. */
export function worldToGrid(
  p: Point,
  grid: GridSize,
  tileSize: TileSize = DEFAULT_TILE,
): Coord | null {
  const u = p.x / tileSize.width;
  const v = p.y / tileSize.height;
  const x = Math.floor(v + u);
  const y = Math.floor(v - u);
  if (x < 0 || y < 0 || x >= grid.cols || y >= grid.rows) return null;
  return { x, y };
}
