import { describe, expect, it } from 'vitest';
import { planRoute } from '../../src/agents/movement';
import { applyOrder, cancelForcedOrders } from '../../src/agents/orders';
import { stepSimulation } from '../../src/agents/simulation';
import type { AgentRuntime, Simulation } from '../../src/agents/types';
import { resolveUsePoint, usePointsFor } from '../../src/agents/usePoints';
import { runtime, simOf, world } from './fixtures';

const desk1 = { objectId: 'desk-1', index: 0 };
const coffee = { objectId: 'coffee-machine', index: 0 };
const board = { objectId: 'whiteboard', index: 0 };

function steps(sim: Simulation, n: number): Simulation {
  let current = sim;
  for (let i = 0; i < n; i++) current = stepSimulation(current, world);
  return current;
}

function head(id = 'head-of-marketing', overrides: Partial<AgentRuntime> = {}): AgentRuntime {
  return runtime(id, { x: 3, y: 6 }, desk1, { facing: 'N', timerMs: 4000, ...overrides });
}

describe('applyOrder — activities (FR-034, FR-017a)', () => {
  it('walks to the nearest free meeting point by route length, ties in layout order', () => {
    const sim = simOf([head()]);
    const { sim: next, result } = applyOrder(sim, world, 'head-of-marketing', {
      type: 'activity',
      activity: 'meeting',
    });
    const refs = usePointsFor(world, 'head-of-marketing', 'meeting');
    const lengths = refs.map(
      (ref) => planRoute(world, { x: 3, y: 6 }, resolveUsePoint(world.layout, ref).tile)!.length,
    );
    const best = refs[lengths.indexOf(Math.min(...lengths))];
    expect(result).toEqual({ ok: true, changed: true });
    expect(next.agents[0]).toMatchObject({
      status: 'walking',
      forced: true,
      reservation: best,
      timerMs: null,
      target: { activity: 'meeting', usePoint: best },
    });
  });

  it('arrives and stays in the forced activity without ending by time', () => {
    const sent = applyOrder(simOf([head()]), world, 'head-of-marketing', {
      type: 'activity',
      activity: 'meeting',
    }).sim;
    const later = steps(sent, 6000).agents[0]!;
    expect(later).toMatchObject({ status: 'meeting', forced: true, timerMs: null, next: null });
  });

  it('sends "work" to the agent desk', () => {
    const away = head('head-of-marketing', { tile: { x: 9, y: 6 }, reservation: null });
    const { sim } = applyOrder(simOf([away]), world, 'head-of-marketing', {
      type: 'activity',
      activity: 'work',
    });
    expect(sim.agents[0]!.target).toMatchObject({ activity: 'work', usePoint: desk1 });
  });

  it('starts the activity in place when the agent is already on the point', () => {
    const atCoffee = runtime('copywriter', { x: 13, y: 7 }, coffee, { timerMs: 3000 });
    const { sim, result } = applyOrder(simOf([atCoffee]), world, 'copywriter', {
      type: 'activity',
      activity: 'break',
    });
    expect(result).toEqual({ ok: true, changed: true });
    expect(sim.agents[0]).toMatchObject({
      status: 'break',
      facing: 'E',
      forced: true,
      timerMs: null,
      next: null,
    });
  });

  it('reports NO_FREE_SPOT and leaves the simulation untouched', () => {
    const sim = simOf([head(), runtime('copywriter', { x: 1, y: 3 }, board)]);
    const out = applyOrder(sim, world, 'head-of-marketing', {
      type: 'activity',
      activity: 'review',
    });
    expect(out.result).toEqual({ ok: false, reason: 'NO_FREE_SPOT' });
    expect(out.sim).toBe(sim);
  });

  it('reports UNREACHABLE and leaves the simulation untouched', () => {
    const walk = world.walk.map((row, y) =>
      row.map((cell, x) => cell && !(Math.abs(x - 3) + Math.abs(y - 6) === 1)),
    );
    const sim = simOf([head()]);
    const out = applyOrder(sim, { ...world, walk }, 'head-of-marketing', {
      type: 'activity',
      activity: 'meeting',
    });
    expect(out.result).toEqual({ ok: false, reason: 'UNREACHABLE' });
    expect(out.sim).toBe(sim);
  });

  it('does nothing when the same forced activity is repeated', () => {
    const order = { type: 'activity', activity: 'meeting' } as const;
    const sent = applyOrder(simOf([head()]), world, 'head-of-marketing', order).sim;
    const again = applyOrder(sent, world, 'head-of-marketing', order);
    expect(again.result).toEqual({ ok: true, changed: false });
    expect(again.sim).toBe(sent);
  });

  it('adopts the same activity when it came from autonomy', () => {
    const walking = runtime('head-of-marketing', { x: 4, y: 7 }, desk1, {
      status: 'walking',
      next: { x: 4, y: 6 },
      stepMs: 120,
      route: [{ x: 3, y: 6 }],
      target: { activity: 'work', tile: { x: 3, y: 6 }, usePoint: desk1, facing: 'N' },
    });
    const { sim, result } = applyOrder(simOf([walking]), world, 'head-of-marketing', {
      type: 'activity',
      activity: 'work',
    });
    expect(result).toEqual({ ok: true, changed: true });
    expect(sim.agents[0]).toEqual({ ...walking, forced: true, timerMs: null, celebrateMs: 0 });
  });

  it('interrupts autonomous work without celebrating', () => {
    const celebrating = head('head-of-marketing', {
      status: 'working',
      celebrateMs: 600,
      timerMs: null,
      target: { activity: 'work', tile: { x: 3, y: 6 }, usePoint: desk1, facing: 'N' },
    });
    const { sim } = applyOrder(simOf([celebrating]), world, 'head-of-marketing', {
      type: 'activity',
      activity: 'meeting',
    });
    expect(sim.agents[0]).toMatchObject({ status: 'walking', celebrateMs: 0, forced: true });
  });

  it('reports UNKNOWN_AGENT', () => {
    const sim = simOf([head()]);
    expect(applyOrder(sim, world, 'nobody', { type: 'idle' })).toEqual({
      sim,
      result: { ok: false, reason: 'UNKNOWN_AGENT' },
    });
  });
});

