import type { OfficeLayout, UsePoint } from '../types';
import type { ActivityStatus } from './stateMachine';
import type { Activity, SimWorld, Simulation, UsePointRef } from './types';

export function usePointKey(ref: UsePointRef): string {
  return `${ref.objectId}#${ref.index}`;
}

export function resolveUsePoint(layout: OfficeLayout, ref: UsePointRef): UsePoint {
  return layout.objects.find((o) => o.id === ref.objectId)!.usePoints[ref.index]!;
}

/** Object kinds whose use points serve each shared activity, in priority order. */
const KINDS: Readonly<Record<Exclude<Activity, 'work' | 'wander'>, readonly string[]>> = {
  meeting: ['meeting-table'],
  break: ['coffee-machine', 'sofa'],
  review: ['whiteboard'],
  whiteboard: ['whiteboard'],
};

function refsOf(layout: OfficeLayout, objectId: string): UsePointRef[] {
  const obj = layout.objects.find((o) => o.id === objectId);
  return obj ? obj.usePoints.map((_, index) => ({ objectId, index })) : [];
}

/** Use points of an activity for an agent (FR-009); a desk point only serves its owner. */
export function usePointsFor(
  world: SimWorld,
  agentId: string,
  activity: Activity,
): readonly UsePointRef[] {
  if (activity === 'wander') return [];
  if (activity === 'work') {
    const desk = world.team.find((p) => p.id === agentId)?.deskId;
    return desk ? refsOf(world.layout, desk) : [];
  }
  return KINDS[activity].flatMap((kind) =>
    world.layout.objects.filter((o) => o.kind === kind).flatMap((o) => refsOf(world.layout, o.id)),
  );
}

/** True when another agent reserves a point on the same tile (FR-014). */
export function isReservedByOther(
  sim: Simulation,
  world: SimWorld,
  ref: UsePointRef,
  agentId: string,
): boolean {
  const { tile } = resolveUsePoint(world.layout, ref);
  return sim.agents.some((agent) => {
    if (agent.id === agentId || agent.reservation === null) return false;
    const other = resolveUsePoint(world.layout, agent.reservation).tile;
    return other.x === tile.x && other.y === tile.y;
  });
}

export function freeUsePointsFor(
  sim: Simulation,
  world: SimWorld,
  agentId: string,
  activity: Activity,
): readonly UsePointRef[] {
  return usePointsFor(world, agentId, activity).filter(
    (ref) => !isReservedByOther(sim, world, ref, agentId),
  );
}

const STATUS: Readonly<Record<Activity, ActivityStatus | null>> = {
  work: 'working',
  meeting: 'meeting',
  break: 'break',
  review: 'waiting_review',
  whiteboard: null,
  wander: null,
};

/** Status reached on arrival; `null` = ends `idle` (whiteboard look, wander). */
export function activityStatus(activity: Activity): ActivityStatus | null {
  return STATUS[activity];
}
