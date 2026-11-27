import { marketingLayout } from '../../src/layout/marketing';
import { walkability } from '../../src/scene/walkability';
import { marketingTeam } from '../../src/agents/seed';
import type { AgentRuntime, SimWorld, Simulation, UsePointRef } from '../../src/agents/types';
import type { Coord } from '../../src/types';

export const world: SimWorld = {
  layout: marketingLayout,
  walk: walkability(marketingLayout),
  team: marketingTeam,
};

/** A still, idle agent at `tile`, optionally holding a reservation. */
export function runtime(
  id: string,
  tile: Coord,
  reservation: UsePointRef | null = null,
  overrides: Partial<AgentRuntime> = {},
): AgentRuntime {
  return {
    id,
    status: 'idle',
    tile,
    next: null,
    stepMs: 0,
    route: [],
    facing: 'N',
    target: null,
    reservation,
    forced: false,
    timerMs: null,
    celebrateMs: 0,
    ...overrides,
  };
}

export function simOf(agents: readonly AgentRuntime[]): Simulation {
  return { timeMs: 0, rng: 1, agents };
}
