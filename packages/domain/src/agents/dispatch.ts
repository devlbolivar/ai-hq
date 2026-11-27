import type { Coord } from '../types';
import { directionBetween, planRoute } from './movement';
import { transition } from './stateMachine';
import type { AgentRuntime, AgentTarget, SimWorld } from './types';
import { activityStatus } from './usePoints';

/** Tile where a new route starts: the next tile when mid-step (Clarifications). */
export function routeOrigin(agent: AgentRuntime): Coord {
  return agent.next ?? agent.tile;
}

function sameTile(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Sends an agent toward `target`: starts the activity in place when already on its tile, otherwise
 * walks there (taking effect at the next tile when mid-step). Moves the reservation to the target's
 * use point and clears timers; returns null when the target is unreachable or the transition is
 * rejected. The caller decides the timer of an activity started in place.
 */
export function sendAgent(
  agent: AgentRuntime,
  world: SimWorld,
  target: AgentTarget,
  forced: boolean,
): AgentRuntime | null {
  const common = { reservation: target.usePoint, forced, timerMs: null, celebrateMs: 0 };

  if (agent.next === null && sameTile(agent.tile, target.tile)) {
    const status = target.activity ? activityStatus(target.activity) : null;
    const result = status
      ? transition(agent.status, { type: 'start-activity', activity: status, onFreeUsePoint: true })
      : agent.status === 'idle'
        ? ({ ok: true, status: 'idle' } as const)
        : transition(agent.status, { type: 'cancel' });
    if (!result.ok) return null;
    return {
      ...agent,
      ...common,
      status: result.status,
      facing: target.facing ?? agent.facing,
      target: status ? target : null,
    };
  }

  const route = planRoute(world, routeOrigin(agent), target.tile);
  const moving = agent.next !== null;
  const reachable = route !== null && (moving || route.length > 0);
  const result = transition(agent.status, { type: 'walk-to', reachable });
  if (!result.ok || route === null) return null;

  if (moving) return { ...agent, ...common, status: result.status, route, target };
  const [next, ...rest] = route;
  return {
    ...agent,
    ...common,
    status: result.status,
    next: next!,
    route: rest,
    stepMs: 0,
    facing: directionBetween(agent.tile, next!),
    target,
  };
}
