import type { Graphics } from 'pixi.js';
import {
  characterSilhouette,
  silhouette,
  type CharacterPlacement,
  type OfficeLayout,
  type Point,
  type SceneHoverTarget,
} from '@ai-hq/domain';
import { flat, tileDiamond } from './geometry';
import { theme } from './palette';

/** World-space shapes of the hover highlight. */
export interface HoverHighlight {
  /** Diamond covering every hovered tile: the tile itself, or the object's whole footprint. */
  readonly footprint: Point[];
  /** Full silhouette of the hovered object or character body (null for a floor tile). */
  readonly outline: Point[] | null;
}

/**
 * What to highlight for `hover` (FR-017–FR-019); null when nothing is under the cursor. A
 * character highlights its body and the tile it last reached.
 */
export function hoverHighlight(
  hover: SceneHoverTarget,
  layout: OfficeLayout,
  characters: readonly CharacterPlacement[] = [],
): HoverHighlight | null {
  if (hover === null) return null;
  if (hover.type === 'tile') {
    return { footprint: tileDiamond(hover.tile, layout.tile), outline: null };
  }
  if (hover.type === 'agent') {
    const placement = characters.find((c) => c.id === hover.id);
    if (!placement) return null;
    return {
      footprint: tileDiamond(placement.tile, layout.tile),
      outline: characterSilhouette(placement.position, layout.tile),
    };
  }
  const obj = layout.objects.find((o) => o.id === hover.id);
  if (!obj) return null;
  return {
    footprint: tileDiamond(obj.origin, layout.tile, obj.size),
    outline: silhouette(obj, layout.tile),
  };
}

/** Redraws `g` (in the overlay layer, above the objects) with the highlight for `hover`. */
export function drawOverlay(
  g: Graphics,
  hover: SceneHoverTarget,
  layout: OfficeLayout,
  characters: readonly CharacterPlacement[] = [],
): void {
  g.clear();
  const highlight = hoverHighlight(hover, layout, characters);
  if (!highlight) return;
  const { line, fill, footprintAlpha, outlineAlpha } = theme.hover;
  const stroke = { color: line, width: 1.5, alignment: 0.5 };
  if (highlight.outline) {
    g.poly(flat(highlight.outline)).fill({ color: fill, alpha: outlineAlpha }).stroke(stroke);
  }
  g.poly(flat(highlight.footprint)).fill({ color: fill, alpha: footprintAlpha }).stroke(stroke);
}
