import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createOfficeStore } from '../../src/state/store';
import { Notice } from '../../src/ui/Notice';

afterEach(cleanup);

describe('Notice (FR-034)', () => {
  it('shows "Sin sitio libre" while the notice is set', () => {
    const store = createOfficeStore({ viewport: { width: 1280, height: 800 } });
    render(<Notice store={store} />);
    expect(screen.queryByRole('status', { name: 'Sin sitio libre' })).toBeNull();
    act(() => store.setState({ notice: { message: 'Sin sitio libre', id: 1, remainingMs: 2000 } }));
    expect(screen.getByRole('status', { name: 'Sin sitio libre' }).textContent).toBe(
      'Sin sitio libre',
    );
    act(() => store.setState({ notice: null }));
    expect(screen.queryByRole('status', { name: 'Sin sitio libre' })).toBeNull();
  });
});
