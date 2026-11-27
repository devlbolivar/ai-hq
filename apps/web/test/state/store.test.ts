import { describe, expect, it } from 'vitest';
import { initialCamera, marketingLayout, type OfficeLayout } from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';

const viewport = { width: 1280, height: 800 };

describe('office store (data-model.md "Estado de UI")', () => {
  it('starts with the Marketing layout centered at zoom 1', () => {
    const store = createOfficeStore({ viewport });
    const state = store.getState();
    expect(state.layout).toBe(marketingLayout);
    expect(state.viewport).toEqual(viewport);
    expect(state.camera).toEqual(initialCamera(viewport, marketingLayout));
  });

  it('re-centers on setViewport while the user has not moved the camera', () => {
    const store = createOfficeStore({ viewport });
    const next = { width: 1600, height: 900 };
    store.getState().setViewport(next);
    expect(store.getState().viewport).toEqual(next);
    expect(store.getState().camera).toEqual(initialCamera(next, marketingLayout));
  });

  it('keeps the camera on setViewport once the user has moved it', () => {
    const store = createOfficeStore({ viewport });
    const moved = { offset: { x: 10, y: 20 }, zoom: 1.5 };
    store.setState({ camera: moved, cameraTouched: true });
    store.getState().setViewport({ width: 1600, height: 900 });
    expect(store.getState().viewport).toEqual({ width: 1600, height: 900 });
    expect(store.getState().camera).toEqual(moved);
  });

  it('throws with the validation messages when the layout is invalid', () => {
    const invalid: OfficeLayout = {
      ...marketingLayout,
      objects: marketingLayout.objects.map((o) =>
        o.id === 'monitor-1' ? { ...o, attachedTo: 'desk-99' } : o,
      ),
    };
    expect(() => createOfficeStore({ viewport, layout: invalid })).toThrow(/monitor-1.*desk-99/);
  });
});
