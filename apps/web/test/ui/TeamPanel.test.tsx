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
        sim: { ...sim, agents: sim.agents.map((a, i) => (i === 2 ? { ...a, status: 'break' } : a)) },
      }),
    );
    expect(cards()[2]!.textContent).toContain('Descanso');
    expect(cards()[1]!.textContent).toContain('Desocupado');
  });
});
