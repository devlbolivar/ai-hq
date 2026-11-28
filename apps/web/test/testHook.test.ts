import { afterEach, describe, expect, it } from 'vitest';
import {
  agentPosition,
  CHARACTER_BODY,
  marketingLayout,
  marketingTeam,
  positionToWorld,
  screenToGrid,
  tileCenter,
  worldToScreen,
} from '@ai-hq/domain';
import { createOfficeStore } from '../src/state/store';
import { installTestHook, shouldExposeTestHook, type TestHookControls } from '../src/testHook';

const viewport = { width: 1280, height: 800 };
const DEV = { MODE: 'development' } as const;

let controls: TestHookControls | null = null;
afterEach(() => {
  controls?.dispose();
  controls = null;
});

function install(store = createOfficeStore({ viewport })) {
  controls = installTestHook(window, store, DEV);
  if (!controls || !window.__AIHQ__) throw new Error('hook not installed');
  return { store, controls, hook: window.__AIHQ__ };
}

describe('shouldExposeTestHook (contracts/ui-contract.md)', () => {
  it.each([
    [{ MODE: 'development' }, true],
    [{ MODE: 'test' }, true],
    [{ MODE: 'e2e' }, true],
    [{ MODE: 'production' }, false],
    [{ MODE: 'production', VITE_E2E: '1' }, true],
    [{ MODE: 'production', VITE_E2E: '0' }, false],
  ])('%o → %s', (env, expected) => {
    expect(shouldExposeTestHook(env)).toBe(expected);
  });
});

