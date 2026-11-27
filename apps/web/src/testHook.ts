import {
  tileCenter,
  worldToScreen,
  type Camera,
  type Coord,
  type HoverTarget,
  type Point,
} from '@ai-hq/domain';
import type { DebugState, OfficeStore } from './state/store';

/** Read-only scene snapshot for e2e tests (contracts/ui-contract.md). */
export interface AIHQTestHook {
  readonly ready: boolean;
  readonly layoutId: string;
  readonly drawOrder: readonly string[];
  readonly camera: Camera;
  readonly hover: HoverTarget;
  readonly debug: DebugState;
  readonly fps: number;
  /** Screen position of the tile **center** (never the top vertex shared by 4 tiles). */
  gridToScreen(tile: Coord): Point;
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
export interface TestHookControls {
  markReady(drawOrder: readonly string[]): void;
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
  let order: readonly string[] = [];
  const frames: number[] = [];

  const hook: AIHQTestHook = Object.freeze({
    get ready() {
      return ready;
    },
    get layoutId() {
      return store.getState().layout.departmentId;
    },
    get drawOrder() {
      return order;
    },
    get camera() {
      return store.getState().camera;
    },
    get hover(): HoverTarget {
      return store.getState().hover;
    },
    get debug(): DebugState {
      return store.getState().debug;
    },
    get fps() {
      return frames.length;
    },
    gridToScreen(tile: Coord): Point {
      const { camera, layout } = store.getState();
      return worldToScreen(camera, tileCenter(tile, layout.tile));
    },
  });

  target.__AIHQ__ = hook;

  return {
    markReady(drawOrder) {
      order = Object.freeze([...drawOrder]);
      ready = true;
    },
    recordFrame(now) {
      frames.push(now);
      while (frames.length > 0 && (frames[0] as number) <= now - FPS_WINDOW_MS) frames.shift();
    },
    dispose() {
      if (target.__AIHQ__ === hook) delete target.__AIHQ__;
    },
  };
}
