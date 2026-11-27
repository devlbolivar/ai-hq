import type { Graphics } from 'pixi.js';
import {
  gridToWorld,
  silhouette,
  type HoverTarget,
  type OfficeLayout,
  type Point,
} from '@ai-hq/domain';
import { theme } from './palette';

/** World-space shapes of the hover highlight. */
export interface HoverHighlight {
  /** Diamond covering every hovered tile: the tile itself, or the object's whole footprint. */
  readonly footprint: Point[];
  /** Full silhouette of the hovered object (null for a floor tile). */
  readonly outline: Point[] | null;
}

/** What to highlight for `hover` (FR-017–FR-019); null when nothing is under the cursor. */
export function hoverHighlight(hover: HoverTarget, layout: OfficeLayout): HoverHighlight | null {
  if (hover === null) return null;
  if (hover.type === 'tile') {
    return { footprint: diamond(hover.tile, { w: 1, h: 1 }, layout), outline: null };
  }
  const obj = layout.objects.find((o) => o.id === hover.id);
  if (!obj) return null;
  return {
    footprint: diamond(obj.origin, obj.size, layout),
    outline: silhouette(obj, layout.tile),
  };
}

function diamond(
  origin: { x: number; y: number },
  size: { w: number; h: number },
  layout: OfficeLayout,
): Point[] {
  const at = (x: number, y: number) => gridToWorld({ x, y }, layout.tile);
  const { x, y } = origin;
  return [at(x, y), at(x + size.w, y), at(x + size.w, y + size.h), at(x, y + size.h)];
}

const flat = (points: readonly Point[]): number[] => points.flatMap((p) => [p.x, p.y]);

/** Redraws `g` (in the overlay layer, above the objects) with the highlight for `hover`. */
export function drawOverlay(g: Graphics, hover: HoverTarget, layout: OfficeLayout): void {
  g.clear();
  const highlight = hoverHighlight(hover, layout);
  if (!highlight) return;
  const { line, fill, footprintAlpha, outlineAlpha } = theme.hover;
  const stroke = { color: line, width: 1.5, alignment: 0.5 };
  if (highlight.outline) {
    g.poly(flat(highlight.outline)).fill({ color: fill, alpha: outlineAlpha }).stroke(stroke);
  }
  g.poly(flat(highlight.footprint)).fill({ color: fill, alpha: footprintAlpha }).stroke(stroke);
}
