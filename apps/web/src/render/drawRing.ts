import type { Graphics } from 'pixi.js';

/** Ring under the feet (character-local coordinates; not part of the hit silhouette). */
export const RING = { rx: 15, ry: 6.5, width: 2.5 } as const;

const drawnColor = new WeakMap<Graphics, number>();

/** Shows the ring in the agent color for the selected agent, or hides it (FR-027). */
export function drawRing(g: Graphics, color: number | null): void {
  g.visible = color !== null;
  if (color === null || drawnColor.get(g) === color) return;
  drawnColor.set(g, color);
  g.clear()
    .ellipse(0, 0, RING.rx, RING.ry)
    .fill({ color, alpha: 0.25 })
    .stroke({ color, width: RING.width });
}
