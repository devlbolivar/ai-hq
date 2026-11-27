import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createOfficeStore } from '../../src/state/store';
import { DebugToggle } from '../../src/ui/DebugToggle';

afterEach(cleanup);

describe('DebugToggle', () => {
  it('marks the switch as a UI control and calls toggleDebug on each click', async () => {
    const store = createOfficeStore({ viewport: { width: 800, height: 600 } });
    const toggleDebug = vi.fn(store.getState().toggleDebug);
    store.setState({ toggleDebug });
    render(<DebugToggle store={store} />);
    const control = screen.getByRole('switch', { name: 'Modo depuración' });
    expect(control.hasAttribute('data-ui-control')).toBe(true);
    expect(control.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(control);
    expect(toggleDebug).toHaveBeenCalledTimes(1);
    expect(control.getAttribute('aria-checked')).toBe('true');

    await userEvent.click(control);
    expect(toggleDebug).toHaveBeenCalledTimes(2);
    expect(control.getAttribute('aria-checked')).toBe('false');
  });

  it('updates when debug mode changes externally', () => {
    const store = createOfficeStore({ viewport: { width: 800, height: 600 } });
    render(<DebugToggle store={store} />);
    const control = screen.getByRole('switch', { name: 'Modo depuración' });

    act(() => store.getState().toggleDebug());
    expect(control.getAttribute('aria-checked')).toBe('true');
    act(() => store.getState().toggleDebug());
    expect(control.getAttribute('aria-checked')).toBe('false');
  });
});
