import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  advanceFrame,
  agentPosition,
  applyDraft,
  applyOrder,
  cancelForcedOrders,
  centerOn,
  createSimulation,
  createSimWorld,
  cycleSelection,
  findPath,
  hitTest,
  initialCamera,
  marketingLayout,
  marketingTeam,
  pan,
  positionToWorld,
  recenter,
  screenToWorld,
  selectByNumber,
  validateAgentDraft,
  validateLayout,
  walkability,
  zoomAt,
  type AgentDraft,
  type AgentDraftErrors,
  type AgentProfile,
  type CharacterPlacement,
  type Camera,
  type Order,
  type OrderResult,
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
import { followOffset, FOLLOW_MS } from './follow';

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

/** Selected agent and whether the camera follows it (data-model.md "Selection"). */
export interface Selection {
  readonly agentId: string | null;
  readonly following: boolean;
}

export const NO_SELECTION: Selection = Object.freeze({ agentId: null, following: false });

/** Smooth centering in progress after a selection (≤ 400 ms, FR-028). */
export interface FollowTransition {
  readonly startOffset: Point;
  readonly elapsedMs: number;
}

/** How long the "Sin sitio libre" notice stays visible (frame time). */
export const NOTICE_MS = 2000;

export interface Notice {
  readonly message: string;
  /** Changes on every notice so the same message can be shown again. */
  readonly id: number;
  readonly remainingMs: number;
}

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
  readonly selection: Selection;
  readonly follow: FollowTransition | null;
  /** Orders received while paused; applied in arrival order on resume (FR-020). */
  readonly queuedOrders: readonly { readonly agentId: string; readonly order: Order }[];
  /** Ephemeral notice ("Sin sitio libre", FR-034). */
  readonly notice: Notice | null;
  /**
   * Sends an external order (debug buttons, test hook; FR-034). Returns its result, or null when
   * it was queued because the simulation is paused.
   */
  sendOrder(agentId: string, order: Order): OrderResult | null;
  /** Open editor dialog; while open no office shortcut or gesture acts (FR-029). */
  readonly editor: { readonly agentId: string } | null;
  /**
   * One rendered frame of `dtMs`: advances the simulation (unless paused) and moves the camera
   * after the followed agent (also while paused: it uses frame time).
   */
  tick(dtMs: number): void;
  /** Opens the editor of an agent and selects it (FR-033). */
  openEditor(agentId: string): void;
  /** Closes the editor without applying anything; the selection stays (FR-032). */
  closeEditor(): void;
  /**
   * Saves the draft when valid (FR-030, FR-032): updates team and world at once, keeps the
   * simulation and closes the editor. Returns the field errors (`{}` when saved).
   */
  saveAgent(agentId: string, draft: AgentDraft): AgentDraftErrors;
  /** `Space`: pauses or resumes movement, animations and autonomy timers (FR-020). */
  togglePause(): void;
  /** Selects an agent and starts following it (FR-026, FR-028). */
  select(agentId: string): void;
  deselect(): void;
  /** `1`–`9`: the n-th agent of the team; numbers without an agent change nothing. */
  selectNumber(n: number): void;
  /** `Tab` (1) / `Shift+Tab` (−1), cyclic. */
  cycle(direction: 1 | -1): void;
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

/** Camera that keeps the followed agent centered, easing in while a transition runs. */
function followCamera(state: OfficeState, transition: FollowTransition | null): Camera {
  const agent = state.sim.agents.find((a) => a.id === state.selection.agentId);
  if (!agent) return state.camera;
  const world = positionToWorld(agentPosition(agent), state.layout.tile);
  const target = centerOn(state.camera, world, state.viewport, state.layout);
  if (!transition) return target;
  return {
    zoom: target.zoom,
    offset: followOffset(transition.startOffset, target.offset, transition.elapsedMs),
  };
}

/** Where each agent is drawn and hit-tested this frame (data-model.md "CharacterPlacement"). */
export function characterPlacements(sim: Simulation): CharacterPlacement[] {
  return sim.agents.map((agent, teamIndex) => ({
    id: agent.id,
    teamIndex,
    position: agentPosition(agent),
    tile: agent.tile,
    next: agent.next,
  }));
}

let noticeCount = 0;

/** "Sin sitio libre" when an order finds no free use point (FR-034). */
function noticeFor(result: OrderResult): Notice | null {
  if (result.ok || result.reason !== 'NO_FREE_SPOT') return null;
  noticeCount += 1;
  return { message: 'Sin sitio libre', id: noticeCount, remainingMs: NOTICE_MS };
}

