import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  agentPosition,
  applyOrder,
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

function tickFrames(store: ReturnType<typeof createOfficeStore>, durationMs: number) {
  const { tick } = store.getState();
  for (let elapsed = 0; elapsed < durationMs; elapsed += 16) {
    tick(Math.min(16, durationMs - elapsed));
  }
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
        'test',
        'ringFor',
      ].sort(),
    );
    expect(hook.ready).toBe(false);
    expect(hook.layoutId).toBe('marketing');
    expect(hook.drawOrder).toEqual([]);
    expect(hook.hover).toBeNull();
    expect(hook.debug).toEqual({ enabled: false, from: null, to: null, result: null });
    expect(hook.fps).toBe(0);
    expect(typeof hook.gridToScreen).toBe('function');
    expect(Object.keys(hook.test).sort()).toEqual(['order', 'patrol']);
  });

  it('is read-only', () => {
    const { hook } = install();
    expect(() => {
      (hook as unknown as { ready: boolean }).ready = true;
    }).toThrow(TypeError);
    expect(hook.test).toBeDefined();
    expect(Object.isFrozen(hook.test)).toBe(true);
  });

  it('sends orders through the store and returns null for queued orders', () => {
    const { store, hook } = install();
    const sendOrder = vi.fn(store.getState().sendOrder);
    store.setState({ sendOrder });
    const agentId = hook.agents[0]!.id;
    const move = { type: 'go-to', tile: marketingLayout.entrance } as const;
    expect(hook.test.order(agentId, move)).toEqual({ ok: true, changed: true });
    expect(sendOrder).toHaveBeenLastCalledWith(agentId, move);
    expect(hook.agents[0]!.forced).toBe(true);

    store.getState().togglePause();
    const activity = { type: 'activity', activity: 'meeting' } as const;
    expect(hook.test.order(agentId, activity)).toBeNull();
    expect(sendOrder).toHaveBeenLastCalledWith(agentId, activity);
    expect(store.getState().queuedOrders).toEqual([{ agentId, order: activity }]);
  });

  it('starts all six agents toward their farthest acceptable tiles and keeps them walking', () => {
    const { store, hook } = install();
    const { sim: initialSim, world } = store.getState();
    const tiles = world.walk.flatMap((row, y) =>
      row.flatMap((free, x) => (free ? [{ x, y }] : [])),
    );
    // Row-major order breaks distance ties. Apply each accepted order before finding the next
    // destination so the reference simulation accounts for tiles claimed by earlier agents.
    let expected = initialSim;
    for (const agent of initialSim.agents) {
      const distance = (tile: typeof agent.tile) =>
        Math.abs(tile.x - agent.tile.x) + Math.abs(tile.y - agent.tile.y);
      for (const tile of [...tiles].sort((a, b) => distance(b) - distance(a))) {
        const outcome = applyOrder(expected, world, agent.id, { type: 'go-to', tile });
        if (!outcome.result.ok) continue;
        expected = outcome.sim;
        break;
      }
    }

    hook.test.patrol(true);
    const started = store.getState().sim.agents;
    expect(started.map((agent) => agent.target?.tile)).toEqual(
      expected.agents.map((agent) => agent.target?.tile),
    );
    expect(started).toHaveLength(6);
    store.getState().tick(16);
    expect(store.getState().sim.agents.every((agent) => agent.status === 'walking')).toBe(true);

    for (let elapsed = 0; elapsed < 20_000; elapsed += 500) {
      tickFrames(store, 500);
      for (const agent of store.getState().sim.agents) {
        expect(agent.next, `${agent.id} at ${elapsed + 500} ms`).not.toBeNull();
      }
    }
    expect(
      store.getState().sim.agents.some((agent, i) => agent.target !== started[i]!.target),
    ).toBe(true);
  });

  it('also sends on an agent that ends still at an activity while patrolling (FR-035)', () => {
    const { store, hook } = install();
    hook.test.patrol(true);
    tickFrames(store, 100);
    // Not a patrol go-to: it arrives `working`, not `idle`.
    expect(hook.test.order('designer', { type: 'activity', activity: 'work' })).toEqual(
      expect.objectContaining({ ok: true }),
    );
    let elapsed = 0;
    // It reaches its desk (`working`, still) and is sent on: the work target is replaced.
    while (store.getState().sim.agents[4]!.target?.activity === 'work' && elapsed < 30_000) {
      store.getState().tick(16);
      elapsed += 16;
    }
    expect(elapsed).toBeLessThan(30_000);
    tickFrames(store, 500);
    const designer = store.getState().sim.agents[4]!;
    expect(designer.status).toBe('walking');
    expect(designer.next).not.toBeNull();
    expect(designer.target?.activity).toBeNull();
  });

  it('skips an agent when all candidate orders fail without reentering patrol', () => {
    const { store, hook } = install();
    const { sim, world } = store.getState();
    const sendOrder = vi.fn(() => {
      store.setState({ sim });
      return { ok: false, reason: 'INVALID_DESTINATION' } as const;
    });
    store.setState({ sendOrder });

    hook.test.patrol(true);

    expect(sendOrder).toHaveBeenCalledTimes(
      world.walk.flat().filter(Boolean).length * sim.agents.length,
    );
    expect(store.getState().sim).toBe(sim);
  });

  it('sends no patrol orders while paused and starts on resume', () => {
    const { store, hook } = install(createOfficeStore({ viewport, paused: true }));
    const sendOrder = vi.fn(store.getState().sendOrder);
    store.setState({ sendOrder });

    hook.test.patrol(true);
    tickFrames(store, 500);
    expect(sendOrder).not.toHaveBeenCalled();
    expect(store.getState().queuedOrders).toEqual([]);

    store.getState().togglePause();
    expect(store.getState().sim.agents.every((agent) => agent.next !== null)).toBe(true);

    store.getState().togglePause();
    sendOrder.mockClear();
    tickFrames(store, 500);
    expect(sendOrder).not.toHaveBeenCalled();
    expect(store.getState().queuedOrders).toEqual([]);
  });

  it.each(['patrol(false)', 'dispose()'] as const)('stops sending on %s', (stop) => {
    const { store, controls, hook } = install();
    const sendOrder = vi.fn(store.getState().sendOrder);
    store.setState({ sendOrder });
    hook.test.patrol(true);
    expect(store.getState().sim.agents.every((agent) => agent.next !== null)).toBe(true);

    if (stop === 'patrol(false)') hook.test.patrol(false);
    else controls.dispose();
    sendOrder.mockClear();
    tickFrames(store, 20_000);

    expect(sendOrder).not.toHaveBeenCalled();
    for (const agent of store.getState().sim.agents) {
      expect(agent).toMatchObject({ status: 'idle', next: null, forced: true });
    }
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

  it('ringFor is the agent whose drawn ring is visible (FR-027)', () => {
    const { controls, hook } = install();
    const agent = (id: string, ring: boolean) => ({
      label: `agent:${id}`,
      children: [
        { label: 'ring', visible: ring },
        { label: 'figure', visible: true },
      ],
    });
    const objects = { children: [{ label: 'desk-1' }, agent('copywriter', false)] };
    controls.markReady(objects);
    expect(hook.ringFor).toBeNull();
    objects.children = [{ label: 'desk-1' }, agent('copywriter', false), agent('designer', true)];
    expect(hook.ringFor).toBe('designer');
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
