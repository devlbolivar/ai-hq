import { describe, expect, it } from 'vitest';
import {
  agentPosition,
  CHARACTER_BODY,
  marketingLayout,
  positionToWorld,
  tileCenter,
  worldToScreen,
  type Coord,
  type Point,
} from '@ai-hq/domain';
import { createOfficeStore, type OfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

function storeWith({ debug = false } = {}): OfficeStore {
  const store = createOfficeStore({ viewport, paused: true });
  if (debug) store.getState().toggleDebug();
  return store;
}

function screenOf(store: OfficeStore, tile: Coord): Point {
  return worldToScreen(store.getState().camera, tileCenter(tile, marketingLayout.tile));
}

function bodyOf(store: OfficeStore, id: string): Point {
  const { camera, sim } = store.getState();
  const agent = sim.agents.find((a) => a.id === id)!;
  const feet = positionToWorld(agentPosition(agent), marketingLayout.tile);
  return worldToScreen(camera, { x: feet.x, y: feet.y - CHARACTER_BODY.height / 2 });
}

describe('office store clickAt (FR-026, US2-1, US2-8, US2-10)', () => {
  it('a click on a character selects it and starts following', () => {
    const store = storeWith();
    store.getState().clickAt(bodyOf(store, 'copywriter'));
    expect(store.getState().selection).toEqual({ agentId: 'copywriter', following: true });
  });

  it('with debug on, a click on a character selects it and picks no tile', () => {
    const store = storeWith({ debug: true });
    store.getState().clickAt(bodyOf(store, 'designer'));
    expect(store.getState().selection.agentId).toBe('designer');
    expect(store.getState().debug).toEqual({ enabled: true, from: null, to: null, result: null });
  });

  it('without debug, a click on the floor, an object or outside the office deselects', () => {
    const store = storeWith();
    for (const point of [
      screenOf(store, { x: 9, y: 6 }),
      screenOf(store, { x: 13, y: 3 }),
      { x: 3, y: 3 },
    ]) {
      store.getState().select('trend-scout');
      store.getState().clickAt(point);
      expect(store.getState().selection).toEqual({ agentId: null, following: false });
    }
  });

  it('with debug on, a click elsewhere picks the floor tile (001) and keeps the selection', () => {
    const store = storeWith({ debug: true });
    store.getState().select('trend-scout');
    store.getState().clickAt(screenOf(store, marketingLayout.entrance));
    expect(store.getState().debug.from).toEqual(marketingLayout.entrance);
    // A desk tile is picked through the floor plane too: the route there is blocked.
    store.getState().clickAt(screenOf(store, { x: 3, y: 5 }));
    expect(store.getState().debug.to).toEqual({ x: 3, y: 5 });
    expect(store.getState().debug.result).toEqual({ ok: false, reason: 'blocked' });
    expect(store.getState().selection.agentId).toBe('trend-scout');
  });

  it('with debug on, a click outside the grid picks nothing and keeps the selection', () => {
    const store = storeWith({ debug: true });
    store.getState().select('trend-scout');
    store.getState().clickAt({ x: 3, y: 3 });
    expect(store.getState().debug.from).toBeNull();
    expect(store.getState().selection.agentId).toBe('trend-scout');
  });
});