/** Any manual camera move stops following but keeps the selection (FR-028). */
function stopFollowing(selection: Selection) {
  return { selection: { agentId: selection.agentId, following: false }, follow: null };
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

  return createStore<OfficeState>()((set, get) => ({
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
    selection: NO_SELECTION,
    follow: null,
    tick: (dtMs) =>
      set((state) => {
        const advanced = state.paused
          ? {}
          : advanceFrame(state.sim, state.world, state.accumulatorMs, dtMs);
        const notice =
          state.notice && state.notice.remainingMs > dtMs
            ? { ...state.notice, remainingMs: state.notice.remainingMs - dtMs }
            : null;
        if (!state.selection.following) return { ...advanced, notice };
        const view = { ...state, ...advanced };
        const elapsed = (state.follow?.elapsedMs ?? FOLLOW_MS) + dtMs;
        const transition =
          state.follow && elapsed < FOLLOW_MS ? { ...state.follow, elapsedMs: elapsed } : null;
        return {
          ...advanced,
          ...withCamera(view, followCamera(view, transition)),
          follow: transition,
          notice,
        };
      }),
    select: (agentId) =>
      set((state) =>
        state.team.some((a) => a.id === agentId)
          ? {
              selection: { agentId, following: true },
              follow: { startOffset: state.camera.offset, elapsedMs: 0 },
              cameraTouched: true,
            }
          : state,
      ),
    deselect: () => set({ selection: NO_SELECTION, follow: null }),
    togglePause: () =>
      set((state) => {
        if (!state.paused) return { paused: true };
        let { sim } = state;
        let notice = state.notice;
        for (const { agentId, order } of state.queuedOrders) {
          const out = applyOrder(sim, state.world, agentId, order);
          sim = out.sim;
          notice = noticeFor(out.result) ?? notice;
        }
        return { paused: false, sim, queuedOrders: [], notice };
      }),
    queuedOrders: [],
    notice: null,
    sendOrder: (agentId, order) => {
      const state = get();
      if (state.paused) {
        set({ queuedOrders: [...state.queuedOrders, { agentId, order }] });
        return null;
      }
      const { sim, result } = applyOrder(state.sim, state.world, agentId, order);
      set({ sim, notice: noticeFor(result) ?? state.notice });
      return result;
    },
    editor: null,
    openEditor: (agentId) => {
      if (!get().team.some((a) => a.id === agentId)) return;
      get().select(agentId);
      set({ editor: { agentId } });
    },
    closeEditor: () => set({ editor: null }),
    saveAgent: (agentId, draft) => {
      const { team, world } = get();
      const errors = validateAgentDraft(draft, team, agentId);
      if (Object.keys(errors).length > 0) return errors;
      const next = team.map((a) => (a.id === agentId ? applyDraft(a, draft) : a));
      set({ team: next, world: { ...world, team: next }, editor: null });
      return {};
    },
    selectNumber: (n) => {
      const { team, selection, select } = get();
      const id = selectByNumber(
        team.map((a) => a.id),
        selection.agentId,
        n,
      );
      if (id !== null && id !== selection.agentId) select(id);
    },
    cycle: (direction) => {
      const { team, selection, select } = get();
      const id = cycleSelection(
        team.map((a) => a.id),
        selection.agentId,
        direction,
      );
      if (id !== null) select(id);
    },
    setViewport: (next) =>
      set((state) => {
        const resized = { ...state, viewport: next };
        const camera = state.selection.following
          ? followCamera(resized, null)
          : state.cameraTouched
            ? pan(state.camera, { x: 0, y: 0 }, next, state.layout)
            : initialCamera(next, state.layout);
        return { viewport: next, ...withCamera(state, camera), follow: null };
      }),
    panBy: (delta) =>
      set((state) => ({
        ...withCamera(state, pan(state.camera, delta, state.viewport, state.layout)),
        cameraTouched: true,
        ...stopFollowing(state.selection),
      })),
    zoomAt: (anchor, factor) =>
      set((state) => ({
        ...withCamera(state, zoomAt(state.camera, anchor, factor, state.viewport, state.layout)),
        cameraTouched: true,
        ...stopFollowing(state.selection),
      })),
    recenter: () =>
      set((state) => ({
        ...withCamera(state, recenter(state.viewport, state.layout)),
        cameraTouched: false,
        ...stopFollowing(state.selection),
      })),
    pointerMove: (screenPoint) =>
      set((state) => ({
        pointer: screenPoint,
        hover: hoverAt(screenPoint, state.camera, state.layout, state.hover),
      })),
    pointerLeave: () => set({ pointer: null, hover: null }),
    toggleDebug: () =>
      set((state) =>
        state.debug.enabled
          ? // Turning debug off cancels forced orders, queued ones included (FR-034).
            { debug: IDLE_DEBUG, sim: cancelForcedOrders(state.sim, state.world), queuedOrders: [] }
          : { debug: { ...IDLE_DEBUG, enabled: true } },
      ),
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
