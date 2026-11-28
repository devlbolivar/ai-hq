import { describe, expect, it } from 'vitest';
import {
  agentPosition,
  CHARACTER_BODY,
  hitTest,
  marketingLayout,
  positionToWorld,
  sceneHitTest,
  screenToWorld,
  tileCenter,
  worldToScreen,
  type Coord,
  type Point,
} from '@ai-hq/domain';
import { characterPlacements, createOfficeStore, type OfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

function screenOf(store: OfficeStore, tile: Coord): Point {
  return worldToScreen(store.getState().camera, tileCenter(tile, marketingLayout.tile));
}

/** Screen point at the middle of an agent's body. */
function bodyOf(store: OfficeStore, id: string): Point {
  const { camera, sim } = store.getState();
  const agent = sim.agents.find((a) => a.id === id)!;
  const feet = positionToWorld(agentPosition(agent), marketingLayout.tile);
  return worldToScreen(camera, { x: feet.x, y: feet.y - CHARACTER_BODY.height / 2 });
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

  describe('characters (FR-023, data-model.md OfficeState.hover)', () => {
    it('pointerMove over an agent body hovers the agent via sceneHitTest', () => {
      const store = createOfficeStore({ viewport, paused: true });
      const point = bodyOf(store, 'head-of-marketing');
      store.getState().pointerMove(point);
      expect(store.getState().hover).toEqual({ type: 'agent', id: 'head-of-marketing' });
      const { camera, sim } = store.getState();
      expect(store.getState().hover).toEqual(
        sceneHitTest(screenToWorld(camera, point), marketingLayout, characterPlacements(sim)),
      );
    });

    it('the seated agent wins over the chair under it', () => {
      const store = createOfficeStore({ viewport, paused: true });
      const { camera, sim } = store.getState();
      const agent = sim.agents.find((a) => a.id === 'head-of-marketing')!;
      const feet = positionToWorld(agentPosition(agent), marketingLayout.tile);
      // Just above the feet, inside the chair: without the agent the chair wins.
      const world = { x: feet.x, y: feet.y - 6 };
      expect(hitTest(world, marketingLayout)).toEqual({ type: 'object', id: 'chair-1' });
      store.getState().pointerMove(worldToScreen(camera, world));
      expect(store.getState().hover).toEqual({ type: 'agent', id: 'head-of-marketing' });
    });

    it('is recomputed when agents move under a still pointer', () => {
      const store = createOfficeStore({ viewport, paused: true });
      store.getState().pointerMove(bodyOf(store, 'designer'));
      expect(store.getState().hover).toEqual({ type: 'agent', id: 'designer' });

      store.getState().togglePause();
      store.getState().toggleDebug();
      expect(
        store.getState().sendOrder('designer', { type: 'go-to', tile: { x: 12, y: 9 } }),
      ).toEqual(expect.objectContaining({ ok: true }));
      for (let i = 0; i < 40; i++) store.getState().tick(100);
      expect(store.getState().hover).not.toEqual({ type: 'agent', id: 'designer' });
    });

    it('keeps the same hover reference across ticks while the target does not change', () => {
      const store = createOfficeStore({ viewport, paused: true });
      store.getState().pointerMove(bodyOf(store, 'designer'));
      const first = store.getState().hover;
      store.getState().togglePause();
      store.getState().tick(50);
      store.getState().tick(50);
      expect(store.getState().hover).toBe(first);
    });

    it('ticks without a pointer keep the hover cleared', () => {
      const store = createOfficeStore({ viewport });
      store.getState().tick(500);
      expect(store.getState().hover).toBeNull();
    });
  });
});
