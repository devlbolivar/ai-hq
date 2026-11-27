import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  initialCamera,
  marketingLayout,
  pan,
  recenter,
  validateLayout,
  zoomAt,
  type Camera,
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
  setViewport(viewport: Viewport): void;
  /** Pans by a screen-pixel delta (clamped by the domain, FR-016). */
  panBy(delta: Point): void;
  /** Zooms by `factor` keeping the world point under the screen `anchor` fixed (FR-014). */
  zoomAt(anchor: Point, factor: number): void;
  /** Back to the initial camera; resizes keep it centered again (FR-015). */
  recenter(): void;
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
    setViewport: (next) =>
      set((state) =>
        state.cameraTouched
          ? { viewport: next, camera: pan(state.camera, { x: 0, y: 0 }, next, state.layout) }
          : { viewport: next, camera: initialCamera(next, state.layout) },
      ),
    panBy: (delta) =>
      set((state) => ({
        camera: pan(state.camera, delta, state.viewport, state.layout),
        cameraTouched: true,
      })),
    zoomAt: (anchor, factor) =>
      set((state) => ({
        camera: zoomAt(state.camera, anchor, factor, state.viewport, state.layout),
        cameraTouched: true,
      })),
    recenter: () =>
      set((state) => ({ camera: recenter(state.viewport, state.layout), cameraTouched: false })),
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
