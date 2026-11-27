import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  advanceFrame,
  createSimulation,
  createSimWorld,
  findPath,
  hitTest,
  initialCamera,
  marketingLayout,
  marketingTeam,
  pan,
  recenter,
  screenToWorld,
  validateLayout,
  walkability,
  zoomAt,
  type AgentProfile,
  type Camera,
  type Coord,
  type HoverTarget,
  type OfficeLayout,
  type PathResult,
  type Point,
  type SimWorld,
  type Simulation,
  type Viewport,
} from '@ai-hq/domain';
import { readSimOptions } from '../seed';

/** Debug mode (US4, FR-023): origin and destination picked with clicks, and the route between them. */
export interface DebugState {
  readonly enabled: boolean;
  readonly from: Coord | null;
  readonly to: Coord | null;
  readonly result: PathResult | null;
}

export const IDLE_DEBUG: DebugState = Object.freeze({
  enabled: false,
  from: null,
  to: null,
  result: null,
});

export interface OfficeState {
  readonly layout: OfficeLayout;
  readonly viewport: Viewport;
  readonly camera: Camera;
  /** True once the user has panned or zoomed; until then resizes keep the office centered. */
  readonly cameraTouched: boolean;
  /** What is under the pointer: front-most object, floor tile, or nothing (FR-017–FR-019). */
  readonly hover: HoverTarget;
  /** Last pointer position relative to the canvas host; null while the pointer is outside. */
  readonly pointer: Point | null;
  readonly debug: DebugState;
  /** Agent profiles in memory: seed data until reload (FR-032a). */
  readonly team: readonly AgentProfile[];
  readonly world: SimWorld;
  readonly sim: Simulation;
  /** Remainder of the fixed-step clock (research R6). */
  readonly accumulatorMs: number;
  /** `Space` pauses the whole simulation (FR-020). */
  readonly paused: boolean;
  readonly seed: number;
  /** Advances the simulation by one rendered frame of `dtMs` (nothing while paused). */
  tick(dtMs: number): void;
  setViewport(viewport: Viewport): void;
  /** Pans by a screen-pixel delta (clamped by the domain, FR-016). */
  panBy(delta: Point): void;
  /** Zooms by `factor` keeping the world point under the screen `anchor` fixed (FR-014). */
  zoomAt(anchor: Point, factor: number): void;
  /** Back to the initial camera; resizes keep it centered again (FR-015). */
  recenter(): void;
  /** The pointer moved to `screenPoint` (canvas-host pixels): updates `hover`. */
  pointerMove(screenPoint: Point): void;
  /** The pointer left the canvas: no hover. */
  pointerLeave(): void;
  /** Turns debug mode on (no selection yet) or off (clears origin, destination and route). */
  toggleDebug(): void;
  /**
   * Picks a tile in debug mode: first the origin, then the destination (computing the route), and
   * the next pick starts over with a new origin. Ignored while debug mode is off.
   */
  selectTile(tile: Coord): void;
}

function sameHover(a: HoverTarget, b: HoverTarget): boolean {
  if (a === null || b === null) return a === b;
  if (a.type === 'object') return b.type === 'object' && a.id === b.id;
  return b.type === 'tile' && a.tile.x === b.tile.x && a.tile.y === b.tile.y;
}

/** Hover under `pointer` with `camera`, reusing `previous` when the target did not change. */
function hoverAt(
  pointer: Point | null,
  camera: Camera,
  layout: OfficeLayout,
  previous: HoverTarget,
): HoverTarget {
  const next = pointer ? hitTest(screenToWorld(camera, pointer), layout) : null;
  return sameHover(previous, next) ? previous : next;
}

/** A camera change plus the hover it causes under a still pointer. */
function withCamera(state: OfficeState, camera: Camera) {
  return { camera, hover: hoverAt(state.pointer, camera, state.layout, state.hover) };
}

export interface OfficeStoreOptions {
  readonly viewport: Viewport;
  readonly layout?: OfficeLayout;
  readonly team?: readonly AgentProfile[];
  readonly seed?: number;
  readonly paused?: boolean;
}

export function createOfficeStore({
  viewport,
  layout = marketingLayout,
  team = marketingTeam,
  seed = 1,
  paused = false,
}: OfficeStoreOptions) {
  const result = validateLayout(layout);
  if (!result.ok) {
    const details = result.errors.map((e) => `- ${e.message}`).join('\n');
    throw new Error(`Layout inválido "${layout.departmentId}":\n${details}`);
  }

  const walk = walkability(layout);
  const world = createSimWorld(layout, team);

  const nextDebug = (debug: DebugState, tile: Coord): DebugState => {
    const picked = { x: tile.x, y: tile.y };
    if (debug.from === null || debug.to !== null) {
      return { enabled: true, from: picked, to: null, result: null };
    }
    return { ...debug, to: picked, result: findPath(walk, debug.from, picked) };
  };

  return createStore<OfficeState>()((set) => ({
    layout,
    viewport,
    camera: initialCamera(viewport, layout),
    cameraTouched: false,
    hover: null,
    pointer: null,
    debug: IDLE_DEBUG,
    team,
    world,
    sim: createSimulation(world, seed),
    accumulatorMs: 0,
    paused,
    seed,
    tick: (dtMs) =>
      set((state) => {
        if (state.paused) return state;
        const { sim, accumulatorMs } = advanceFrame(
          state.sim,
          state.world,
          state.accumulatorMs,
          dtMs,
        );
        return { sim, accumulatorMs };
      }),
    setViewport: (next) =>
      set((state) => ({
        viewport: next,
        ...withCamera(
          state,
          state.cameraTouched
            ? pan(state.camera, { x: 0, y: 0 }, next, state.layout)
            : initialCamera(next, state.layout),
        ),
      })),
    panBy: (delta) =>
      set((state) => ({
        ...withCamera(state, pan(state.camera, delta, state.viewport, state.layout)),
        cameraTouched: true,
      })),
    zoomAt: (anchor, factor) =>
      set((state) => ({
        ...withCamera(state, zoomAt(state.camera, anchor, factor, state.viewport, state.layout)),
        cameraTouched: true,
      })),
    recenter: () =>
      set((state) => ({
        ...withCamera(state, recenter(state.viewport, state.layout)),
        cameraTouched: false,
      })),
    pointerMove: (screenPoint) =>
      set((state) => ({
        pointer: screenPoint,
        hover: hoverAt(screenPoint, state.camera, state.layout, state.hover),
      })),
    pointerLeave: () => set({ pointer: null, hover: null }),
    toggleDebug: () =>
      set((state) => ({
        debug: state.debug.enabled ? IDLE_DEBUG : { ...IDLE_DEBUG, enabled: true },
      })),
    selectTile: (tile) =>
      set((state) => (state.debug.enabled ? { debug: nextDebug(state.debug, tile) } : state)),
  }));
}

export type OfficeStore = ReturnType<typeof createOfficeStore>;

function currentViewport(): Viewport {
  if (typeof window === 'undefined') return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function currentSimOptions(): { seed: number; paused: boolean } {
  if (typeof window === 'undefined') return { seed: 1, paused: false };
  return readSimOptions(window.location, import.meta.env, () => Date.now());
}

/** App-wide store instance (Pixi reads it with `subscribe`, React with `useOffice`). */
export const officeStore: OfficeStore = createOfficeStore({
  viewport: currentViewport(),
  ...currentSimOptions(),
});

export function useOffice<T>(selector: (state: OfficeState) => T): T {
  return useStore(officeStore, selector);
}
