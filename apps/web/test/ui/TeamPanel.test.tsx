import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { marketingTeam } from '@ai-hq/domain';
import { createOfficeStore } from '../../src/state/store';
import { TeamPanel } from '../../src/ui/TeamPanel';

afterEach(cleanup);

const viewport = { width: 1280, height: 800 };

function cards() {
  return within(screen.getByRole('region', { name: 'Equipo' })).getAllByRole('listitem');
}

describe('TeamPanel (FR-033, US1-4, US1-5)', () => {
  it('shows one card per agent in team order with number, name, role, color and status', () => {
    render(<TeamPanel store={createOfficeStore({ viewport })} />);
    const items = cards();
    expect(items).toHaveLength(6);
    items.forEach((item, i) => {
      const agent = marketingTeam[i]!;
      expect(item.textContent).toContain(`${i + 1}`);
      expect(item.textContent).toContain(agent.name);
      expect(item.textContent).toContain(agent.role);
      expect(item.textContent).toContain('Desocupado');
      expect(item.querySelector(`[data-color="${agent.color}"]`)).not.toBeNull();
    });
  });

  it('shows the new status when an agent changes state', () => {
    const store = createOfficeStore({ viewport });
    render(<TeamPanel store={store} />);
    const { sim } = store.getState();
    act(() =>
      store.setState({
        sim: {
          ...sim,
          agents: sim.agents.map((a, i) => (i === 2 ? { ...a, status: 'break' } : a)),
        },
      }),
    );
    expect(cards()[2]!.textContent).toContain('Descanso');
    expect(cards()[1]!.textContent).toContain('Desocupado');
  });
});

describe('TeamPanel — edit buttons (FR-033)', () => {
  it('opens the editor of the agent from its card', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const store = createOfficeStore({ viewport, paused: true });
    render(<TeamPanel store={store} />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Designer' }));
    expect(store.getState().editor).toEqual({ agentId: 'designer' });
    expect(store.getState().selection.agentId).toBe('designer');
  });
});

describe('TeamPanel — selectable cards (FR-026, FR-027, US2-1)', () => {
  it('each card is a button "N. Nombre — Rol" with aria-pressed', () => {
    render(<TeamPanel store={createOfficeStore({ viewport, paused: true })} />);
    marketingTeam.forEach((agent, i) => {
      const card = screen.getByRole('button', { name: `${i + 1}. ${agent.name} — ${agent.role}` });
      expect(card.getAttribute('aria-pressed')).toBe('false');
    });
  });

  it('clicking a card selects that agent and only its card is pressed', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const store = createOfficeStore({ viewport, paused: true });
    render(<TeamPanel store={store} />);
    await userEvent.click(screen.getByRole('button', { name: '3. Copywriter — Redactor' }));
    expect(store.getState().selection).toEqual({ agentId: 'copywriter', following: true });
    const pressed = screen
      .getAllByRole('button', { pressed: true })
      .map((b) => b.getAttribute('aria-label') ?? b.textContent);
    expect(pressed).toEqual(['3. Copywriter — Redactor']);
    expect(store.getState().editor).toBeNull();
  });

  it('follows selection changes from elsewhere (keyboard, canvas)', () => {
    const store = createOfficeStore({ viewport, paused: true });
    render(<TeamPanel store={store} />);
    act(() => store.getState().selectNumber(5));
    expect(
      screen.getByRole('button', { name: '5. Designer — Diseño' }).getAttribute('aria-pressed'),
    ).toBe('true');
    act(() => store.getState().deselect());
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });

  it('shows the edited name in the card button', () => {
    const store = createOfficeStore({ viewport, paused: true });
    render(<TeamPanel store={store} />);
    act(() => {
      const scout = store.getState().team[1]!;
      store.getState().saveAgent(scout.id, { ...scout, name: 'Radar' });
    });
    expect(screen.getByRole('button', { name: '2. Radar — Investigador' })).toBeTruthy();
  });
});
