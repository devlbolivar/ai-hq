import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { HoverTarget } from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';
import { HoverLabel } from '../../src/ui/HoverLabel';

afterEach(cleanup);

function renderLabel(hover: HoverTarget) {
  const store = createOfficeStore({ viewport: { width: 800, height: 600 } });
  store.setState({ hover });
  render(<HoverLabel store={store} />);
  return store;
}

describe('HoverLabel', () => {
  it('hides the status when nothing is hovered', () => {
    renderLabel(null);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides the status over a floor tile', () => {
    renderLabel({ type: 'tile', tile: { x: 9, y: 6 } });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hides the status for an unknown object', () => {
    renderLabel({ type: 'object', id: 'missing-object' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('updates the object name and removes the status when hover clears', () => {
    const store = renderLabel({ type: 'object', id: 'meeting-table' });
    expect(screen.getByRole('status', { name: 'Mesa de reuniones' }).textContent).toBe('Mesa de reuniones');

    act(() => store.setState({ hover: { type: 'object', id: 'plant-2' } }));
    expect(screen.getByRole('status', { name: 'Planta' }).textContent).toBe('Planta');

    act(() => store.setState({ hover: null }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
