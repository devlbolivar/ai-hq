import {
  agentPosition,
  CHARACTER_BODY,
  positionToWorld,
  tileCenter,
  usePointKey,
  worldToScreen,
  type AgentStatus,
  type Camera,
  type Coord,
  type Direction,
  type GridPosition,
  type Order,
  type OrderResult,
  type Point,
  type SceneHoverTarget,
} from '@ai-hq/domain';
import type { DebugState, OfficeStore, Selection } from './state/store';

/** One agent as e2e tests see it (contracts/ui-contract.md, feature 002). */
export interface AgentSnapshot {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly color: string;
  /** 1-based position in the team (the `1`–`9` shortcut). */
  readonly number: number;
  readonly status: AgentStatus;
  readonly tile: Coord;
  /** Fractional grid position. */
  readonly position: GridPosition;
  readonly facing: Direction;
  readonly forced: boolean;
  /** `"objectId#index"` or null. */
  readonly reservation: string | null;
  readonly celebrating: boolean;
}

/** Scene snapshot and controls for e2e tests (contracts/ui-contract.md). */
export interface AIHQTestHook {
  readonly ready: boolean;
  readonly layoutId: string;
  /** Object ids in the real child order of `objects` (characters left out). */
  readonly drawOrder: readonly string[];
  /** Real child order of `objects`: object ids and `agent:<id>`. */
  readonly sceneOrder: readonly string[];
  readonly camera: Camera;
  readonly hover: SceneHoverTarget;
  readonly debug: DebugState;
  readonly fps: number;
  readonly seed: number;
  readonly simTimeMs: number;
  readonly paused: boolean;
  readonly agents: readonly AgentSnapshot[];
  readonly selection: Selection;
  /** Screen position of the tile **center** (never the top vertex shared by 4 tiles). */
  gridToScreen(tile: Coord): Point;
  /** Agent whose selection ring is drawn (visible), or null (FR-027). */
  readonly ringFor: string | null;
  /** Screen position of the center of an agent's body. */
  agentToScreen(id: string): Point;
  readonly test: {
    order(agentId: string, order: Order): OrderResult | null;
    patrol(on: boolean): void;
  };
}

declare global {
  interface Window {
    __AIHQ__?: AIHQTestHook;
  }
}

export interface TestHookEnv {
  readonly MODE: string;
  readonly VITE_E2E?: string;
}

/** Writable side of the hook, used by the renderer. */
interface LabeledNode {
  readonly label: string;
  readonly visible?: boolean;
  readonly children?: readonly LabeledNode[];
}

/** The `objects` container, read live: it re-sorts as agents move. */
export interface LabeledChildren {
  readonly children: readonly LabeledNode[];
}

export interface TestHookControls {
  markReady(objects: LabeledChildren): void;
  /** Call once per rendered frame with a monotonic timestamp in ms. */
  recordFrame(now: number): void;
  dispose(): void;
}

const FPS_WINDOW_MS = 1000;

export function shouldExposeTestHook(env: TestHookEnv): boolean {
  return env.MODE !== 'production' || env.VITE_E2E === '1';
}

