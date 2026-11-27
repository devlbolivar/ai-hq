import type { Graphics } from 'pixi.js';
import {
  tileCenter,
  walkability,
  type Coord,
  type Direction,
  type OfficeLayout,
  type Point,
} from '@ai-hq/domain';
import type { DebugState } from '../state/store';
import { flat, tileDiamond } from './geometry';
import { theme } from './palette';

/** A use point drawn as an arrow from its tile center towards where the person faces. */
export interface UsePointArrow {
  readonly tile: Coord;
  readonly from: Point;
  readonly to: Point;
}

/** World-space shapes of the debug overlay (FR-023). */
export interface DebugOverlayShapes {
  /** Diamond of every walkable tile. */
  readonly walkable: Point[][];
  readonly entrance: Point[];
  readonly usePoints: UsePointArrow[];
  /** Diamond of the picked origin, once picked. */
  readonly from: Point[] | null;
  /** Diamond of the picked destination and whether a route reaches it. */
  readonly to: { readonly tile: Point[]; readonly reachable: boolean } | null;
  /** Tile centers along the route, when there is one. */
  readonly path: Point[] | null;
}

const FACING: Readonly<Record<Direction, Coord>> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
};

/** Fraction of the way to the faced neighbor's center where the arrow tip lands. */
const ARROW_REACH = 0.45;

function arrow(tile: Coord, facing: Direction, layout: OfficeLayout): UsePointArrow {
  const step = FACING[facing];
  const from = tileCenter(tile, layout.tile);
  const ahead = tileCenter({ x: tile.x + step.x, y: tile.y + step.y }, layout.tile);
  return {
    tile,
    from,
    to: {
      x: from.x + (ahead.x - from.x) * ARROW_REACH,
      y: from.y + (ahead.y - from.y) * ARROW_REACH,
    },
  };
}

/** What the debug overlay shows for `debug`; null while debug mode is off (US4 escenario 6). */
export function debugOverlay(debug: DebugState, layout: OfficeLayout): DebugOverlayShapes | null {
  if (!debug.enabled) return null;
  const walk = walkability(layout);
  const walkable: Point[][] = [];
  walk.forEach((row, y) =>
    row.forEach((free, x) => {
      if (free) walkable.push(tileDiamond({ x, y }, layout.tile));
    }),
  );
  const { result } = debug;
  return {
    walkable,
    entrance: tileDiamond(layout.entrance, layout.tile),
    usePoints: layout.objects.flatMap((o) =>
      o.usePoints.map((u) => arrow(u.tile, u.facing, layout)),
    ),
    from: debug.from ? tileDiamond(debug.from, layout.tile) : null,
    to: debug.to
      ? { tile: tileDiamond(debug.to, layout.tile), reachable: result?.ok === true }
      : null,
    path: result?.ok ? result.path.map((t) => tileCenter(t, layout.tile)) : null,
  };
}

/** Arrow head: two short strokes back from `to`, at ±30° from the shaft. */
function arrowHead({ from, to }: UsePointArrow): number[] {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 5;
  const wing = (offset: number) => ({
    x: to.x - size * Math.cos(angle + offset),
    y: to.y - size * Math.sin(angle + offset),
  });
  return flat([wing(Math.PI / 6), to, wing(-Math.PI / 6)]);
}

/** Redraws `g` (overlay layer, under the hover highlight) with the debug overlay for `debug`. */
export function drawDebugOverlay(g: Graphics, debug: DebugState, layout: OfficeLayout): void {
  g.clear();
  const shapes = debugOverlay(debug, layout);
  if (!shapes) return;
  const t = theme.debug;

  for (const tile of shapes.walkable) {
    g.poly(flat(tile))
      .fill({ color: t.walkable, alpha: t.walkableAlpha })
      .stroke({ color: t.walkable, width: 0.75, alpha: t.walkableLineAlpha });
  }
  g.poly(flat(shapes.entrance))
    .fill({ color: t.entrance, alpha: 0.45 })
    .stroke({ color: t.entrance, width: 1.5 });

  for (const u of shapes.usePoints) {
    g.circle(u.from.x, u.from.y, 1.25).fill({ color: t.usePoint });
    g.moveTo(u.from.x, u.from.y)
      .lineTo(u.to.x, u.to.y)
      .stroke({ color: t.usePoint, width: 1.5, cap: 'round' });
    g.poly(arrowHead(u), false).stroke({ color: t.usePoint, width: 1.5, cap: 'round' });
  }

  if (shapes.path) {
    const [first, ...rest] = shapes.path;
    if (first) {
      g.moveTo(first.x, first.y);
      for (const p of rest) g.lineTo(p.x, p.y);
      g.stroke({ color: t.path, width: 3, cap: 'round', join: 'round' });
    }
  }
  if (shapes.from) {
    g.poly(flat(shapes.from))
      .fill({ color: t.path, alpha: 0.35 })
      .stroke({ color: t.path, width: 2 });
  }
  if (shapes.to) {
    const color = shapes.to.reachable ? t.path : t.noPath;
    g.poly(flat(shapes.to.tile)).fill({ color, alpha: 0.35 }).stroke({ color, width: 2 });
  }
}
