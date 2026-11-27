import { describe, expect, it } from 'vitest';
import { marketingLayout } from '../../src/layout/marketing';
import { marketingTeam } from '../../src/agents/seed';
import {
  ACCEPTANCE_SEED,
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

describe('autonomy inside the simulation (FR-016, FR-017, FR-019, SC-005, SC-006)', () => {
  const usePointTiles = new Set(
    marketingLayout.objects.flatMap((o) => o.usePoints.map((p) => `${p.tile.x},${p.tile.y}`)),
  );

  /** Runs `ms` of simulated time and returns every intermediate state. */
  function run(seed: number, ms: number): Simulation[] {
    const states = [createSimulation(world, seed)];
    for (let t = 0; t < ms; t += SIM_STEP_MS) states.push(stepSimulation(states.at(-1)!, world));
    return states;
  }

  it('decides after the idle pause: the agent leaves idle or starts an activity', () => {
    const sim = createSimulation(world, 5);
    const pause = sim.agents[0]!.timerMs!;
    const before = steps(sim, pause / SIM_STEP_MS - 1).agents[0]!;
    expect(before).toMatchObject({ status: 'idle', target: null });
    const after = steps(sim, pause / SIM_STEP_MS).agents[0]!;
    const decided = after.target !== null || after.status !== 'idle' || after.timerMs !== null;
    expect(decided).toBe(true);
  });

  it('with ACCEPTANCE_SEED every agent completes an autonomous cycle within 60 s', () => {
    const states = run(ACCEPTANCE_SEED, 60_000);
    for (let i = 0; i < marketingTeam.length; i++) {
      const completed = states.some(
        (s, t) =>
          t > 0 && s.agents[i]!.status === 'idle' && states[t - 1]!.agents[i]!.status !== 'idle',
      );
      expect(completed, marketingTeam[i]!.id).toBe(true);
    }
  });

  it('never shares a use point nor steps on a non-walkable tile in 5 minutes', () => {
    let sim = createSimulation(world, ACCEPTANCE_SEED);
    for (let t = 0; t < 300_000; t += SIM_STEP_MS) {
      sim = stepSimulation(sim, world);
      const reserved = sim.agents
        .filter((a) => a.reservation)
        .map((a) => {
          const obj = marketingLayout.objects.find((o) => o.id === a.reservation!.objectId)!;
          const tile = obj.usePoints[a.reservation!.index]!.tile;
          return `${tile.x},${tile.y}`;
        });
      expect(new Set(reserved).size).toBe(reserved.length);
      for (const agent of sim.agents) {
        expect(world.walk[agent.tile.y]![agent.tile.x]).toBe(true);
        if (agent.next) expect(world.walk[agent.next.y]![agent.next.x]).toBe(true);
        if (agent.next === null && usePointTiles.has(`${agent.tile.x},${agent.tile.y}`)) {
          expect(agent.reservation).not.toBeNull();
        }
      }
    }
  }, 30_000);

  it('keeps durations within bounds when the activity starts', () => {
    const states = run(ACCEPTANCE_SEED, 120_000);
    for (let t = 1; t < states.length; t++) {
      states[t]!.agents.forEach((agent, i) => {
        const prev = states[t - 1]!.agents[i]!;
        if (agent.status === prev.status || agent.timerMs === null) return;
        if (agent.status === 'working') expect(agent.timerMs).toBeGreaterThanOrEqual(10_000);
        if (agent.status === 'working') expect(agent.timerMs).toBeLessThanOrEqual(20_000);
        if (agent.status === 'break') expect(agent.timerMs).toBeGreaterThanOrEqual(5_000);
        if (agent.status === 'break') expect(agent.timerMs).toBeLessThanOrEqual(10_000);
      });
    }
  });

  it('is identical at common instants for different frame sizes over 5 minutes', () => {
    const byTime = new Map<number, string>();
    let a = { sim: createSimulation(world, 99), accumulatorMs: 0 };
    while (a.sim.timeMs < 300_000) {
      a = advanceFrame(a.sim, world, a.accumulatorMs, 16);
      byTime.set(a.sim.timeMs, JSON.stringify(a.sim));
    }
    let b = { sim: createSimulation(world, 99), accumulatorMs: 0 };
    let compared = 0;
    while (b.sim.timeMs < 300_000) {
      b = advanceFrame(b.sim, world, b.accumulatorMs, 33);
      const other = byTime.get(b.sim.timeMs);
      if (other === undefined) continue;
      expect(JSON.stringify(b.sim)).toBe(other);
      compared++;
    }
    expect(compared).toBeGreaterThan(1000);
  }, 30_000);
});
