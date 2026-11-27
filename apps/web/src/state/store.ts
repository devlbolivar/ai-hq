import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  hitTest,
  initialCamera,
  marketingLayout,
  pan,
  recenter,
  screenToWorld,
  validateLayout,
  zoomAt,
  type Camera,
  type HoverTarget,
  type OfficeLayout,
  type Point,
  type Viewport,
} from '@ai-hq/domain';

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
}

export function createOfficeStore({ viewport, layout = marketingLayout }: OfficeStoreOptions) {
  const result = validateLayout(layout);
  if (!result.ok) {
    const details = result.errors.map((e) => `- ${e.message}`).join('\n');
    throw new Error(`Layout inválido "${layout.departmentId}":\n${details}`);
  }

  return createStore<OfficeState>()((set) => ({
    layout,
    viewport,
    camera: initialCamera(viewport, layout),
    cameraTouched: false,
    hover: null,
    pointer: null,
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
  }));
}

export type OfficeStore = ReturnType<typeof createOfficeStore>;

function currentViewport(): Viewport {
  if (typeof window === 'undefined') return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/** App-wide store instance (Pixi reads it with `subscribe`, React with `useOffice`). */
export const officeStore: OfficeStore = createOfficeStore({ viewport: currentViewport() });

export function useOffice<T>(selector: (state: OfficeState) => T): T {
  return useStore(officeStore, selector);
}
