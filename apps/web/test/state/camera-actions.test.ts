import { describe, expect, it } from 'vitest';
import { initialCamera, marketingLayout, pan, recenter, zoomAt, ZOOM_STEP } from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

describe('office store camera actions (FR-013–FR-016)', () => {
  it('panBy delegates to the domain pan and marks the camera as touched', () => {
    const store = createOfficeStore({ viewport });
    const start = store.getState().camera;
    store.getState().panBy({ x: 40, y: -25 });
    expect(store.getState().camera).toEqual(
      pan(start, { x: 40, y: -25 }, viewport, marketingLayout),
    );
    expect(store.getState().cameraTouched).toBe(true);
  });

  it('panBy keeps the office center inside the viewport', () => {
    const store = createOfficeStore({ viewport });
    const start = store.getState().camera;
    store.getState().panBy({ x: 10_000, y: 10_000 });
    expect(store.getState().camera).toEqual(
      pan(start, { x: 10_000, y: 10_000 }, viewport, marketingLayout),
    );
  });

  it('zoomAt delegates to the domain zoomAt and marks the camera as touched', () => {
    const store = createOfficeStore({ viewport });
    const start = store.getState().camera;
    const anchor = { x: 300, y: 200 };
    store.getState().zoomAt(anchor, ZOOM_STEP);
    expect(store.getState().camera).toEqual(
      zoomAt(start, anchor, ZOOM_STEP, viewport, marketingLayout),
    );
    expect(store.getState().cameraTouched).toBe(true);
  });

  it('recenter restores the initial camera and lets resizes re-center again', () => {
    const store = createOfficeStore({ viewport });
    store.getState().panBy({ x: 100, y: 50 });
    store.getState().zoomAt({ x: 10, y: 10 }, ZOOM_STEP);
    store.getState().recenter();
    expect(store.getState().camera).toEqual(recenter(viewport, marketingLayout));
    expect(store.getState().cameraTouched).toBe(false);

    const next = { width: 1600, height: 900 };
    store.getState().setViewport(next);
    expect(store.getState().camera).toEqual(initialCamera(next, marketingLayout));
  });

  it('setViewport clamps a moved camera to the new viewport', () => {
    const store = createOfficeStore({ viewport });
    store.getState().panBy({ x: 10_000, y: 10_000 });
    const moved = store.getState().camera;
    const smaller = { width: 640, height: 400 };
    store.getState().setViewport(smaller);
    expect(store.getState().camera).toEqual(pan(moved, { x: 0, y: 0 }, smaller, marketingLayout));
    expect(store.getState().camera).not.toEqual(moved);
  });
});
