import { describe, expect, it } from 'vitest';
import {
  agentPosition,
  marketingLayout,
  positionToWorld,
  worldToScreen,
  type AgentRuntime,
} from '@ai-hq/domain';
import { createOfficeStore, type OfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

function agentOnScreen(store: OfficeStore, id: string) {
  const { sim, camera, layout } = store.getState();
  const agent = sim.agents.find((a) => a.id === id)!;
  return worldToScreen(camera, positionToWorld(agentPosition(agent), layout.tile));
}

function expectCentered(store: OfficeStore, id: string) {
  const p = agentOnScreen(store, id);
  const { width, height } = store.getState().viewport;
  expect(Math.abs(p.x - width / 2)).toBeLessThanOrEqual(2);
  expect(Math.abs(p.y - height / 2)).toBeLessThanOrEqual(2);
}

function moveAgent(store: OfficeStore, id: string, change: Partial<AgentRuntime>) {
  const { sim } = store.getState();
  store.setState({
    sim: { ...sim, agents: sim.agents.map((a) => (a.id === id ? { ...a, ...change } : a)) },
  });
}

function paused() {
  // Paused so the agents stay put; the camera must still follow (frame time, not simulated time).
  return createOfficeStore({ viewport, seed: 1, paused: true });
}

describe('selection and following camera (FR-026–FR-028)', () => {
  it('selects an agent and centers it smoothly within 400 ms, keeping the zoom', () => {
    const store = paused();
    const zoom = store.getState().camera.zoom;
    store.getState().select('designer');
    expect(store.getState().selection).toEqual({ agentId: 'designer', following: true });
    store.getState().tick(200);
    const halfway = agentOnScreen(store, 'designer');
    expect(Math.abs(halfway.x - viewport.width / 2)).toBeGreaterThan(0.5);
    store.getState().tick(200);
    expectCentered(store, 'designer');
    expect(store.getState().camera.zoom).toBe(zoom);
  });

  it('keeps a moving agent centered and after a resize', () => {
    const store = paused();
    store.getState().select('copywriter');
    store.getState().tick(500);
    moveAgent(store, 'copywriter', { tile: { x: 9, y: 6 }, next: { x: 10, y: 6 }, stepMs: 250 });
    store.getState().tick(16);
    expectCentered(store, 'copywriter');
    store.getState().setViewport({ width: 1000, height: 700 });
    expectCentered(store, 'copywriter');
  });

  it.each([
    ['panBy', (s: OfficeStore) => s.getState().panBy({ x: 30, y: 0 })],
    ['zoomAt', (s: OfficeStore) => s.getState().zoomAt({ x: 100, y: 100 }, 1.1)],
    ['recenter', (s: OfficeStore) => s.getState().recenter()],
  ])('stops following on %s but keeps the selection; selecting again resumes', (_name, act) => {
    const store = paused();
    store.getState().select('designer');
    store.getState().tick(500);
    act(store);
    expect(store.getState().selection).toEqual({ agentId: 'designer', following: false });
    const camera = store.getState().camera;
    store.getState().tick(100);
    expect(store.getState().camera).toEqual(camera);
    store.getState().select('designer');
    store.getState().tick(500);
    expectCentered(store, 'designer');
  });

  it('selects by number, cycles with Tab/Shift+Tab and deselects', () => {
    const store = paused();
    store.getState().selectNumber(3);
    expect(store.getState().selection.agentId).toBe('copywriter');
    store.getState().selectNumber(8);
    expect(store.getState().selection.agentId).toBe('copywriter');
    store.getState().deselect();
    expect(store.getState().selection).toEqual({ agentId: null, following: false });
    store.getState().cycle(1);
    expect(store.getState().selection.agentId).toBe('head-of-marketing');
    store.getState().cycle(-1);
    expect(store.getState().selection.agentId).toBe('community-manager');
    store.getState().cycle(1);
    expect(store.getState().selection.agentId).toBe('head-of-marketing');
  });

  it('keeps the selected agent within the camera limits of the 001', () => {
    const store = paused();
    store.getState().select('head-of-marketing');
    store.getState().tick(500);
    expect(store.getState().layout).toBe(marketingLayout);
    expect(store.getState().cameraTouched).toBe(true);
  });
});

describe('re-selecting with the same number (FR-028, US2-7)', () => {
  it('pressing the number of the selected agent resumes a stopped follow', () => {
    const store = createOfficeStore({ viewport, seed: 1, paused: true });
    store.getState().selectNumber(3);
    store.getState().panBy({ x: 40, y: 0 });
    expect(store.getState().selection).toEqual({ agentId: 'copywriter', following: false });
    store.getState().selectNumber(3);
    expect(store.getState().selection).toEqual({ agentId: 'copywriter', following: true });
    expect(store.getState().follow).not.toBeNull();
  });

  it('pressing it again while following does not restart the transition', () => {
    const store = createOfficeStore({ viewport, seed: 1, paused: true });
    store.getState().selectNumber(3);
    store.getState().tick(500);
    store.getState().selectNumber(3);
    expect(store.getState().follow).toBeNull();
  });
});
