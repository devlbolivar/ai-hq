import type { Coord } from '../types';
import { planRoute } from './movement';
import { pick, type RngState } from './rng';
import type { Activity, AgentTarget, SimWorld, Simulation } from './types';
import { freeUsePointsFor, resolveUsePoint } from './usePoints';

/** Idle pause before an autonomous decision (FR-016). */
export const IDLE_PAUSE_MS = [3000, 8000] as const;
/** Autonomous activity durations (FR-017). */
export const WORK_MS = [10000, 20000] as const;
export const BREAK_MS = [5000, 10000] as const;
/** Celebration after a natural end of `working` (FR-017). */
export const CELEBRATE_MS = 1000;

export const AUTONOMOUS_ACTIVITIES: readonly Activity[] = ['work', 'break', 'whiteboard', 'wander'];

function key(tile: Coord): string {
  return `${tile.x},${tile.y}`;
}

function candidates(
  sim: Simulation,
  world: SimWorld,
  agentId: string,
  activity: Activity,
): AgentTarget[] {
  if (activity !== 'wander') {
    return freeUsePointsFor(sim, world, agentId, activity).map((usePoint) => {
      const point = resolveUsePoint(world.layout, usePoint);
      return { activity, tile: point.tile, usePoint, facing: point.facing };
    });
  }
  const banned = new Set(world.layout.objects.flatMap((o) => o.usePoints.map((p) => key(p.tile))));
  for (const agent of sim.agents) {
    banned.add(key(agent.tile));
    if (agent.id === agentId) continue;
    if (agent.next) banned.add(key(agent.next));
    if (agent.target) banned.add(key(agent.target.tile));
  }
  const tiles: AgentTarget[] = [];
  world.walk.forEach((row, y) =>
    row.forEach((walkable, x) => {
      if (walkable && !banned.has(`${x},${y}`)) {
        tiles.push({ activity, tile: { x, y }, usePoint: null, facing: null });
      }
    }),
  );
  return tiles;
}

/**
 * Autonomous decision of an idle agent (FR-016, FR-018, research R8): `pick` an activity, fall back
 * (circularly) only when it has no free candidate, then `pick` a candidate. An unreachable drawn
 * candidate gives `target: null` so the caller keeps the agent and draws another pause.
 */
export function chooseAutonomousTarget(
  sim: Simulation,
  world: SimWorld,
  agentId: string,
): { target: AgentTarget | null; rng: RngState } {
  const agent = sim.agents.find((a) => a.id === agentId)!;
  const [chosen, afterActivity] = pick(sim.rng, AUTONOMOUS_ACTIVITIES);
  const start = AUTONOMOUS_ACTIVITIES.indexOf(chosen);
  for (let i = 0; i < AUTONOMOUS_ACTIVITIES.length; i++) {
    const activity = AUTONOMOUS_ACTIVITIES[(start + i) % AUTONOMOUS_ACTIVITIES.length]!;
    const options = candidates(sim, world, agentId, activity);
    if (options.length === 0) continue;
    const [target, rng] = pick(afterActivity, options);
    const route = planRoute(world, agent.tile, target.tile);
    return { target: route === null ? null : target, rng };
  }
  return { target: null, rng: afterActivity };
}
