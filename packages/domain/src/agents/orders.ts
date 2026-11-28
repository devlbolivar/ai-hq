import type { Coord } from '../types';
import { IDLE_PAUSE_MS } from './autonomy';
import { routeOrigin, sendAgent } from './dispatch';
import { planRoute } from './movement';
import { randomInt } from './rng';
import { transition, isActivityStatus } from './stateMachine';
import type { AgentRuntime, AgentTarget, Order, OrderResult, SimWorld, Simulation } from './types';
import { freeUsePointsFor, resolveUsePoint } from './usePoints';

type Outcome = { sim: Simulation; result: OrderResult };

function key(tile: Coord): string {
  return `${tile.x},${tile.y}`;
}

function usePointTiles(world: SimWorld): Set<string> {
  return new Set(world.layout.objects.flatMap((o) => o.usePoints.map((p) => key(p.tile))));
}

function replaceAgent(sim: Simulation, index: number, agent: AgentRuntime): Simulation {
  return { ...sim, agents: sim.agents.map((a, i) => (i === index ? agent : a)) };
}

/** Nearest free point of the activity by route length from where the order applies (FR-034). */
function nearestTarget(
  sim: Simulation,
  world: SimWorld,
  agent: AgentRuntime,
  activity: 'work' | 'meeting' | 'break' | 'review',
): AgentTarget | 'NO_FREE_SPOT' | 'UNREACHABLE' {
  const free = freeUsePointsFor(sim, world, agent.id, activity);
  if (free.length === 0) return 'NO_FREE_SPOT';
  let best: { target: AgentTarget; length: number } | null = null;
  for (const usePoint of free) {
    const point = resolveUsePoint(world.layout, usePoint);
    const route = planRoute(world, routeOrigin(agent), point.tile);
    if (route === null || (best && route.length >= best.length)) continue;
    best = {
      target: { activity, tile: point.tile, usePoint, facing: point.facing },
      length: route.length,
    };
  }
  return best ? best.target : 'UNREACHABLE';
}

function validGoTo(sim: Simulation, world: SimWorld, agentId: string, tile: Coord): boolean {
  if (world.walk[tile.y]?.[tile.x] !== true || usePointTiles(world).has(key(tile))) return false;
  return !sim.agents.some(
    (a) =>
      a.id !== agentId &&
      [a.tile, a.next, a.target?.tile].some((t) => t && t.x === tile.x && t.y === tile.y),
  );
}

/**
 * Stops an agent (order `idle`, FR-034 as amended): a walker finishes its step and halts on the first
 * route tile that is not someone else's use point, another agent's destination or a still agent
 * (agents never end on the same tile; spec edge cases), keeping its reservation only when it stops
 * on it; an activity becomes `idle` in place. Autonomy resumes with a fresh idle pause.
 */
function stop(sim: Simulation, world: SimWorld, index: number): Simulation {
  const agent = sim.agents[index]!;
  if (agent.next !== null) {
    const own = agent.reservation
      ? key(resolveUsePoint(world.layout, agent.reservation).tile)
      : null;
    const taken = new Set(usePointTiles(world));
    for (const other of sim.agents) {
      if (other.id === agent.id) continue;
      if (other.target) taken.add(key(other.target.tile));
      if (other.next === null) taken.add(key(other.tile));
    }
    const tiles = [agent.next, ...agent.route];
    const free = tiles.findIndex((t) => !taken.has(key(t)) || key(t) === own);
    // Its own destination is never taken by another agent, so this fallback is defensive.
    const at = free === -1 ? tiles.length - 1 : free;
    const stopTile = tiles[at]!;
    return replaceAgent(sim, index, {
      ...agent,
      route: tiles.slice(1, at + 1),
      target: null,
      reservation: key(stopTile) === own ? agent.reservation : null,
      forced: false,
      timerMs: null,
      celebrateMs: 0,
    });
  }
  const result = isActivityStatus(agent.status)
    ? transition(agent.status, { type: 'cancel' })
    : ({ ok: true, status: agent.status } as const);
  if (!result.ok) return sim;
  const [pause, rng] = randomInt(sim.rng, IDLE_PAUSE_MS[0], IDLE_PAUSE_MS[1]);
  return replaceAgent({ ...sim, rng }, index, {
    ...agent,
    status: result.status,
    target: null,
    forced: false,
    timerMs: pause,
    celebrateMs: 0,
  });
}

/** Applies an external order (FR-017a, FR-034); the result says whether it was accepted. */
export function applyOrder(
  sim: Simulation,
  world: SimWorld,
  agentId: string,
  order: Order,
): Outcome {
  const index = sim.agents.findIndex((a) => a.id === agentId);
  if (index === -1) return { sim, result: { ok: false, reason: 'UNKNOWN_AGENT' } };
  const agent = sim.agents[index]!;

  if (order.type === 'idle') {
    const autonomousIdle = agent.status === 'idle' && agent.next === null && !agent.forced;
    if (autonomousIdle) return { sim, result: { ok: true, changed: false } };
    return { sim: stop(sim, world, index), result: { ok: true, changed: true } };
  }

  let target: AgentTarget;
  if (order.type === 'go-to') {
    if (!validGoTo(sim, world, agentId, order.tile)) {
      return { sim, result: { ok: false, reason: 'INVALID_DESTINATION' } };
    }
    target = { activity: null, tile: order.tile, usePoint: null, facing: null };
  } else {
    if (agent.target?.activity === order.activity) {
      if (agent.forced) return { sim, result: { ok: true, changed: false } };
      const adopted = { ...agent, forced: true, timerMs: null, celebrateMs: 0 };
      return { sim: replaceAgent(sim, index, adopted), result: { ok: true, changed: true } };
    }
    const nearest = nearestTarget(sim, world, agent, order.activity);
    if (typeof nearest === 'string') return { sim, result: { ok: false, reason: nearest } };
    target = nearest;
  }

  const sent = sendAgent(agent, world, target, true);
  if (sent === null) return { sim, result: { ok: false, reason: 'UNREACHABLE' } };
  return { sim: replaceAgent(sim, index, sent), result: { ok: true, changed: true } };
}

/** Turning debug mode off: every forced agent gets `idle` and autonomy resumes (FR-034). */
export function cancelForcedOrders(sim: Simulation, world: SimWorld): Simulation {
  return sim.agents.reduce(
    (current, agent, index) => (agent.forced ? stop(current, world, index) : current),
    sim,
  );
}
