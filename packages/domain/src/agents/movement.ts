import { findPath } from '../path/findPath';
import type { Coord, Direction } from '../types';
import type { AgentRuntime, GridPosition, SimWorld } from './types';

/** One tile step at 2 tiles per second of simulated time (FR-012). */
export const STEP_DURATION_MS = 500;

/** Displayed position, always on the `tile → next` segment (FR-012). */
export function agentPosition(agent: AgentRuntime): GridPosition {
  if (agent.next === null) return { x: agent.tile.x, y: agent.tile.y };
  const t = agent.stepMs / STEP_DURATION_MS;
  return {
    x: agent.tile.x + (agent.next.x - agent.tile.x) * t,
    y: agent.tile.y + (agent.next.y - agent.tile.y) * t,
  };
}

export function directionBetween(from: Coord, to: Coord): Direction {
  if (to.x > from.x) return 'E';
  if (to.x < from.x) return 'W';
  return to.y > from.y ? 'S' : 'N';
}

/** Tiles after `from` on the shortest 4-direction route, or null when there is none (FR-011). */
export function planRoute(world: SimWorld, from: Coord, to: Coord): readonly Coord[] | null {
  const result = findPath(world.walk, from, to);
  return result.ok ? result.path.slice(1) : null;
}

/** Advances `dtMs` along `next`/`route`; turns only at tile boundaries. */
export function advanceMovement(
  agent: AgentRuntime,
  dtMs: number,
): { agent: AgentRuntime; arrived: boolean } {
  if (agent.next === null) return { agent, arrived: false };

  let { tile, next, route, facing } = agent;
  let stepMs = agent.stepMs + dtMs;
  let arrived = false;
  while (next !== null && stepMs >= STEP_DURATION_MS) {
    stepMs -= STEP_DURATION_MS;
    tile = next;
    next = route[0] ?? null;
    route = route.slice(1);
    if (next === null) {
      arrived = true;
      stepMs = 0;
    } else {
      facing = directionBetween(tile, next);
    }
  }
  return { agent: { ...agent, tile, next, route, facing, stepMs }, arrived };
}
