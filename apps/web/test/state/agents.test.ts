import { describe, expect, it } from 'vitest';
import {
  advanceFrame,
  createSimulation,
  createSimWorld,
  marketingLayout,
  marketingTeam,
} from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

describe('store with the agent simulation (data-model.md "Estado de la web")', () => {
  it('holds the seed team, its world and the simulation created from the seed', () => {
    const store = createOfficeStore({ viewport, seed: 7 });
    const state = store.getState();
    expect(state.team).toBe(marketingTeam);
    expect(state.seed).toBe(7);
    expect(state.world).toEqual(createSimWorld(marketingLayout, marketingTeam));
    expect(state.sim).toEqual(createSimulation(state.world, 7));
    expect(state.accumulatorMs).toBe(0);
    expect(state.paused).toBe(false);
  });

  it('advances the simulation with the fixed-step clock on tick', () => {
    const store = createOfficeStore({ viewport, seed: 7 });
    const { world, sim } = store.getState();
    store.getState().tick(16);
    store.getState().tick(16);
    const first = advanceFrame(sim, world, 0, 16);
    const expected = advanceFrame(first.sim, world, first.accumulatorMs, 16);
    expect(store.getState().sim).toEqual(expected.sim);
    expect(store.getState().accumulatorMs).toBe(expected.accumulatorMs);
  });

  it('does not advance while paused, and can start paused', () => {
    const store = createOfficeStore({ viewport, seed: 7, paused: true });
    const before = store.getState().sim;
    store.getState().tick(100);
    expect(store.getState().paused).toBe(true);
    expect(store.getState().sim).toBe(before);
  });

  it('throws with the validation messages when the team is invalid', () => {
    const team = marketingTeam.map((p, i) => (i === 1 ? { ...p, deskId: 'desk-1' } : p));
    expect(() => createOfficeStore({ viewport, team })).toThrow(/trend-scout.*deskId/s);
  });
});

describe('pause (FR-020, US3-8)', () => {
  it('togglePause freezes the simulation and resumes from the same state', () => {
    const store = createOfficeStore({ viewport, seed: 7 });
    store.getState().tick(100);
    store.getState().togglePause();
    const frozen = store.getState().sim;
    store.getState().tick(1000);
    expect(store.getState().sim).toBe(frozen);
    store.getState().togglePause();
    store.getState().tick(16);
    expect(store.getState().sim.timeMs).toBe(frozen.timeMs + 10);
  });
});
