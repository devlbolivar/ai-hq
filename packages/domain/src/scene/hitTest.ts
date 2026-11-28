import { DEFAULT_TILE, gridToWorld, worldToGrid } from '../iso';
import type { HoverTarget, OfficeLayout, OfficeObject, Point, TileSize } from '../types';
import { drawOrder } from './drawOrder';

/** Clockwise in world coordinates, starting at the top vertex of the roof. */
export function silhouette(obj: OfficeObject, tileSize: TileSize = DEFAULT_TILE): Point[] {
  const { origin, size, z, height } = obj;
  const { x, y } = origin;
  const xEnd = x + size.w;
  const yEnd = y + size.h;

  const top = gridToWorld(origin, tileSize);
  const right = gridToWorld({ x: xEnd, y }, tileSize);
  const bottom = gridToWorld({ x: xEnd, y: yEnd }, tileSize);
  const left = gridToWorld({ x, y: yEnd }, tileSize);
  const base = [right, bottom, left].map((point) => ({ x: point.x, y: point.y - z }));
  const roofZ = z + height;
  const roofTop = { x: top.x, y: top.y - roofZ };

  if (height === 0) return [roofTop, ...base];

  return [roofTop, { x: right.x, y: right.y - roofZ }, ...base, { x: left.x, y: left.y - roofZ }];
}

/** Point-in-convex-polygon for clockwise polygons, edges included. */
export function containsPoint(polygon: Point[], point: Point): boolean {
  let previous = polygon[polygon.length - 1]!;
  return polygon.every((vertex) => {
    const cross =
      (vertex.x - previous.x) * (point.y - previous.y) -
      (vertex.y - previous.y) * (point.x - previous.x);
    previous = vertex;
    return cross >= 0;
  });
}

/** Hits the frontmost silhouette, including its edges and vertices, then tries the floor. */
export function hitTest(worldPoint: Point, layout: OfficeLayout): HoverTarget {
  const objectsById = new Map(layout.objects.map((obj) => [obj.id, obj]));
  for (const id of drawOrder(layout).reverse()) {
    const obj = objectsById.get(id)!;
    if (containsPoint(silhouette(obj, layout.tile), worldPoint)) return { type: 'object', id };
  }

  const tile = worldToGrid(worldPoint, layout.grid, layout.tile);
  return tile ? { type: 'tile', tile } : null;
}
