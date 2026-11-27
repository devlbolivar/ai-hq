import { Graphics } from 'pixi.js';
import { gridToWorld, type OfficeLayout, type Point } from '@ai-hq/domain';
import { flat, tileDiamond } from './geometry';
import { theme } from './palette';

const down = (p: Point, dy: number): Point => ({ x: p.x, y: p.y + dy });

/**
 * Floor of the office in world coordinates: one diamond per tile (subtle checker) plus the
 * extruded front edge that delimits the open front of the office (FR-005a). Static: the caller
 * caches it as a texture (research R2).
 */
export function drawFloor(layout: OfficeLayout): Graphics {
  const { cols, rows } = layout.grid;
  const tile = layout.tile;
  const at = (x: number, y: number) => gridToWorld({ x, y }, tile);
  const g = new Graphics();

  const left = at(0, rows);
  const bottom = at(cols, rows);
  const right = at(cols, 0);
  const depth = theme.floor.edgeDepth;
  g.poly(flat([left, bottom, down(bottom, depth), down(left, depth)])).fill(theme.floor.edgeLeft);
  g.poly(flat([bottom, right, down(right, depth), down(bottom, depth)])).fill(
    theme.floor.edgeRight,
  );

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      g.poly(flat(tileDiamond({ x, y }, tile)))
        .fill((x + y) % 2 === 0 ? theme.floor.top : theme.floor.alt)
        .stroke({ color: theme.floor.line, width: 1, alignment: 0.5 });
    }
  }

  return g;
}