describe('applyOrder — mid-step and go-to', () => {
  const midStep = runtime('copywriter', { x: 9, y: 6 }, null, {
    status: 'walking',
    next: { x: 10, y: 6 },
    stepMs: 250,
    route: [{ x: 11, y: 6 }],
    facing: 'E',
    target: { activity: 'wander', tile: { x: 11, y: 6 }, usePoint: null, facing: null },
  });

  it('takes effect at the next tile and the last order wins', () => {
    const first = applyOrder(simOf([midStep]), world, 'copywriter', {
      type: 'go-to',
      tile: { x: 9, y: 9 },
    }).sim;
    const second = applyOrder(first, world, 'copywriter', { type: 'go-to', tile: { x: 12, y: 8 } });
    const agent = second.sim.agents[0]!;
    expect(second.result).toEqual({ ok: true, changed: true });
    expect(agent).toMatchObject({ next: { x: 10, y: 6 }, stepMs: 250, forced: true });
    expect(agent.route).toEqual(planRoute(world, { x: 10, y: 6 }, { x: 12, y: 8 }));
    expect(agent.target).toEqual({
      activity: null,
      tile: { x: 12, y: 8 },
      usePoint: null,
      facing: null,
    });
  });

  it('ends a go-to idle and forced', () => {
    const sent = applyOrder(simOf([midStep]), world, 'copywriter', {
      type: 'go-to',
      tile: { x: 10, y: 7 },
    }).sim;
    expect(steps(sent, 300).agents[0]).toMatchObject({
      status: 'idle',
      tile: { x: 10, y: 7 },
      forced: true,
      timerMs: null,
    });
  });

  it.each([
    ['a use point', { x: 13, y: 7 }],
    ['a tile occupied by another agent', { x: 11, y: 8 }],
    ['a tile chosen by another agent', { x: 11, y: 9 }],
    ['a blocked tile', { x: 3, y: 5 }],
    ['a tile outside the grid', { x: 30, y: 30 }],
  ])('rejects %s as a go-to destination', (_label, tile) => {
    const other = runtime('designer', { x: 11, y: 8 }, null, {
      status: 'walking',
      next: { x: 11, y: 9 },
      target: { activity: 'wander', tile: { x: 11, y: 9 }, usePoint: null, facing: null },
    });
    const sim = simOf([midStep, head(), other]);
    const out = applyOrder(sim, world, 'copywriter', { type: 'go-to', tile });
    expect(out.result).toEqual({ ok: false, reason: 'INVALID_DESTINATION' });
    expect(out.sim).toBe(sim);
  });
});

