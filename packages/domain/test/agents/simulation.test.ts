import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { marketingTeam } from '../../src/agents/seed';
import {
  advanceFrame,
  agentById,
  createSimulation,
  createSimWorld,
  MAX_FRAME_MS,
  SIM_STEP_MS,
  stepSimulation,
} from '../../src/agents/simulation';
import type { AgentRuntime, Simulation } from '../../src/agents/types';
import { runtime, simOf, world } from './fixtures';

const coffee = { objectId: 'coffee-machine', index: 0 };

function steps(sim: Simulation, n: number): Simulation {
  let current = sim;
  for (let i = 0; i < n; i++) current = stepSimulation(current, world);
  return current;
}

function only(agent: AgentRuntime): Simulation {
  return simOf([agent]);
}

describe('createSimWorld', () => {
  it('builds the world of a valid layout and team', () => {
    const created = createSimWorld(marketingLayout, marketingTeam);
    expect(created.layout).toBe(marketingLayout);
    expect(created.team).toBe(marketingTeam);
    expect(created.walk).toEqual(world.walk);
  });

  it('throws with every message when the layout is invalid', () => {
    const broken = { ...marketingLayout, entrance: { x: 3, y: 5 } };
    expect(() => createSimWorld(broken, marketingTeam)).toThrow(/entrada/i);
  });

  it('throws with every message when the team is invalid', () => {
    const team = marketingTeam.map((p, i) => (i === 1 ? { ...p, color: 'coral' as const } : p));
    expect(() => createSimWorld(marketingLayout, team)).toThrow(/trend-scout.*color/s);
  });

  it('rejects two use points on the same tile', () => {
    const layout = {
      ...marketingLayout,
      objects: marketingLayout.objects.map((o) =>
        o.id === 'sofa' ? { ...o, usePoints: [o.usePoints[0]!, o.usePoints[0]!] } : o,
      ),
    };
    expect(() => createSimWorld(layout, marketingTeam)).toThrow(/sofa#0.*sofa#1/s);
  });
});

describe('createSimulation (FR-007)', () => {
  const sim = createSimulation(world, 42);

  it('puts every agent idle on its desk point, facing it, with its reservation', () => {
    expect(sim.timeMs).toBe(0);
    expect(sim.agents.map((a) => a.id)).toEqual(marketingTeam.map((p) => p.id));
    marketingTeam.forEach((profile, i) => {
      const desk = marketingLayout.objects.find((o) => o.id === profile.deskId)!;
      const agent = sim.agents[i]!;
      expect(agent).toMatchObject({
        status: 'idle',
        tile: desk.usePoints[0]!.tile,
        next: null,
        facing: desk.usePoints[0]!.facing,
        reservation: { objectId: profile.deskId, index: 0 },
        forced: false,
        celebrateMs: 0,
      });
      expect(agent.timerMs).toBeGreaterThanOrEqual(3000);
      expect(agent.timerMs).toBeLessThanOrEqual(8000);
    });
  });

  it('is reproducible for a seed and differs between seeds', () => {
    expect(createSimulation(world, 42)).toEqual(sim);
    expect(createSimulation(world, 43)).not.toEqual(sim);
  });
});

describe('stepSimulation', () => {
  it('advances SIM_STEP_MS of simulated time', () => {
    expect(SIM_STEP_MS).toBe(10);
    expect(stepSimulation(createSimulation(world, 1), world).timeMs).toBe(10);
  });

  it('arrives at an autonomous break: status break, facing the point, duration drawn on arrival', () => {
    const walker = runtime('copywriter', { x: 13, y: 8 }, coffee, {
      status: 'walking',
      next: { x: 13, y: 7 },
      facing: 'N',
      target: { activity: 'break', tile: { x: 13, y: 7 }, usePoint: coffee, facing: 'E' },
    });
    const arrived = steps(only(walker), 50).agents[0]!;
    expect(arrived).toMatchObject({ status: 'break', tile: { x: 13, y: 7 }, facing: 'E' });
    expect(arrived.timerMs).toBeGreaterThanOrEqual(5000);
    expect(arrived.timerMs).toBeLessThanOrEqual(10000);
    // A timer created in a step starts counting on the next one.
    expect(steps(only(arrived), 1).agents[0]!.timerMs).toBe(arrived.timerMs! - SIM_STEP_MS);
  });

  it('ends an autonomous break by time without celebrating and draws an idle pause', () => {
    const resting = runtime('copywriter', { x: 13, y: 7 }, coffee, {
      status: 'break',
      timerMs: 20,
    });
    const after = steps(only(resting), 2).agents[0]!;
    expect(after).toMatchObject({ status: 'idle', celebrateMs: 0, reservation: coffee });
    expect(after.timerMs).toBeGreaterThanOrEqual(3000);
    expect(after.timerMs).toBeLessThanOrEqual(8000);
  });

  it('celebrates 1 s, still working, when autonomous work ends, then becomes idle (FR-017)', () => {
    const desk = { objectId: 'desk-3', index: 0 };
    const working = runtime('copywriter', { x: 7, y: 6 }, desk, {
      status: 'working',
      timerMs: 10,
    });
    const celebrating = steps(only(working), 1).agents[0]!;
    expect(celebrating).toMatchObject({ status: 'working', celebrateMs: 1000, timerMs: null });
    expect(steps(only(celebrating), 99).agents[0]!.status).toBe('working');
    const done = steps(only(celebrating), 100).agents[0]!;
    expect(done).toMatchObject({ status: 'idle', celebrateMs: 0, reservation: desk });
    expect(done.timerMs).toBeGreaterThanOrEqual(3000);
  });

  it('never ends a forced activity by time', () => {
    const forced = runtime('copywriter', { x: 13, y: 7 }, coffee, {
      status: 'break',
      forced: true,
      timerMs: null,
    });
    expect(steps(only(forced), 2000).agents[0]).toEqual(forced);
  });
});

describe('advanceFrame (FR-015, SC-006)', () => {
  const start = createSimulation(world, 7);

  it('clips each frame to MAX_FRAME_MS', () => {
    expect(MAX_FRAME_MS).toBe(250);
    expect(advanceFrame(start, world, 0, 500).sim.timeMs).toBe(250);
    let state = advanceFrame(start, world, 0, 250);
    state = advanceFrame(state.sim, world, state.accumulatorMs, 250);
    expect(state.sim.timeMs).toBe(500);
  });

  it('runs whole fixed steps and keeps the remainder', () => {
    const first = advanceFrame(start, world, 0, 15);
    expect(first).toMatchObject({ accumulatorMs: 5 });
    expect(first.sim.timeMs).toBe(10);
    const second = advanceFrame(first.sim, world, first.accumulatorMs, 5);
    expect(second.sim.timeMs).toBe(20);
    expect(second.accumulatorMs).toBe(0);
  });

  it('gives the same simulation for frame sequences with the same clipped sum', () => {
    const run = (frames: readonly number[]) =>
      frames.reduce((state, dt) => advanceFrame(state.sim, world, state.accumulatorMs, dt), {
        sim: start,
        accumulatorMs: 0,
      });
    expect(run([16, 17, 17, 50, 100])).toEqual(run([200]));
  });
});

describe('agentById', () => {
  it('finds an agent or returns undefined', () => {
    const sim = createSimulation(world, 3);
    expect(agentById(sim, 'designer')?.reservation).toEqual({ objectId: 'desk-5', index: 0 });
    expect(agentById(sim, 'nobody')).toBeUndefined();
  });
});
