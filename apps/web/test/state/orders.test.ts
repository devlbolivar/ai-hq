import { describe, expect, it } from 'vitest';
import { applyOrder, cancelForcedOrders } from '@ai-hq/domain';
import { createOfficeStore, NOTICE_MS } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };
const meeting = { type: 'activity', activity: 'meeting' } as const;
const review = { type: 'activity', activity: 'review' } as const;

function debugStore(paused = false) {
  const store = createOfficeStore({ viewport, seed: 1, paused });
  store.getState().toggleDebug();
  return store;
}

describe('orders from the store (FR-020, FR-034)', () => {
  it('applies an order through applyOrder and returns its result', () => {
    const store = debugStore();
    const { sim, world } = store.getState();
    const expected = applyOrder(sim, world, 'copywriter', meeting);
    expect(store.getState().sendOrder('copywriter', meeting)).toEqual(expected.result);
    expect(store.getState().sim).toEqual(expected.sim);
  });

  it('shows "Sin sitio libre" when there is no free point and clears it after a while', () => {
    const store = debugStore();
    store.getState().sendOrder('copywriter', review);
    const result = store.getState().sendOrder('designer', review);
    expect(result).toEqual({ ok: false, reason: 'NO_FREE_SPOT' });
    expect(store.getState().notice?.message).toBe('Sin sitio libre');
    store.getState().tick(NOTICE_MS - 16);
    expect(store.getState().notice).not.toBeNull();
    store.getState().tick(32);
    expect(store.getState().notice).toBeNull();
  });

  it('queues orders while paused and applies them in arrival order on resume', () => {
    const store = debugStore(true);
    const { sim, world } = store.getState();
    expect(store.getState().sendOrder('copywriter', review)).toBeNull();
    store.getState().sendOrder('designer', review);
    expect(store.getState().queuedOrders).toHaveLength(2);
    expect(store.getState().sim).toBe(sim);
    store.getState().togglePause();
    const first = applyOrder(sim, world, 'copywriter', review);
    const second = applyOrder(first.sim, world, 'designer', review);
    expect(store.getState().sim).toEqual(second.sim);
    expect(store.getState().queuedOrders).toEqual([]);
    expect(store.getState().notice?.message).toBe('Sin sitio libre');
  });

  it('cancels forced orders when debug mode is turned off', () => {
    const store = debugStore();
    store.getState().sendOrder('copywriter', meeting);
    const { sim, world } = store.getState();
    store.getState().toggleDebug();
    expect(store.getState().sim).toEqual(cancelForcedOrders(sim, world));
  });

  it('while paused, turning debug off drops queued orders and cancels on resume (FR-020)', () => {
    const store = debugStore();
    store.getState().sendOrder('copywriter', meeting);
    const { sim, world } = store.getState();
    store.getState().togglePause();
    store.getState().sendOrder('designer', meeting);
    store.getState().toggleDebug();
    // Frozen: nothing changes until the simulation resumes.
    expect(store.getState().sim).toBe(sim);
    expect(store.getState().queuedOrders.map((q) => q.agentId)).toEqual(['copywriter']);
    store.getState().togglePause();
    expect(store.getState().sim).toEqual(cancelForcedOrders(sim, world));
    expect(store.getState().queuedOrders).toEqual([]);
  });
});
