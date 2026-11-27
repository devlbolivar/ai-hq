import { describe, expect, it } from 'vitest';
import { findPath, marketingLayout, walkability, type Coord } from '@ai-hq/domain';
import { createOfficeStore, IDLE_DEBUG } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };
const entrance = marketingLayout.entrance;
const desk4Chair: Coord = { x: 3, y: 9 };
const walk = walkability(marketingLayout);

function debugStore() {
  const store = createOfficeStore({ viewport });
  store.getState().toggleDebug();
  return store;
}

describe('office store debug slice (data-model.md "Estado de UI", FR-023)', () => {
  it('starts disabled without selection', () => {
    expect(createOfficeStore({ viewport }).getState().debug).toEqual({
      enabled: false,
      from: null,
      to: null,
      result: null,
    });
    expect(IDLE_DEBUG).toEqual({ enabled: false, from: null, to: null, result: null });
  });

  it('toggleDebug enables it with no selection, and toggles back', () => {
    const store = createOfficeStore({ viewport });
    store.getState().toggleDebug();
    expect(store.getState().debug).toEqual({ enabled: true, from: null, to: null, result: null });
    store.getState().toggleDebug();
    expect(store.getState().debug).toEqual(IDLE_DEBUG);
  });

  it('ignores tile selection while disabled', () => {
    const store = createOfficeStore({ viewport });
    const before = store.getState().debug;
    store.getState().selectTile(entrance);
    expect(store.getState().debug).toBe(before);
  });

  it('the first click sets the origin', () => {
    const store = debugStore();
    store.getState().selectTile(entrance);
    expect(store.getState().debug).toEqual({
      enabled: true,
      from: entrance,
      to: null,
      result: null,
    });
  });

  it('the second click sets the destination and computes the route with findPath', () => {
    const store = debugStore();
    store.getState().selectTile(entrance);
    store.getState().selectTile(desk4Chair);
    const { debug } = store.getState();
    expect(debug.to).toEqual(desk4Chair);
    expect(debug.result).toEqual(findPath(walk, entrance, desk4Chair));
    expect(debug.result).toMatchObject({ ok: true });
  });

  it('a blocked destination yields a failed result ("Sin ruta")', () => {
    const desk = marketingLayout.objects.find((o) => o.id === 'desk-1')?.origin;
    if (!desk) throw new Error('desk-1 missing');
    const store = debugStore();
    store.getState().selectTile(entrance);
    store.getState().selectTile(desk);
    expect(store.getState().debug.result).toEqual({ ok: false, reason: 'blocked' });
  });

  it('the third click restarts with a new origin', () => {
    const store = debugStore();
    store.getState().selectTile(entrance);
    store.getState().selectTile(desk4Chair);
    store.getState().selectTile({ x: 9, y: 6 });
    expect(store.getState().debug).toEqual({
      enabled: true,
      from: { x: 9, y: 6 },
      to: null,
      result: null,
    });
  });

  it('disabling clears origin, destination and result (US4 escenario 6)', () => {
    const store = debugStore();
    store.getState().selectTile(entrance);
    store.getState().selectTile(desk4Chair);
    store.getState().toggleDebug();
    expect(store.getState().debug).toEqual(IDLE_DEBUG);
    store.getState().toggleDebug();
    expect(store.getState().debug).toEqual({ enabled: true, from: null, to: null, result: null });
  });

  it('copies the selected tiles instead of keeping the caller objects', () => {
    const store = debugStore();
    const from = { x: 8, y: 11 };
    store.getState().selectTile(from);
    from.x = 0;
    expect(store.getState().debug.from).toEqual(entrance);
  });
});
