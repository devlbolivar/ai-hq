import { describe, expect, it } from 'vitest';
import { Graphics } from 'pixi.js';
import { CHARACTER_BODY } from '@ai-hq/domain';
import { drawRing, RING } from '../../src/render/drawRing';

describe('selection ring (FR-027)', () => {
  it('is an ellipse under the feet, a bit wider than the body', () => {
    expect(RING.rx * 2).toBeGreaterThan(CHARACTER_BODY.width);
    expect(RING.ry).toBeLessThan(RING.rx);
  });

  it('shows the ring in the agent color only for the selected agent', () => {
    const g = new Graphics();
    drawRing(g, 0xff8a65);
    expect(g.visible).toBe(true);
    expect(g.context.instructions.length).toBeGreaterThan(0);
    drawRing(g, null);
    expect(g.visible).toBe(false);
  });

  it('does not redraw when the color does not change', () => {
    const g = new Graphics();
    drawRing(g, 0xff8a65);
    const count = g.context.instructions.length;
    drawRing(g, 0xff8a65);
    expect(g.context.instructions.length).toBe(count);
  });
});