/** Installs `window.__AIHQ__` unless running a production build; returns null when not exposed. */
export function installTestHook(
  target: Window,
  store: OfficeStore,
  env: TestHookEnv,
): TestHookControls | null {
  if (!shouldExposeTestHook(env)) return null;

  let ready = false;
  let objects: LabeledChildren = { children: [] };
  const frames: number[] = [];
  const sceneLabels = () => objects.children.map((child) => child.label);
  let unsubscribePatrol: (() => void) | undefined;

  function patrol(on: boolean): void {
    if (!on) {
      unsubscribePatrol?.();
      unsubscribePatrol = undefined;
      return;
    }
    if (unsubscribePatrol) return;

    let sending = false;
    function sendPatrolOrders() {
      const { paused, sim, world } = store.getState();
      if (paused || sending) return;
      // Every still agent: arrived from a patrol go-to (idle) or from anything else (an activity
      // it was walking to when patrol started, an order sent meanwhile), so all keep walking.
      const waiting = sim.agents.filter((agent) => agent.next === null);
      if (waiting.length === 0) return;

      const tiles = world.walk.flatMap((row, y) =>
        row.flatMap((walkable, x) => (walkable ? [{ x, y }] : [])),
      );
      // sendOrder notifies subscribers synchronously, even when a destination is rejected.
      sending = true;
      try {
        for (const agent of waiting) {
          const distance = (tile: Coord) =>
            Math.abs(tile.x - agent.tile.x) + Math.abs(tile.y - agent.tile.y);
          tiles.sort((a, b) => distance(b) - distance(a) || a.y - b.y || a.x - b.x);
          for (const tile of tiles) {
            const state = store.getState();
            if (state.paused || !unsubscribePatrol) return;
            if (state.sendOrder(agent.id, { type: 'go-to', tile })?.ok) break;
          }
        }
      } finally {
        sending = false;
      }
    }

    unsubscribePatrol = store.subscribe((state, previous) => {
      if (state.sim !== previous.sim || state.paused !== previous.paused) sendPatrolOrders();
    });
    sendPatrolOrders();
  }

  const hook: AIHQTestHook = Object.freeze({
    get ready() {
      return ready;
    },
    get layoutId() {
      return store.getState().layout.departmentId;
    },
    get drawOrder() {
      return sceneLabels().filter((label) => !label.startsWith('agent:'));
    },
    get sceneOrder() {
      return sceneLabels();
    },
    get camera() {
      return store.getState().camera;
    },
    get hover(): SceneHoverTarget {
      return store.getState().hover;
    },
    get debug(): DebugState {
      return store.getState().debug;
    },
    get fps() {
      return frames.length;
    },
    get seed() {
      return store.getState().seed;
    },
    get simTimeMs() {
      return store.getState().sim.timeMs;
    },
    get paused() {
      return store.getState().paused;
    },
    get agents(): AgentSnapshot[] {
      const { team, sim } = store.getState();
      return sim.agents.map((agent, i) => {
        const profile = team[i]!;
        return {
          id: agent.id,
          name: profile.name,
          role: profile.role,
          color: profile.color,
          number: i + 1,
          status: agent.status,
          tile: agent.tile,
          position: agentPosition(agent),
          facing: agent.facing,
          forced: agent.forced,
          reservation: agent.reservation ? usePointKey(agent.reservation) : null,
          celebrating: agent.celebrateMs > 0,
        };
      });
    },
    get selection(): Selection {
      return store.getState().selection;
    },
    get ringFor() {
      const ringed = objects.children.find(
        (child) =>
          child.label.startsWith('agent:') &&
          child.children?.some((part) => part.label === 'ring' && part.visible === true),
      );
      return ringed ? ringed.label.slice('agent:'.length) : null;
    },
    gridToScreen(tile: Coord): Point {
      const { camera, layout } = store.getState();
      return worldToScreen(camera, tileCenter(tile, layout.tile));
    },
    agentToScreen(id: string): Point {
      const { camera, layout, sim } = store.getState();
      const agent = sim.agents.find((a) => a.id === id);
      if (!agent) throw new Error(`unknown agent "${id}"`);
      const feet = positionToWorld(agentPosition(agent), layout.tile);
      return worldToScreen(camera, { x: feet.x, y: feet.y - CHARACTER_BODY.height / 2 });
    },
    test: Object.freeze({
      order: (agentId: string, order: Order) => store.getState().sendOrder(agentId, order),
      patrol,
    }),
  });

  target.__AIHQ__ = hook;

  return {
    markReady(container) {
      objects = container;
      ready = true;
    },
    recordFrame(now) {
      frames.push(now);
      while (frames.length > 0 && (frames[0] as number) <= now - FPS_WINDOW_MS) frames.shift();
    },
    dispose() {
      patrol(false);
      if (target.__AIHQ__ === hook) delete target.__AIHQ__;
    },
  };
}
