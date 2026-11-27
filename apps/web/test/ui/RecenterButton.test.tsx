import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createOfficeStore } from '../../src/state/store';
import { RecenterButton } from '../../src/ui/RecenterButton';

afterEach(cleanup);

describe('RecenterButton (FR-015)', () => {
  it('is a button named "Recentrar" marked as a UI control', () => {
    render(<RecenterButton store={createOfficeStore({ viewport: { width: 800, height: 600 } })} />);
    const button = screen.getByRole('button', { name: 'Recentrar' });
    expect(button.hasAttribute('data-ui-control')).toBe(true);
  });

  it('calls the store recenter action on click', async () => {
    const store = createOfficeStore({ viewport: { width: 800, height: 600 } });
    const recenter = vi.fn();
    store.setState({ recenter });
    render(<RecenterButton store={store} />);
    await userEvent.click(screen.getByRole('button', { name: 'Recentrar' }));
    expect(recenter).toHaveBeenCalledTimes(1);
  });
});
