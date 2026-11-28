import { describe, expect, it } from 'vitest';
import { initialCamera, officeCenter, worldToScreen } from '../../src/camera/core';
import { centerOn } from '../../src/camera/follow';
import { zoomAt } from '../../src/camera/ops';
import { tileCenter } from '../../src/iso';
import { marketingLayout } from '../../src/layout/marketing';

const viewport = { width: 1280, height: 800 };
const start = zoomAt(
  initialCamera(viewport, marketingLayout),
  { x: 100, y: 100 },
  1.5,
  viewport,
  marketingLayout,
);

describe('centerOn (FR-028)', () => {
  it('keeps the zoom and puts the world point at the viewport center', () => {
    const target = tileCenter({ x: 13, y: 7 });
    const cam = centerOn(start, target, viewport, marketingLayout);
    expect(cam.zoom).toBe(start.zoom);
    const onScreen = worldToScreen(cam, target);
    expect(onScreen.x).toBeCloseTo(viewport.width / 2, 6);
    expect(onScreen.y).toBeCloseTo(viewport.height / 2, 6);
  });

  it('stops at the camera limits of the 001 when the point is too far', () => {
    const small = { width: 300, height: 200 };
    const cam = centerOn(start, { x: 5000, y: -5000 }, small, marketingLayout);
    const center = worldToScreen(cam, officeCenter(marketingLayout));
    expect(center.x).toBeCloseTo(0, 6);
    expect(center.y).toBeCloseTo(small.height, 6);
  });
});
