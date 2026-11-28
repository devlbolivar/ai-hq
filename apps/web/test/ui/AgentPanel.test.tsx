import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { createOfficeStore } from '../../src/state/store';
import { AgentPanel } from '../../src/ui/AgentPanel';

afterEach(cleanup);

const viewport = { width: 1280, height: 800 };

describe('AgentPanel (FR-033, spec Assumptions: selected agent panel)', () => {
  it('is hidden without a selection', () => {
    render(<AgentPanel store={createOfficeStore({ viewport, paused: true })} />);
    expect(screen.queryByRole('region', { name: 'Agente seleccionado' })).toBeNull();
  });

  it('shows the name, role and Spanish status of the selected agent', () => {
    const store = createOfficeStore({ viewport, paused: true });
    render(<AgentPanel store={store} />);
    act(() => store.getState().select('copywriter'));
    const panel = screen.getByRole('region', { name: 'Agente seleccionado' });
    expect(panel.textContent).toContain('Copywriter');
    expect(panel.textContent).toContain('Redactor');
    expect(panel.textContent).toContain('Desocupado');
    const { sim } = store.getState();
    act(() =>
      store.setState({
        sim: {
          ...sim,
          agents: sim.agents.map((a) => (a.id === 'copywriter' ? { ...a, status: 'working' } : a)),
        },
      }),
    );
    expect(panel.textContent).toContain('Trabajando');
  });
});

describe('AgentPanel — edit button', () => {
  it('opens the editor of the selected agent', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const store = createOfficeStore({ viewport, paused: true });
    render(<AgentPanel store={store} />);
    act(() => store.getState().select('copywriter'));
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(store.getState().editor).toEqual({ agentId: 'copywriter' });
  });
});

describe('AgentPanel — debug orders (FR-034, US5-5)', () => {
  it('offers no orders while debug mode is off', () => {
    const store = createOfficeStore({ viewport, paused: true });
    render(<AgentPanel store={store} />);
    act(() => store.getState().select('copywriter'));
    expect(screen.queryByRole('group', { name: 'Órdenes de depuración' })).toBeNull();
  });

  it.each([
    ['Trabajar', { type: 'activity', activity: 'work' }],
    ['Reunión', { type: 'activity', activity: 'meeting' }],
    ['Descanso', { type: 'activity', activity: 'break' }],
    ['Entregar a revisión', { type: 'activity', activity: 'review' }],
    ['Volver a idle', { type: 'idle' }],
  ] as const)('"%s" sends the matching order', async (label, order) => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const store = createOfficeStore({ viewport, paused: true });
    const sent: unknown[] = [];
    store.setState({ sendOrder: (agentId, o) => (sent.push([agentId, o]), null) });
    render(<AgentPanel store={store} />);
    act(() => {
      store.getState().select('copywriter');
      store.getState().toggleDebug();
    });
    const group = screen.getByRole('group', { name: 'Órdenes de depuración' });
    await userEvent.click(within(group).getByRole('button', { name: label }));
    expect(sent).toEqual([['copywriter', order]]);
  });
});
