import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createOfficeStore } from '../../src/state/store';
import { PauseIndicator } from '../../src/ui/PauseIndicator';

afterEach(cleanup);

describe('PauseIndicator (FR-020)', () => {
  it('shows "Simulación en pausa" only while paused', () => {
    const store = createOfficeStore({ viewport: { width: 1280, height: 800 } });
    render(<PauseIndicator store={store} />);
    expect(screen.queryByRole('status', { name: 'Simulación en pausa' })).toBeNull();
    act(() => store.getState().togglePause());
    expect(screen.getByRole('status', { name: 'Simulación en pausa' }).textContent).toBe(
      'Simulación en pausa',
    );
    act(() => store.getState().togglePause());
    expect(screen.queryByRole('status', { name: 'Simulación en pausa' })).toBeNull();
  });
});
