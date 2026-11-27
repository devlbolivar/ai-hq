import { gridToWorld, type Coord, type Point, type Size, type TileSize } from '@ai-hq/domain';

const ONE_TILE: Size = { w: 1, h: 1 };

/** `[x0, y0, x1, y1, …]`, the flat form Pixi's `poly` takes. */
export function flat(points: readonly Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y]);
}

/** World-space diamond (top, right, bottom, left) covering `size` tiles from `origin`. */
export function tileDiamond(origin: Coord, tile: TileSize, size: Size = ONE_TILE): Point[] {
  const at = (x: number, y: number) => gridToWorld({ x, y }, tile);
  const { x, y } = origin;
  return [at(x, y), at(x + size.w, y), at(x + size.w, y + size.h), at(x, y + size.h)];
}
