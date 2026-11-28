import type { GridPosition } from '../agents/types';
import { DEFAULT_TILE, worldToGrid } from '../iso';
import type { OfficeLayout, Point, TileSize } from '../types';
import { containsPoint, silhouette } from './hitTest';
import { sceneOrder, type CharacterPlacement, type SceneHoverTarget } from './sceneOrder';

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

/**
 * Front-most object or character body under a world point, then the floor tile (FR-023): walks
 * `sceneOrder` from front to back, so hover and click use the same order as the drawing.
 */
export function sceneHitTest(
  worldPoint: Point,
  layout: OfficeLayout,
  characters: readonly CharacterPlacement[],
): SceneHoverTarget {
  const objects = new Map(layout.objects.map((obj) => [obj.id, obj]));
  const people = new Map(characters.map((c) => [c.id, c]));
  for (const item of sceneOrder(layout, characters).reverse()) {
    const polygon =
      item.type === 'object'
        ? silhouette(objects.get(item.id)!, layout.tile)
        : characterSilhouette(people.get(item.id)!.position, layout.tile);
    if (containsPoint(polygon, worldPoint)) return { type: item.type, id: item.id };
  }
  const tile = worldToGrid(worldPoint, layout.grid, layout.tile);
  return tile ? { type: 'tile', tile } : null;
}
