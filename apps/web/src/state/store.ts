import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  initialCamera,
  marketingLayout,
  validateLayout,
  type Camera,
  type OfficeLayout,
  type Viewport,
} from '@ai-hq/domain';

export interface OfficeState {
  readonly layout: OfficeLayout;
  readonly viewport: Viewport;
  readonly camera: Camera;
  /** True once the user has panned or zoomed; until then resizes keep the office centered. */
  readonly cameraTouched: boolean;
  setViewport(viewport: Viewport): void;
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
          ? { viewport: next }
          : { viewport: next, camera: initialCamera(next, state.layout) },
      ),
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
