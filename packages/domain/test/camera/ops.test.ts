import { describe, expect, it } from 'vitest';
import { initialCamera, officeCenter, screenToWorld, worldToScreen } from '../../src/camera/core';
import { pan, recenter, zoomAt, ZOOM_MAX, ZOOM_MIN, ZOOM_STEP } from '../../src/camera/ops';
import { marketingLayout } from '../../src/layout/marketing';

const layout = marketingLayout;
const viewport = { width: 800, height: 600 };
const camera = initialCamera(viewport, layout);
const center = officeCenter(layout);

describe('camera operations', () => {
  it('adds the screen delta without changing the input camera or zoom', () => {
    const delta = { x: 40, y: -30 };
    expect(pan(camera, delta, viewport, layout)).toEqual({
      zoom: camera.zoom,
      offset: { x: camera.offset.x + delta.x, y: camera.offset.y + delta.y },
    });
    expect(camera).toEqual(initialCamera(viewport, layout));
  });

  it.each([
    [
      { x: -10_000, y: 10_000 },
      { x: 0, y: viewport.height },
    ],
    [
      { x: 10_000, y: -10_000 },
      { x: viewport.width, y: 0 },
    ],
  ])('clamps a large pan to the viewport edges', (delta, expectedCenter) => {
    expect(worldToScreen(pan(camera, delta, viewport, layout), center)).toEqual(expectedCenter);
  });

  it('zooms multiplicatively around the world point under the anchor', () => {
    const anchor = { x: 250, y: 150 };
    const startingCamera = zoomAt(camera, anchor, 1.25, viewport, layout);
    const world = screenToWorld(startingCamera, anchor);
    const result = zoomAt(startingCamera, anchor, ZOOM_STEP, viewport, layout);

    expect(ZOOM_STEP).toBe(1.1);
    expect(result.zoom).toBe(1.375);
    const projected = worldToScreen(result, world);
    expect(projected.x).toBeCloseTo(anchor.x);
    expect(projected.y).toBeCloseTo(anchor.y);
  });

  it.each([
    [10, 2],
    [0.01, 0.5],
  ])('clamps zoom factor %s to zoom %s', (factor, expectedZoom) => {
    expect(zoomAt(camera, { x: 400, y: 300 }, factor, viewport, layout).zoom).toBe(expectedZoom);
    expect([ZOOM_MIN, ZOOM_MAX]).toEqual([0.5, 2]);
  });

  it('clamps the office center when preserving the zoom anchor would move it outside', () => {
    const edgeCamera = pan(camera, { x: -10_000, y: 10_000 }, viewport, layout);
    const result = zoomAt(edgeCamera, { x: 400, y: 300 }, ZOOM_STEP, viewport, layout);
    expect(result.zoom).toBe(ZOOM_STEP);
    expect(worldToScreen(result, center)).toEqual({ x: 0, y: viewport.height });
  });

  it('recenters the office at zoom 1 using the current viewport', () => {
    const smallerViewport = { width: 320, height: 240 };
    const result = recenter(smallerViewport, layout);
    expect(result).toEqual(initialCamera(smallerViewport, layout));
    expect(worldToScreen(result, center)).toEqual({ x: 160, y: 120 });
  });
});
