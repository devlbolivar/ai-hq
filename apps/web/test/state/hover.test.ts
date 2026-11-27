import { describe, expect, it } from 'vitest';
import {
  hitTest,
  marketingLayout,
  screenToWorld,
  tileCenter,
  worldToScreen,
  type Coord,
  type Point,
} from '@ai-hq/domain';
import { createOfficeStore, type OfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

function screenOf(store: OfficeStore, tile: Coord): Point {
  return worldToScreen(store.getState().camera, tileCenter(tile, marketingLayout.tile));
}

describe('office store hover (FR-017–FR-019)', () => {
  it('starts without hover', () => {
    expect(createOfficeStore({ viewport }).getState().hover).toBeNull();
  });

  it('pointerMove over free floor hovers that tile', () => {
    const store = createOfficeStore({ viewport });
    store.getState().pointerMove(screenOf(store, { x: 9, y: 6 }));
    expect(store.getState().hover).toEqual({ type: 'tile', tile: { x: 9, y: 6 } });
  });

  it('pointerMove over an object hovers the object via camera + hitTest', () => {
    const store = createOfficeStore({ viewport });
    const point = screenOf(store, { x: 13, y: 3 });
    store.getState().pointerMove(point);
    expect(store.getState().hover).toEqual({ type: 'object', id: 'meeting-table' });
    expect(store.getState().hover).toEqual(
      hitTest(screenToWorld(store.getState().camera, point), marketingLayout),
    );
  });

  it('pointerMove outside the office clears the hover', () => {
    const store = createOfficeStore({ viewport });
    store.getState().pointerMove(screenOf(store, { x: 13, y: 3 }));
    store.getState().pointerMove({ x: 2, y: 2 });
    expect(store.getState().hover).toBeNull();
  });

  it('pointerLeave clears the hover', () => {
    const store = createOfficeStore({ viewport });
    store.getState().pointerMove(screenOf(store, { x: 13, y: 3 }));
    store.getState().pointerLeave();
    expect(store.getState().hover).toBeNull();
  });

  it('keeps the same hover reference while the target does not change', () => {
    const store = createOfficeStore({ viewport });
    const center = screenOf(store, { x: 9, y: 6 });
    store.getState().pointerMove(center);
    const first = store.getState().hover;
    store.getState().pointerMove({ x: center.x + 2, y: center.y + 1 });
    expect(store.getState().hover).toBe(first);
  });

  it('recomputes the hover when the camera moves under a still pointer', () => {
    const store = createOfficeStore({ viewport });
    const point = screenOf(store, { x: 9, y: 6 });
    store.getState().pointerMove(point);
    // Moving the content one tile down-right puts tile (8,6) under the pointer.
    store.getState().panBy({ x: 32, y: 16 });
    expect(store.getState().hover).toEqual({ type: 'tile', tile: { x: 8, y: 6 } });

    store.getState().zoomAt(point, 1.1);
    expect(store.getState().hover).toEqual(
      hitTest(screenToWorld(store.getState().camera, point), marketingLayout),
    );
  });

  it('camera moves after pointerLeave keep the hover cleared', () => {
    const store = createOfficeStore({ viewport });
    store.getState().pointerMove(screenOf(store, { x: 9, y: 6 }));
    store.getState().pointerLeave();
    store.getState().panBy({ x: 32, y: 16 });
    store.getState().recenter();
    expect(store.getState().hover).toBeNull();
  });
});