describe('installTestHook', () => {
  it('does not expose window.__AIHQ__ in production', () => {
    const store = createOfficeStore({ viewport });
    expect(installTestHook(window, store, { MODE: 'production' })).toBeNull();
    expect(window.__AIHQ__).toBeUndefined();
  });

  it('exposes exactly the contract fields', () => {
    const { hook } = install();
    expect(Object.keys(hook).sort()).toEqual(
      [
        'ready',
        'layoutId',
        'drawOrder',
        'camera',
        'hover',
        'debug',
        'fps',
        'gridToScreen',
        'sceneOrder',
        'seed',
        'simTimeMs',
        'paused',
        'agents',
        'selection',
        'agentToScreen',
      ].sort(),
    );
    expect(hook.ready).toBe(false);
    expect(hook.layoutId).toBe('marketing');
    expect(hook.drawOrder).toEqual([]);
    expect(hook.hover).toBeNull();
    expect(hook.debug).toEqual({ enabled: false, from: null, to: null, result: null });
    expect(hook.fps).toBe(0);
    expect(typeof hook.gridToScreen).toBe('function');
  });

  it('is read-only', () => {
    const { hook } = install();
    expect(() => {
      (hook as unknown as { ready: boolean }).ready = true;
    }).toThrow(TypeError);
  });

  it('reads the camera live from the store', () => {
    const { store, hook } = install();
    expect(hook.camera).toEqual(store.getState().camera);
    const moved = { offset: { x: 5, y: 7 }, zoom: 1.5 };
    store.setState({ camera: moved });
    expect(hook.camera).toEqual(moved);
  });

  it('reads the hover live from the store (FR-017–FR-019)', () => {
    const { store, hook } = install();
    store.setState({ hover: { type: 'object', id: 'meeting-table' } });
    expect(hook.hover).toEqual({ type: 'object', id: 'meeting-table' });
    store.getState().pointerLeave();
    expect(hook.hover).toBeNull();
  });

  it('reads the debug state live from the store (US4)', () => {
    const { store, hook } = install();
    store.getState().toggleDebug();
    store.getState().selectTile(marketingLayout.entrance);
    expect(hook.debug).toEqual({
      enabled: true,
      from: marketingLayout.entrance,
      to: null,
      result: null,
    });
    store.getState().toggleDebug();
    expect(hook.debug).toEqual({ enabled: false, from: null, to: null, result: null });
  });

  it('publishes object child labels in container order when the scene is ready', () => {
    const { controls, hook } = install();
    controls.markReady({ children: [{ label: 'desk-1' }, { label: 'wall-0-1' }] });
    expect(hook.ready).toBe(true);
    expect(hook.drawOrder).toEqual(['desk-1', 'wall-0-1']);
  });

  it('drawOrder keeps only objects while sceneOrder lists every child, live (fix #7)', () => {
    const { controls, hook } = install();
    const objects = {
      children: [{ label: 'chair-1' }, { label: 'agent:copywriter' }, { label: 'desk-4' }],
    };
    controls.markReady(objects);
    expect(hook.drawOrder).toEqual(['chair-1', 'desk-4']);
    expect(hook.sceneOrder).toEqual(['chair-1', 'agent:copywriter', 'desk-4']);
    // The container re-sorts as agents move: the hook reads its current order.
    objects.children = [{ label: 'agent:copywriter' }, { label: 'chair-1' }, { label: 'desk-4' }];
    expect(hook.sceneOrder).toEqual(['agent:copywriter', 'chair-1', 'desk-4']);
    expect(hook.drawOrder).toEqual(['chair-1', 'desk-4']);
  });

  it('publishes seed, simulated time and pause from the store', () => {
    const { store, hook } = install(createOfficeStore({ viewport, seed: 42, paused: true }));
    expect(hook.seed).toBe(42);
    expect(hook.paused).toBe(true);
    expect(hook.simTimeMs).toBe(0);
    store.getState().togglePause();
    store.getState().tick(100);
    expect(hook.paused).toBe(false);
    expect(hook.simTimeMs).toBe(store.getState().sim.timeMs);
    expect(hook.simTimeMs).toBeGreaterThan(0);
  });

  it('publishes each agent with profile and runtime fields (contracts/ui-contract.md)', () => {
    const { store, hook } = install();
    expect(hook.agents.map((a) => a.id)).toEqual(marketingTeam.map((a) => a.id));
    const first = hook.agents[0]!;
    const runtime = store.getState().sim.agents[0]!;
    expect(first).toEqual({
      id: 'head-of-marketing',
      name: 'Head of Marketing',
      role: 'Estratega',
      color: 'coral',
      number: 1,
      status: runtime.status,
      tile: runtime.tile,
      position: agentPosition(runtime),
      facing: runtime.facing,
      forced: false,
      reservation: runtime.reservation
        ? `${runtime.reservation.objectId}#${runtime.reservation.index}`
        : null,
      celebrating: false,
    });
    expect(hook.agents.map((a) => a.number)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('reflects edits and orders: name, forced, reservation key', () => {
    const { store, hook } = install();
    const { saveAgent, team } = store.getState();
    const copy = team[2]!;
    saveAgent(copy.id, { ...copy, name: 'Pluma' });
    expect(hook.agents[2]!.name).toBe('Pluma');
    store.getState().toggleDebug();
    expect(store.getState().sendOrder(copy.id, { type: 'activity', activity: 'meeting' })).toEqual(
      expect.objectContaining({ ok: true }),
    );
    const agent = hook.agents[2]!;
    expect(agent.forced).toBe(true);
    expect(agent.reservation).toMatch(/^meeting-table#\d+$/);
  });

  it('publishes the selection', () => {
    const { store, hook } = install();
    expect(hook.selection).toEqual({ agentId: null, following: false });
    store.getState().select('designer');
    expect(hook.selection).toEqual({ agentId: 'designer', following: true });
  });

  it('maps an agent to the screen center of its body', () => {
    const { store, hook } = install();
    store.setState({ camera: { offset: { x: 300, y: 90 }, zoom: 2 } });
    const { camera, sim, layout } = store.getState();
    const runtime = sim.agents[1]!;
    const feet = positionToWorld(agentPosition(runtime), layout.tile);
    expect(hook.agentToScreen(runtime.id)).toEqual(
      worldToScreen(camera, { x: feet.x, y: feet.y - CHARACTER_BODY.height / 2 }),
    );
    expect(() => hook.agentToScreen('nobody')).toThrow();
  });

  it('reports fps as the frame count of the last second', () => {
    const { controls, hook } = install();
    for (let i = 0; i <= 120; i++) controls.recordFrame(Math.round(i * (1000 / 60)));
    expect(hook.fps).toBeCloseTo(60, 0);
    for (let i = 1; i <= 30; i++) controls.recordFrame(2000 + Math.round(i * (1000 / 30)));
    expect(hook.fps).toBeCloseTo(30, 0);
  });

  it('maps a tile to the screen position of its center, not its shared top vertex', () => {
    const { store, hook } = install();
    store.setState({ camera: { offset: { x: 400, y: 120 }, zoom: 1.5 } });
    const cam = store.getState().camera;
    expect(hook.gridToScreen({ x: 8, y: 11 })).toEqual(
      worldToScreen(cam, tileCenter({ x: 8, y: 11 }, marketingLayout.tile)),
    );
    for (let y = 0; y < marketingLayout.grid.rows; y++) {
      for (let x = 0; x < marketingLayout.grid.cols; x++) {
        expect(screenToGrid(cam, hook.gridToScreen({ x, y }), marketingLayout)).toEqual({ x, y });
      }
    }
  });

  it('removes window.__AIHQ__ on dispose', () => {
    const { controls } = install();
    controls.dispose();
    expect(window.__AIHQ__).toBeUndefined();
  });
});
