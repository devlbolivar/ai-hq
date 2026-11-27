import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { marketingLayout } from '@ai-hq/domain';
import { createOfficeStore, IDLE_DEBUG, type DebugState } from '../../src/state/store';
import { PathStatus } from '../../src/ui/PathStatus';

afterEach(cleanup);

function renderStatus(debug: DebugState) {
  const store = createOfficeStore({ viewport: { width: 800, height: 600 } });
  store.setState({ debug });
  render(<PathStatus store={store} />);
  return store;
}

describe('PathStatus', () => {
  it('hides an existing result when debug mode is disabled', () => {
    renderStatus({ ...IDLE_DEBUG, result: { ok: false, reason: 'blocked' } });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('waits for both picks, shows the route and clears it when debug mode turns off', () => {
    const store = renderStatus({ ...IDLE_DEBUG, enabled: true });
    expect(screen.queryByRole('status')).toBeNull();

    act(() => store.getState().selectTile(marketingLayout.entrance));
    expect(screen.queryByRole('status')).toBeNull();

    act(() => store.getState().selectTile({ x: 3, y: 9 }));
    expect(screen.getByRole('status', { name: 'Ruta: 7 pasos' }).textContent).toBe('Ruta: 7 pasos');

    act(() => store.getState().toggleDebug());
    expect(screen.queryByRole('status')).toBeNull();
  });

  it.each([
    { destination: { x: 8, y: 10 }, expected: 'Ruta: 1 paso' },
    { destination: marketingLayout.entrance, expected: 'Ruta: 0 pasos' },
  ])('shows "$expected" for a short route', ({ destination, expected }) => {
    const store = renderStatus({ ...IDLE_DEBUG, enabled: true });
    act(() => {
      store.getState().selectTile(marketingLayout.entrance);
      store.getState().selectTile(destination);
    });
    expect(screen.getByRole('status', { name: expected }).textContent).toBe(expected);
  });

  it.each(['blocked', 'unreachable', 'out-of-bounds'] as const)(
    'shows "Sin ruta" for %s',
    (reason) => {
      renderStatus({ ...IDLE_DEBUG, enabled: true, result: { ok: false, reason } });
      expect(screen.getByRole('status', { name: 'Sin ruta' }).textContent).toBe('Sin ruta');
    },
  );
});