describe('applyOrder — idle and stopping (FR-014, FR-034 as amended)', () => {
  it("stops after the current step but never on someone else's use point", () => {
    const passing = runtime('copywriter', { x: 6, y: 6 }, null, {
      status: 'walking',
      next: { x: 5, y: 6 }, // chair of desk-2
      stepMs: 100,
      route: [
        { x: 4, y: 6 },
        { x: 4, y: 7 },
      ],
      forced: true,
      target: { activity: null, tile: { x: 4, y: 7 }, usePoint: null, facing: null },
    });
    const { sim, result } = applyOrder(simOf([passing]), world, 'copywriter', { type: 'idle' });
    expect(result).toEqual({ ok: true, changed: true });
    expect(sim.agents[0]).toMatchObject({ route: [{ x: 4, y: 6 }], target: null, forced: false });
    const stopped = steps(sim, 200).agents[0]!;
    expect(stopped).toMatchObject({ status: 'idle', tile: { x: 4, y: 6 }, reservation: null });
    expect(stopped.timerMs).not.toBeNull();
  });

  it("never stops on another agent's destination tile or on a still agent (edge cases)", () => {
    const walker = runtime('designer', { x: 12, y: 9 }, null, {
      status: 'walking',
      next: { x: 11, y: 9 },
      stepMs: 100,
      route: [
        { x: 10, y: 9 },
        { x: 9, y: 9 },
        { x: 8, y: 9 },
      ],
      forced: true,
      target: { activity: null, tile: { x: 8, y: 9 }, usePoint: null, facing: null },
    });
    const wanderer = runtime('scriptwriter', { x: 11, y: 6 }, null, {
      status: 'walking',
      next: { x: 11, y: 7 },
      route: [
        { x: 11, y: 8 },
        { x: 11, y: 9 },
      ],
      target: { activity: 'wander', tile: { x: 11, y: 9 }, usePoint: null, facing: null },
    });
    const standing = runtime('copywriter', { x: 10, y: 9 });
    const { sim } = applyOrder(simOf([walker, wanderer, standing]), world, 'designer', {
      type: 'idle',
    });
    expect(sim.agents[0]).toMatchObject({
      route: [
        { x: 10, y: 9 },
        { x: 9, y: 9 },
      ],
      target: null,
      forced: false,
    });
  });

  it('keeps the reservation when it stops on its own point and releases it otherwise', () => {
    const toCoffee = runtime('copywriter', { x: 13, y: 8 }, coffee, {
      status: 'walking',
      next: { x: 13, y: 7 },
      forced: true,
      target: { activity: 'break', tile: { x: 13, y: 7 }, usePoint: coffee, facing: 'E' },
    });
    const kept = applyOrder(simOf([toCoffee]), world, 'copywriter', { type: 'idle' }).sim;
    expect(kept.agents[0]).toMatchObject({ reservation: coffee, route: [] });
    const farFromIt = {
      ...toCoffee,
      tile: { x: 13, y: 9 },
      next: { x: 13, y: 8 },
      route: [{ x: 13, y: 7 }],
    };
    const released = applyOrder(simOf([farFromIt]), world, 'copywriter', { type: 'idle' }).sim;
    expect(released.agents[0]).toMatchObject({ reservation: null, route: [] });
  });

  it('turns an activity into idle in place, keeping the reservation, and restores autonomy', () => {
    const meeting = runtime(
      'copywriter',
      { x: 11, y: 2 },
      { objectId: 'meeting-table', index: 0 },
      {
        status: 'meeting',
        forced: true,
      },
    );
    const { sim } = applyOrder(simOf([meeting]), world, 'copywriter', { type: 'idle' });
    expect(sim.agents[0]).toMatchObject({
      status: 'idle',
      forced: false,
      reservation: { objectId: 'meeting-table', index: 0 },
      target: null,
    });
    expect(sim.agents[0]!.timerMs).toBeGreaterThanOrEqual(3000);
  });

  it('changes nothing for an autonomous idle agent', () => {
    const sim = simOf([head()]);
    const out = applyOrder(sim, world, 'head-of-marketing', { type: 'idle' });
    expect(out).toEqual({ sim, result: { ok: true, changed: false } });
  });
});

describe('cancelForcedOrders', () => {
  it('applies "idle" to every forced agent and leaves the others alone', () => {
    const forcedMeeting = runtime(
      'copywriter',
      { x: 11, y: 2 },
      { objectId: 'meeting-table', index: 0 },
      {
        status: 'meeting',
        forced: true,
      },
    );
    const autonomous = head();
    const sim = cancelForcedOrders(simOf([forcedMeeting, autonomous]), world);
    expect(sim.agents[0]).toMatchObject({ status: 'idle', forced: false });
    expect(sim.agents[1]).toBe(autonomous);
  });
});
