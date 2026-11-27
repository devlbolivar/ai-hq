import type { GridPosition } from '../agents/types';
import { DEFAULT_TILE } from '../iso';
import type { Point, TileSize } from '../types';

/** Body box in px at zoom 1, standing on the tile center (bubble and ring excluded, FR-023). */
export const CHARACTER_BODY = { width: 24, height: 52 } as const;

/** Tile center in world px for fractional tile coordinates (≡ `tileCenter` on integers). */
export function positionToWorld(pos: GridPosition, tileSize: TileSize = DEFAULT_TILE): Point {
  return {
    x: ((pos.x - pos.y) * tileSize.width) / 2,
    y: ((pos.x + pos.y) * tileSize.height) / 2 + tileSize.height / 2,
  };
}

/** Clockwise body rectangle in world px whose bottom edge is at the feet. */
export function characterSilhouette(pos: GridPosition, tileSize: TileSize = DEFAULT_TILE): Point[] {
  const feet = positionToWorld(pos, tileSize);
  const left = feet.x - CHARACTER_BODY.width / 2;
  const right = feet.x + CHARACTER_BODY.width / 2;
  const top = feet.y - CHARACTER_BODY.height;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: feet.y },
    { x: left, y: feet.y },
  ];
}
